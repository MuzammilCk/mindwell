import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Constants ───
const SILENCE_THRESHOLD = 12;       // Volume level below which we consider "silence"
const SILENCE_DURATION_MS = 1800;   // 1.8s of silence before auto-submit
const AUTO_RESUME_DELAY_MS = 800;   // 0.8s delay after AI speaks before re-recording
const VOLUME_CHECK_INTERVAL = 100;  // Check volume every 100ms

// ─── Animated Orb Component ───
const VoiceOrb = ({ state = 'idle', volume = 0 }) => {
  // Scale orb slightly based on voice volume
  const volumeScale = state === 'recording' ? 1 + (volume / 255) * 0.15 : 0;

  return (
    <div className="orb-container">
      {/* Orbital ring */}
      <div className={`orb-ring ${state === 'recording' ? 'active' : ''}`} />

      {/* Ripple rings (visible during recording) */}
      <AnimatePresence>
        {state === 'recording' && (
          <>
            <motion.div
              className="orb-ripple"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.div
              className="orb-ripple"
              initial={{ scale: 1, opacity: 0.4 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
            />
            <motion.div
              className="orb-ripple"
              initial={{ scale: 1, opacity: 0.3 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 1.2 }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Core orb — reacts to voice volume during recording */}
      <motion.div
        className={`orb-core ${state}`}
        animate={{
          scale: state === 'recording'
            ? 1 + volumeScale
            : state === 'processing'
              ? [1, 1.05, 1]
              : [1, 1.06, 1],
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

// ─── Mic Icon SVG ───
const MicIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

// ─── Stop Icon SVG ───
const StopIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fb7185" stroke="none">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

// ─── Waveform Indicator ───
const WaveformIndicator = () => (
  <div className="waveform-bars">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="waveform-bar" />
    ))}
  </div>
);

// ─── Chat Message Bubble ───
const ChatBubble = ({ message, index }) => {
  const isUser = message.sender === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        delay: index * 0.05,
      }}
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
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [latestTelemetry, setLatestTelemetry] = useState(null);
  const [detectedLanguage, setDetectedLanguage] = useState(null);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chatEndRef = useRef(null);
  const audioRef = useRef(null);
  const messagesRef = useRef(messages); // Keep ref in sync for closures

  // VAD refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const volumeIntervalRef = useRef(null);
  const hasSpeechRef = useRef(false);
  const autoResumeTimerRef = useRef(null);

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Auto-resume recording after AI finishes speaking
  useEffect(() => {
    if (!isSpeaking && isConversationActive && !isProcessing && !isRecording && messages.length > 0) {
      // AI just finished speaking — auto-start recording after a brief pause
      autoResumeTimerRef.current = setTimeout(() => {
        startRecording();
      }, AUTO_RESUME_DELAY_MS);

      return () => {
        if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
      };
    }
  }, [isSpeaking, isConversationActive, isProcessing, isRecording, messages.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
    };
  }, []);

  // Determine orb state
  const orbState = isSpeaking ? 'speaking' : isProcessing ? 'processing' : isRecording ? 'recording' : 'idle';

  // ─── Cleanup Audio Resources ───
  const cleanupAudio = useCallback(() => {
    if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (e) {}
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
  }, []);

  // ─── Start Recording with VAD ───
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      audioChunksRef.current = [];
      hasSpeechRef.current = false;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        // Only submit if we detected actual speech
        if (hasSpeechRef.current && audioChunksRef.current.length > 0) {
          handleAudioSubmit();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Signal session start on first recording
      if (messagesRef.current.length === 0 && onSessionStart) {
        onSessionStart();
      }

      // ─── Setup Voice Activity Detection ───
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let silenceStart = null;

      // Monitor volume at regular intervals
      volumeIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const avgVolume = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        setCurrentVolume(avgVolume);

        if (avgVolume > SILENCE_THRESHOLD) {
          // Voice detected
          hasSpeechRef.current = true;
          silenceStart = null;
        } else if (hasSpeechRef.current) {
          // Silence detected (but only after we've heard speech)
          if (!silenceStart) {
            silenceStart = Date.now();
          } else if (Date.now() - silenceStart >= SILENCE_DURATION_MS) {
            // Silence long enough — auto-stop
            console.log('[VAD] Silence detected, auto-stopping...');
            stopRecordingInternal();
          }
        }
      }, VOLUME_CHECK_INTERVAL);

    } catch (err) {
      setError('Microphone access denied. Please allow mic permissions.');
      console.error('Mic error:', err);
    }
  }, [onSessionStart]);

  // ─── Stop Recording (internal — used by VAD) ───
  const stopRecordingInternal = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      // Clean up VAD monitoring
      if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setCurrentVolume(0);

      // Disconnect audio analysis but keep stream alive until next cycle
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch (e) {}
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch (e) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  }, []);

  // ─── Toggle Conversation (user-facing button) ───
  const toggleConversation = useCallback(() => {
    if (isConversationActive) {
      // End conversation
      setIsConversationActive(false);
      stopRecordingInternal();
      if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
    } else {
      // Start conversation
      setIsConversationActive(true);
      startRecording();
    }
  }, [isConversationActive, startRecording, stopRecordingInternal]);

  // ─── Submit Audio to Backend ───
  const handleAudioSubmit = async () => {
    setIsProcessing(true);
    if (setParentProcessing) setParentProcessing(true);

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

    const formData = new FormData();
    formData.append('audio', audioBlob, 'user_input.webm');
    formData.append('language_code', 'unknown'); // Auto-detect language
    formData.append('voice_id', 'ritu');
    formData.append('chat_history', JSON.stringify(messagesRef.current));

    try {
      const response = await fetch('http://localhost:8000/api/v1/voice-turn', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        // Update chat history
        const updatedMessages = [
          ...messagesRef.current,
          { sender: 'user', text: data.user_transcript },
          { sender: 'ai', text: data.spoken_response },
        ];
        setMessages(updatedMessages);
        setLatestTelemetry(data.telemetry);

        // Update detected language
        if (data.detected_language) {
          setDetectedLanguage(data.detected_language);
        }

        // Play audio response
        if (data.audio_base64) {
          setIsSpeaking(true);
          const audio = new Audio(`data:audio/wav;base64,${data.audio_base64}`);
          audioRef.current = audio;
          audio.onended = () => setIsSpeaking(false);
          audio.onerror = () => setIsSpeaking(false);
          audio.play().catch(() => setIsSpeaking(false));
        }
      } else {
        setError(data.detail || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Failed to process voice turn:', err);
      setError('Connection failed. Is the backend running?');
    } finally {
      setIsProcessing(false);
      if (setParentProcessing) setParentProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto h-full">

      {/* ─── Telemetry Badges + Language ─── */}
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
        {messages.length === 0 && !isRecording && !isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <p className="text-sm text-white/20 tracking-wide">
              {isConversationActive
                ? 'Listening for your voice...'
                : 'Tap the microphone to start a conversation'}
            </p>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ─── Voice Orb ─── */}
      <motion.div
        className="my-6"
        animate={{ y: isRecording ? -4 : 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <VoiceOrb state={orbState} volume={currentVolume} />
      </motion.div>

      {/* ─── Status Label ─── */}
      <motion.div
        className="h-6 mb-4 flex items-center justify-center"
        initial={false}
        animate={{ opacity: 1 }}
      >
        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.div
              key="recording"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3"
            >
              <WaveformIndicator />
              <span className="text-xs tracking-[0.2em] text-rose-400 uppercase font-medium">
                Listening...
              </span>
            </motion.div>
          ) : isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="text-xs tracking-[0.2em] text-mindwell-violet uppercase font-medium animate-pulse"
            >
              Analyzing...
            </motion.div>
          ) : isSpeaking ? (
            <motion.div
              key="speaking"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="text-xs tracking-[0.2em] text-mindwell-teal uppercase font-medium"
            >
              MindWell is speaking...
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="text-xs tracking-[0.15em] text-white/30 uppercase"
            >
              {isConversationActive
                ? 'Will resume listening shortly...'
                : messages.length > 0
                  ? 'Conversation paused'
                  : 'Tap to start conversation'}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Mic Button ─── */}
      <motion.button
        className={`mic-btn ${isRecording ? 'recording' : ''}`}
        onClick={toggleConversation}
        disabled={isProcessing || isSpeaking}
        whileHover={{ scale: isProcessing || isSpeaking ? 1 : 1.08 }}
        whileTap={{ scale: isProcessing || isSpeaking ? 1 : 0.92 }}
      >
        {isConversationActive ? <StopIcon /> : <MicIcon />}
      </motion.button>

      {/* Button label */}
      <motion.span
        className="mt-3 text-[10px] tracking-widest text-white/15 uppercase"
        initial={false}
        animate={{ opacity: 1 }}
      >
        {isConversationActive ? 'Tap to end' : 'Tap to start'}
      </motion.span>

      {/* ─── Error Message ─── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center max-w-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
