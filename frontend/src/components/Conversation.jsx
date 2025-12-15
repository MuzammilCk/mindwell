import { useConversation } from '@elevenlabs/react';
import { motion } from 'framer-motion';
import { useState, useCallback } from 'react';

export function Conversation({ setRiskData, setShowHelplines }) {
    const [agentId] = useState(import.meta.env.VITE_ELEVENLABS_AGENT_ID || '');
    const [statusText, setStatusText] = useState('Idle');

    // --- CLIENT TOOL HANDLER (This makes it "Conversational") ---
    const submitScreeningReport = useCallback(async ({ risk_score, summary }) => {
        setStatusText('Analyzing Risk...');
        try {
            // REPLACE with your actual deployed Cloud Function URL
            const response = await fetch('http://localhost:8080/submit_screening_report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ risk_score, summary })
            });
            const data = await response.json();

            // Show the AI's "Thought" on the screen
            if (setRiskData) {
                setRiskData({
                    score: risk_score,
                    summary: summary,
                    validation: data.ai_validation
                });
            }
            setStatusText('Saved');
            return "Report saved and validated by Vertex AI.";
        } catch (error) {
            console.error(error);
            return "Failed to save.";
        }
    }, [setRiskData]);

    const getHelplines = useCallback(async () => {
        if (setShowHelplines) setShowHelplines(true);
        return "Displaying helplines now.";
    }, [setShowHelplines]);

    // --- AGENT CONFIG ---
    const conversation = useConversation({
        onConnect: () => setStatusText('Connected'),
        onDisconnect: () => setStatusText('Disconnected'),
        onModeChange: (mode) => setStatusText(mode.mode === 'speaking' ? 'Agent Speaking' : 'Listening'),
        // CRITICAL: Register the tools here
        clientTools: {
            submit_screening_report: submitScreeningReport,
            get_helplines: getHelplines
        }
    });

    const isConnected = conversation.status === 'connected';
    const isSpeaking = conversation.isSpeaking;

    const toggleConversation = async () => {
        if (isConnected) {
            await conversation.endSession();
        } else {
            if (!agentId) return alert("Agent ID missing!");
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                await conversation.startSession({ agentId: agentId });
            } catch (err) { console.error(err); }
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
                            <span className="text-[10px] tracking-[0.3em] font-sans">START SESSION</span>
                        </div>
                    )}
                </div>
            </motion.button>
        </div>
    );
}
