import React, { useState, useRef } from 'react';

export default function Conversation() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [latestTelemetry, setLatestTelemetry] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Start Voice Capture
  const startRecording = async () => {
    audioChunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = handleAudioSubmit;
    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  // Stop Voice Capture
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Send Recorded Audio to Sarvam + Gemini Gateway
  const handleAudioSubmit = async () => {
    setIsProcessing(true);
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

    const formData = new FormData();
    formData.append('audio', audioBlob, 'user_input.webm');
    formData.append('language_code', 'en-IN');
    formData.append('voice_id', 'meera');
    formData.append('chat_history', JSON.stringify(messages));

    try {
      const response = await fetch('http://localhost:8000/api/v1/voice-turn', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        // 1. Update Chat History
        const updatedMessages = [
          ...messages,
          { sender: 'user', text: data.user_transcript },
          { sender: 'ai', text: data.spoken_response }
        ];
        setMessages(updatedMessages);
        setLatestTelemetry(data.telemetry);

        // 2. Play Audio Response from Sarvam Bulbul v3
        const audio = new Audio(`data:audio/wav;base64,${data.audio_base64}`);
        audio.play();
      }
    } catch (err) {
      console.error('Failed to process voice turn:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-between h-screen p-6 bg-slate-900 text-white">
      {/* Header & Risk Telemetry Bar */}
      <header className="w-full max-w-2xl p-4 bg-slate-800 rounded-xl shadow-md border border-slate-700">
        <h1 className="text-xl font-bold text-teal-400">MindWell Screening Session</h1>
        {latestTelemetry && (
          <div className="flex gap-4 mt-2 text-sm text-slate-300">
            <span>PHQ-9 Signal: <strong className="text-amber-400">{latestTelemetry.phq9_risk_indicator}</strong></span>
            <span>GAD-7 Signal: <strong className="text-amber-400">{latestTelemetry.gad7_risk_indicator}</strong></span>
          </div>
        )}
      </header>

      {/* Conversation Log */}
      <div className="w-full max-w-2xl flex-1 overflow-y-auto my-4 space-y-4 pr-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-4 rounded-2xl max-w-[80%] ${
              msg.sender === 'user'
                ? 'ml-auto bg-teal-600 text-white rounded-br-none'
                : 'mr-auto bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
            }`}
          >
            {msg.text}
          </div>
        ))}
        {isProcessing && <p className="text-slate-400 text-sm animate-pulse">MindWell is thinking & generating voice response...</p>}
      </div>

      {/* Voice Controls */}
      <div className="w-full max-w-2xl flex justify-center pb-6">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`px-8 py-4 rounded-full font-semibold text-lg transition-all duration-200 shadow-lg ${
            isRecording
              ? 'bg-rose-500 hover:bg-rose-600 animate-pulse'
              : 'bg-teal-500 hover:bg-teal-600 text-slate-950'
          }`}
        >
          {isRecording ? 'Stop Speaking' : 'Hold / Tap to Speak'}
        </button>
      </div>
    </div>
  );
}
