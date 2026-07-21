import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Constants ───
const WS_URL = 'ws://localhost:8000/ws/conversation';
const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 4096;
const AUTO_RESUME_DELAY_MS = 600; // Delay after AI speaks before resuming mic stream

// ─── Animated Orb Component ───
const VoiceOrb = ({ state = 'idle', volume = 0 }) => {
  const volumeScale = state === 'recording' ? (volume / 128) * 0.12 : 0;

  return (
    <div className="orb-container">
      <div className={`orb-ring ${state === 'recording' ? 'active' : ''}`} />

      <AnimatePresence>
        {state === 'recording' && (
          <>
            <motion.div className="orb-ripple"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.div className="orb-ripple"
              initial={{ scale: 1, opacity: 0.4 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
            />
          </>
        )}
      </AnimatePresence>

      <motion.div
        className={`orb-core ${state}`}
        animate={{
          scale: state === 'recording'
            ? 1 + volumeScale
            : state === 'processing' ? [1, 1.05, 1] : [1, 1.06, 1],
        }}
        transition={{
          duration: state === 'recording' ? 0.15 : state === 'processing' ? 1 : 4,
          repeat: state === 'recording' ? 0 : Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
};

// ─── Icons ───
const MicIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

const StopIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fb7185" stroke="none">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const WaveformIndicator = () => (
  <div className="waveform-bars">
    {[...Array(5)].map((_, i) => <div key={i} className="waveform-bar" />)}
  </div>
);

// ─── Chat Bubble ───
const ChatBubble = ({ message, index }) => {
  const isUser = message.sender === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: index * 0.05 }}
      className={`chat-bubble ${isUser ? 'user' : 'ai'}`}
    >
      <span className={`block text-[10px] tracking-widest uppercase mb-1.5 ${
        isUser ? 'text-mindwell-violet/60' : 'text-mindwell-teal/50'
      }`}>
        {isUser ? 'YOU' : 'MINDWELL'}
      </span>
      {message.text}
    </motion.div>
  );
};

// ─── Telemetry Badge ───
const TelemetryBadge = ({ label, value }) => {
  const getColor = (val) => {
    const v = (val || '').toLowerCase();
    if (v === 'high' || v === 'severe') return 'text-rose-400 border-rose-400/20 bg-rose-400/5';
    if (v === 'moderate') return 'text-amber-400 border-amber-400/20 bg-amber-400/5';
    return 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${getColor(value)}`}
    >
      <span className="text-white/40">{label}</span>
      <span className="font-semibold">{value || '—'}</span>
    </motion.div>
  );
};

// ─── Language Badge ───
const LanguageBadge = ({ language }) => {
  if (!language) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-mindwell-violet/15 bg-mindwell-violet/5 text-xs"
    >
      <span className="text-white/30">🌐</span>
      <span className="text-mindwell-violet/70 font-medium">{language.name}</span>
    </motion.div>
  );
};


// ═══════════════════════════════════════════
// ═══ MAIN CONVERSATION COMPONENT ═══
// ═══════════════════════════════════════════

export default function Conversation({
  setRiskData,
  setShowHelplines,
  setHelplinesData,
  setIsProcessing: setParentProcessing,
  onSessionStart,
  onSessionEnd,
}) {
  // ─── State ───
  const [isStreaming, setIsStreaming] = useState(false);   // Audio streaming active
  const [isSpeechActive, setIsSpeechActive] = useState(false); // VAD: speech detected
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);    // AI audio playing
  const [messages, setMessages] = useState([]);
  const [latestTelemetry, setLatestTelemetry] = useState(null);
  const [detectedLanguage, setDetectedLanguage] = useState(null);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [error, setError] = useState(null);
  const [statusText, setStatusText] = useState('Tap to start conversation');

  // ─── Refs ───
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const volumeIntervalRef = useRef(null);
  const chatEndRef = useRef(null);
  const audioRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const isStreamingRef = useRef(false);

  // Auto-scroll
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopConversation();
    };
  }, []);

  // Determine orb state
  const orbState = isSpeaking
    ? 'speaking'
    : isProcessing
      ? 'processing'
      : isSpeechActive
        ? 'recording'
        : isStreaming
          ? 'idle'
          : 'idle';

  // ─── Float32 PCM → Int16 PCM → Base64 ───
  const float32ToBase64PCM = useCallback((float32Array) => {
    const int16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }, []);

  // ─── Downsample audio to target sample rate ───
  const downsample = useCallback((buffer, fromRate, toRate) => {
    if (fromRate === toRate) return buffer;
    const ratio = fromRate / toRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const idx = Math.round(i * ratio);
      result[i] = buffer[idx] || 0;
    }
    return result;
  }, []);

  // ─── Start Streaming Conversation ───
  const startConversation = useCallback(async () => {
    try {
      setError(null);
      setStatusText('Connecting...');

      // 1. Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: SAMPLE_RATE,
        }
      });
      streamRef.current = stream;

      // 2. Open WebSocket to backend
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
        setStatusText('Listening... speak naturally');
        setIsStreaming(true);
        isStreamingRef.current = true;
        if (onSessionStart) onSessionStart();

        // 3. Start capturing audio and streaming
        startAudioCapture(stream, ws);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
      };

      ws.onerror = (err) => {
        console.error('[WS] Error:', err);
        setError('WebSocket connection failed. Is the backend running?');
        stopConversation();
      };

      ws.onclose = (event) => {
        console.log('[WS] Closed:', event.code, event.reason);
        if (isStreamingRef.current) {
          setIsStreaming(false);
          isStreamingRef.current = false;
          setStatusText('Connection closed');
        }
      };

    } catch (err) {
      console.error('Start error:', err);
      setError('Microphone access denied. Please allow mic permissions.');
    }
  }, [onSessionStart]);

  // ─── Start Audio Capture with ScriptProcessorNode ───
  const startAudioCapture = useCallback((stream, ws) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    sourceRef.current = source;

    // Analyser for volume visualization
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;
    source.connect(analyser);

    // Volume monitoring
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    volumeIntervalRef.current = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
      setCurrentVolume(avg);
    }, 100);

    // ScriptProcessorNode to capture raw PCM and send to WebSocket
    const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      if (isSpeakingRef.current) return; // Don't send audio while AI is speaking

      const inputData = e.inputBuffer.getChannelData(0);
      const downsampled = downsample(inputData, audioContext.sampleRate, SAMPLE_RATE);
      const base64Audio = float32ToBase64PCM(downsampled);

      ws.send(JSON.stringify({
        type: 'audio',
        audio: base64Audio,
      }));
    };

    source.connect(processor);
    processor.connect(audioContext.destination); // Required for processor to work
  }, [downsample, float32ToBase64PCM]);

  // ─── Handle Messages from Backend WebSocket ───
  const handleServerMessage = useCallback((data) => {
    switch (data.type) {
      case 'speech_start':
        console.log('[VAD] Speech started');
        setIsSpeechActive(true);
        setStatusText('Listening...');
        break;

      case 'speech_end':
        console.log('[VAD] Speech ended');
        setIsSpeechActive(false);
        break;

      case 'processing':
        console.log('[Processing] Transcript:', data.transcript);
        setIsProcessing(true);
        if (setParentProcessing) setParentProcessing(true);
        setStatusText('Analyzing...');
        // Add user message immediately
        setMessages(prev => [...prev, { sender: 'user', text: data.transcript }]);
        break;

      case 'response':
        console.log('[Response] AI:', data.spoken_response?.substring(0, 60));
        setIsProcessing(false);
        if (setParentProcessing) setParentProcessing(false);

        // Add AI message
        setMessages(prev => [...prev, { sender: 'ai', text: data.spoken_response }]);

        // Update telemetry
        if (data.telemetry) setLatestTelemetry(data.telemetry);
        if (data.detected_language) setDetectedLanguage(data.detected_language);

        // Play audio
        if (data.audio_base64) {
          playAudioResponse(data.audio_base64);
        }
        break;

      case 'ready':
        console.log('[Ready] Listening for next utterance');
        // Audio streaming is continuous — no need to restart anything
        // Sarvam's VAD will detect next speech automatically
        break;

      case 'error':
        console.error('[Error]', data.detail);
        setIsProcessing(false);
        if (setParentProcessing) setParentProcessing(false);
        setError(data.detail);
        setStatusText('Listening...');
        break;

      default:
        console.log('[WS] Unknown message type:', data.type);
    }
  }, [setParentProcessing]);

  // ─── Play Audio Response ───
  const playAudioResponse = useCallback((audioBase64) => {
    setIsSpeaking(true);
    isSpeakingRef.current = true;
    setStatusText('MindWell is speaking...');

    const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
    audioRef.current = audio;

    audio.onended = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      setStatusText('Listening... speak naturally');
    };

    audio.onerror = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      setStatusText('Listening... speak naturally');
    };

    audio.play().catch(() => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      setStatusText('Listening... speak naturally');
    });
  }, []);

  // ─── Stop Conversation ───
  const stopConversation = useCallback(() => {
    // Stop volume monitoring
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }

    // Stop audio processing
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch (e) {}
      processorRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (e) {}
      sourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }

    // Stop microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Stop any playing audio
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch (e) {}
      audioRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'end' }));
        }
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    setIsStreaming(false);
    isStreamingRef.current = false;
    setIsSpeechActive(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    setCurrentVolume(0);
    setStatusText('Tap to start conversation');
  }, []);

  // ─── Toggle ───
  const toggleConversation = useCallback(() => {
    if (isStreaming) {
      stopConversation();
    } else {
      startConversation();
    }
  }, [isStreaming, startConversation, stopConversation]);

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto h-full">

      {/* ─── Telemetry + Language Badges ─── */}
      <AnimatePresence>
        {(latestTelemetry || detectedLanguage) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-wrap gap-2 justify-center mb-6"
          >
            {detectedLanguage && <LanguageBadge language={detectedLanguage} />}
            {latestTelemetry && (
              <>
                <TelemetryBadge label="PHQ-9" value={latestTelemetry.phq9_risk_indicator} />
                <TelemetryBadge label="GAD-7" value={latestTelemetry.gad7_risk_indicator} />
              </>
            )}
            {latestTelemetry?.requires_crisis_intervention && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-semibold"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                CRISIS ALERT
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Chat Messages ─── */}
      <div className="w-full flex-1 overflow-y-auto mb-6 space-y-3 px-2 min-h-0" style={{ maxHeight: '40vh' }}>
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            <ChatBubble key={index} message={msg} index={index} />
          ))}
        </AnimatePresence>

        {/* Processing indicator */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 text-sm text-mindwell-muted"
          >
            <div className="spinner" />
            <span className="animate-pulse">MindWell is thinking...</span>
          </motion.div>
        )}

        {/* Empty state */}
        {messages.length === 0 && !isStreaming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <p className="text-sm text-white/20 tracking-wide">
              Tap the microphone to start a conversation
            </p>
            <p className="text-[11px] text-white/10 mt-2">
              Speak naturally — I'll listen and respond automatically
            </p>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ─── Voice Orb ─── */}
      <motion.div
        className="my-6"
        animate={{ y: isSpeechActive ? -4 : 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <VoiceOrb state={orbState} volume={currentVolume} />
      </motion.div>

      {/* ─── Status Label ─── */}
      <motion.div className="h-6 mb-4 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {isSpeechActive ? (
            <motion.div key="recording"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3"
            >
              <WaveformIndicator />
              <span className="text-xs tracking-[0.2em] text-rose-400 uppercase font-medium">Listening...</span>
            </motion.div>
          ) : isProcessing ? (
            <motion.div key="processing"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="text-xs tracking-[0.2em] text-mindwell-violet uppercase font-medium animate-pulse"
            >
              Analyzing...
            </motion.div>
          ) : isSpeaking ? (
            <motion.div key="speaking"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="text-xs tracking-[0.2em] text-mindwell-teal uppercase font-medium"
            >
              MindWell is speaking...
            </motion.div>
          ) : (
            <motion.div key="idle"
              initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              className="text-xs tracking-[0.15em] text-white/30 uppercase"
            >
              {statusText}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Mic Button ─── */}
      <motion.button
        className={`mic-btn ${isStreaming ? 'recording' : ''}`}
        onClick={toggleConversation}
        disabled={isProcessing || isSpeaking}
        whileHover={{ scale: isProcessing || isSpeaking ? 1 : 1.08 }}
        whileTap={{ scale: isProcessing || isSpeaking ? 1 : 0.92 }}
      >
        {isStreaming ? <StopIcon /> : <MicIcon />}
      </motion.button>

      <motion.span className="mt-3 text-[10px] tracking-widest text-white/15 uppercase">
        {isStreaming ? 'Tap to end conversation' : 'Tap to start'}
      </motion.span>

      {/* ─── Error ─── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mt-4 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center max-w-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
