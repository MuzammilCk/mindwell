import { useConversation } from '@elevenlabs/react';
import { motion } from 'framer-motion';
import { useState, useCallback } from 'react';

export function Conversation({ setRiskData, setShowHelplines, setIsProcessing, onSessionStart, onSessionEnd }) {
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
            return `I have analyzed the screening. The clinical assessment indicates ${data.result?.validation}. The calculated risk score is ${data.result?.score} out of 10.`;
        } catch (error) {
            console.error("[Tool] ERROR:", error);
            if (setIsProcessing) setIsProcessing(false); // STOP LOADING
            return "Failed to save report. Please check the backend connection.";
        }
    }, [setRiskData, setIsProcessing]);

    const getHelplines = useCallback(async () => {
        if (setShowHelplines) setShowHelplines(true);
        return "Displaying helplines now.";
    }, [setShowHelplines]);

    // --- AGENT CONFIG ---
    const conversation = useConversation({
        onConnect: () => {
            setStatusText('Listening');
            if (onSessionStart) onSessionStart();
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

    const toggleConversation = async () => {
        if (isConnected) {
            await conversation.endSession();
        } else {
            if (isConnecting) return; // Prevent double clicks
            if (!agentId) return alert("Agent ID missing!");

            setIsConnecting(true);
            setStatusText('Connecting...');

            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                await conversation.startSession({ agentId: agentId });
            } catch (err) {
                console.error(err);
                setStatusText('Failed');
            } finally {
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
                                animate={{ scale: isSpeaking ? [1, 1.2, 1] : 1.0, opacity: isSpeaking ? 0.8 : 0.4 }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-full blur-[30px]"
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
