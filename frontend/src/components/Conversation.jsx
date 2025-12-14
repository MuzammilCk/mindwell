import { useConversation } from '@elevenlabs/react';
import { motion } from 'framer-motion';
import { useState } from 'react';

export function Conversation() {
    // 1. Load ID from .env automatically
    const [agentId] = useState(import.meta.env.VITE_ELEVENLABS_AGENT_ID || '');

    const [statusText, setStatusText] = useState('Idle');

    const conversation = useConversation({
        onConnect: () => setStatusText('Connected'),
        onDisconnect: () => setStatusText('Disconnected'),
        onError: (error) => {
            console.error('Error:', error);
            setStatusText(`Error: ${error.message || 'Unknown'}`);
        },
        onModeChange: (mode) => setStatusText(mode.mode === 'speaking' ? 'Agent Speaking' : 'Listening'),
    });

    const isConnected = conversation.status === 'connected';
    const isSpeaking = conversation.isSpeaking;

    const toggleConversation = async () => {
        if (isConnected) {
            await conversation.endSession();
        } else {
            if (!agentId || agentId === 'your_agent_id_here') {
                alert("Agent ID missing! Please open 'mindwell-agent/frontend/.env' and paste your valid Agent ID.");
                return;
            }
            try {
                // Request mic permission explicitly first
                await navigator.mediaDevices.getUserMedia({ audio: true });
                await conversation.startSession({ agentId: agentId });
            } catch (err) {
                console.error("Failed:", err);
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
                            {/* Pulse Animation */}
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

                {/* Outer Ring Animation */}
                {isConnected && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1.6, borderColor: ["rgba(255,255,255,0.1)", "rgba(255,255,255,0)"] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 rounded-full border border-white/10 pointer-events-none"
                    />
                )}
            </motion.button>
        </div>
    );
}
