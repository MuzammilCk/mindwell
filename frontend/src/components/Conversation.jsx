import { useConversation } from '@elevenlabs/react';
import { motion } from 'framer-motion';
import { useState, useCallback, useEffect } from 'react';

export function Conversation({ setRiskData, setShowHelplines, setHelplinesData, setIsProcessing, onSessionStart, onSessionEnd }) {
    const [agentId] = useState(import.meta.env.VITE_ELEVENLABS_AGENT_ID || '');
    const [statusText, setStatusText] = useState('Idle');

    // --- CLIENT TOOL HANDLER (This makes it "Conversational") ---
    const submitScreeningReport = useCallback(async (params) => {
        console.log("[Tool] submit_screening_report CALLED with:", params);
        const { summary } = params || {}; // Handle potential missing params

        setStatusText('Analyzing Risk...');
        if (setIsProcessing) setIsProcessing(true); // START LOADING
        try {
            // Dynamic Backend URL for easier deployment
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080/submit_screening_report";
            console.log("[Tool] Fetching:", BACKEND_URL);

            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ summary }) // Agent only sends summary now
            });
            console.log("[Tool] Response Status:", response.status);
            const data = await response.json();
            console.log("[Tool] Response Data:", data);

            // Show the AI's "Thought" on the screen (Data from Gemini Backend)
            if (setRiskData) {
                console.log("[Tool] Setting Risk Data...");
                setRiskData({
                    score: data.result?.score || 0,
                    summary: summary,
                    validation: data.result?.validation || "Analysis pending."
                });
            }
            setStatusText('Saved');
            if (setIsProcessing) setIsProcessing(false); // STOP LOADING

            // 2. [CRITICAL FIX] Return the GEMINI result to the ElevenLabs Agent
            // Voice-Ready Response: Concise and natural for the agent to speak.
            // Using 'validation' field which is now separate from internal 'reasoning'
            const voiceResponse = data.result?.validation || "I've processed the screening, but I'm having trouble retrieving the specific feedback right now.";
            return voiceResponse;
        } catch (error) {
            console.error("[Tool] ERROR:", error);
            if (setIsProcessing) setIsProcessing(false); // STOP LOADING
            return "I'm having technical trouble connecting to the backend. Please try again.";
        }
    }, [setRiskData, setIsProcessing]);

    const getHelplines = useCallback(async () => {
        try {
            // Dynamic Backend URL
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
            const response = await fetch(`${BACKEND_URL}/get_helplines`);
            const data = await response.json();

            if (setShowHelplines && data.helplines) {
                if (setHelplinesData) {
                    setHelplinesData(data.helplines);
                }
                setShowHelplines(true);
            }
            return "I have listed some important mental health helplines on your screen. You can contact them for immediate support.";
        } catch (e) {
            console.error("Failed to fetch helplines", e);
            if (setShowHelplines) setShowHelplines(true); // Fallback to hardcoded if fetch fails
            return "I've put up the helpline numbers for you.";
        }
    }, [setShowHelplines, setHelplinesData]);

    // --- AGENT CONFIG ---
    const conversation = useConversation({
        onConnect: () => {
            // Visual Cue: Syncing state before Listening
            setStatusText('Syncing...');

            // 500ms Delay to ensure audio channel is truly open and user is ready
            setTimeout(() => {
                setStatusText('Listening');
                if (onSessionStart) onSessionStart();
            }, 500);
        },
        onDisconnect: () => {
            setStatusText('Disconnected');
            if (onSessionEnd) onSessionEnd();
        },
        onModeChange: (mode) => setStatusText(mode.mode === 'speaking' ? 'Agent Speaking' : 'Listening'),
        // CRITICAL: Register the tools here
        clientTools: {
            submit_screening_report: submitScreeningReport,
            get_helplines: getHelplines
        }
    });

    const isConnected = conversation.status === 'connected';
    const isSpeaking = conversation.isSpeaking;

    const [isConnecting, setIsConnecting] = useState(false);

    // --- MICROPHONE WARMUP ---
    useEffect(() => {
        // Pre-warm microphone permission on mount
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                // permission granted, close stream immediately to release resource until needed
                stream.getTracks().forEach(track => track.stop());
            })
            .catch(err => console.log("Mic permission not yet granted (will ask on click)", err));
    }, []);

    const toggleConversation = async () => {
        if (isConnected) {
            await conversation.endSession();
        } else {
            if (isConnecting) return; // Prevent double clicks
            if (!agentId) return alert("Agent ID missing!");

            setIsConnecting(true);
            setStatusText('Connecting...');

            try {
                // Start Session directly (mic is likely already warm)
                await conversation.startSession({ agentId: agentId });
            } catch (err) {
                console.error(err);
                setStatusText('Failed');
                setIsConnecting(false); // Reset on error
            }
            // Note: We don't set setIsConnecting(false) here on success because 
            // onConnect will trigger the next state. 
            // Actually, strictly speaking, we should reset it, but 'isConnected' will take over UI.
            // Let's reset it in finally to be safe.
            finally {
                setIsConnecting(false);
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center">
            {/* THE ORB */}
            <motion.button
                onClick={toggleConversation}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative group cursor-pointer"
            >
                <div className={`
                    w-32 h-32 md:w-40 md:h-40 rounded-full border border-white/10 flex items-center justify-center
                    transition-all duration-1000 relative z-10 backdrop-blur-sm
                    ${isConnected ? 'border-white/20 bg-white/5' : 'group-hover:border-white/30'}
                `}>
                    {isConnected ? (
                        <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                            <motion.div
                                animate={{
                                    scale: statusText === 'Syncing...' ? [1, 1.1, 1] : (isSpeaking ? [1, 1.2, 1] : 1.0),
                                    opacity: statusText === 'Syncing...' ? 0.6 : (isSpeaking ? 0.8 : 0.4)
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: statusText === 'Syncing...' ? 0.8 : 1.5, // Faster pulse for syncing
                                    ease: "easeInOut"
                                }}
                                className={`w-16 h-16 rounded-full blur-[30px] ${statusText === 'Syncing...' ? 'bg-amber-400' : 'bg-gradient-to-tr from-purple-500 to-blue-500'
                                    }`}
                            />
                            <div className="absolute text-[10px] tracking-widest font-sans text-white font-bold mix-blend-overlay text-center px-2">
                                {statusText.toUpperCase()}
                            </div>
                        </div>
                    ) : (
                        <div className="text-gray-500 group-hover:text-white transition-colors duration-500">
                            <span className="text-[10px] tracking-[0.3em] font-sans">
                                {isConnecting ? 'CONNECTING...' : 'START SESSION'}
                            </span>
                        </div>
                    )}
                </div>
            </motion.button>
        </div>
    );
}
