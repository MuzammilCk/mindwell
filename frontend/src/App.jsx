import { useState, useEffect } from 'react';
import { Conversation } from './components/Conversation';
import { motion, AnimatePresence } from 'framer-motion';

// --- TYPEWRITER EFFECT COMPONENT ---
// Refined implementation using useEffect for stability
const StreamingText = ({ content }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    // Reset if content changes significantly or is new
    setDisplayedText("");
    let index = 0;

    if (!content) return;

    const intervalId = setInterval(() => {
      index++;
      if (index <= content.length) {
        setDisplayedText(content.substring(0, index));
      } else {
        clearInterval(intervalId);
      }
    }, 20); // Slightly faster for better UX

    return () => clearInterval(intervalId);
  }, [content]);

  return <span>{displayedText}</span>;
};


function App() {
  const [riskData, setRiskData] = useState(null);
  const [showHelplines, setShowHelplines] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [helplinesData, setHelplinesData] = useState([
    { name: "Tele-MANAS", num: "14416", desc: "Govt. of India (24/7)" },
    { name: "iCALL", num: "9152987821", desc: "TISS Support (Mon-Sat)" }
  ]);

  // 1. Refined Risk Color Logic
  const getRiskColor = (score) => {
    if (score >= 8) return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse';
    if (score >= 5) return 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)]';
    return 'bg-green-400 shadow-[0_0_15px_rgba(74,222,128,0.4)]';
  };

  const getRiskTextColor = (score) => {
    if (score >= 8) return 'text-red-400';
    if (score >= 5) return 'text-yellow-400';
    return 'text-green-400';
  }

  const resetSession = () => {
    setRiskData(null);
    setShowHelplines(false);
    setIsSessionActive(false);
  };

  return (
    <div className="min-h-screen w-screen bg-[#080808] text-white flex flex-col relative overflow-y-auto overflow-x-hidden font-serif selection:bg-white selection:text-black">
      {/* Background Ambience */}
      <div className="bg-noise fixed inset-0 opacity-5 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-white/5 rounded-full blur-[150px] pointer-events-none opacity-20"></div>

      <main className="flex-1 flex flex-col items-center justify-center gap-6 py-4 relative z-10 px-6 w-full max-w-7xl mx-auto">

        {/* 1. HERO TEXT (Fades out when session starts) */}
        <AnimatePresence mode="popLayout">
          {!isSessionActive && !riskData && (
            <motion.div
              exit={{ opacity: 0, y: -50, scale: 0.95 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-center flex flex-col items-center gap-6 mb-8 mt-12"
            >
              <h1 className="text-5xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight text-white/90">
                Intelligent <span className="font-serif italic font-light text-white/70">Conversation</span><br />
                <span className="italic font-light">Driven</span> <span className="font-serif font-normal">by Voice.</span>
              </h1>
              <div className="flex flex-col items-center gap-4">
                <span className="text-[10px] tracking-[0.3em] font-sans text-gray-500 uppercase border-b border-gray-800 pb-2">
                  ELEVENLABS AGENTS × GOOGLE GEMINI
                </span>
                <p className="text-xs text-gray-400 font-sans max-w-lg leading-relaxed tracking-wide">
                  Interact entirely through speech—conversational, intelligent, and empathetic.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. THE SESSION CONTAINER */}
        <motion.div
          layout
          initial={false}
          animate={{
            width: isSessionActive || riskData ? "100%" : "auto",
            maxWidth: isSessionActive || riskData ? "42rem" : "auto", // max-w-2xl
            paddingTop: isSessionActive || riskData ? "2rem" : "0rem", // Reduced top padding
            paddingBottom: isSessionActive || riskData ? "4rem" : "0rem", // Increased bottom padding
            paddingLeft: isSessionActive || riskData ? "3rem" : "0rem",
            paddingRight: isSessionActive || riskData ? "3rem" : "0rem",
            background: isSessionActive || riskData ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0)",
            backdropFilter: isSessionActive || riskData ? "blur(20px)" : "blur(0px)",
            border: isSessionActive || riskData ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(255, 255, 255, 0)",
            borderRadius: "24px",
            boxShadow: isSessionActive || riskData ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)" : "none"
          }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.2 }}
          className="relative flex flex-col items-center justify-center overflow-hidden"
        >
          {/* ANALYZING SPINNER */}
          <AnimatePresence mode="popLayout">
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
              >
                <div className="w-12 h-12 border-t-2 border-purple-500 rounded-full animate-spin"></div>
                <h2 className="text-xl font-light tracking-widest text-purple-200 animate-pulse">ANALYZING...</h2>
              </motion.div>
            )}
          </AnimatePresence>

          {/* DYNAMIC CONTENT INSIDE BOX */}
          <AnimatePresence mode="wait">
            {/* A. RESULTS VIEW */}
            {riskData ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="w-full text-left"
              >
                {/* HEADLINE MARKER */}
                <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-xs text-gray-500 tracking-[0.3em] mb-2">CLINICAL ANALYSIS</h3>
                    <div className={`text-4xl font-serif italic ${getRiskTextColor(riskData.score)}`}>
                      Risk Level {riskData.score}/10
                    </div>
                  </div>

                  {/* VISUAL PROGRESS BAR */}
                  <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden flex">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(riskData.score / 10) * 100}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className={`h-full ${getRiskColor(riskData.score)}`}
                    />
                  </div>
                </div>

                {/* VALIDATION TEXT (Typewriter) */}
                <div className="mb-8 min-h-[80px] max-h-[40vh] overflow-y-auto pr-4 custom-scrollbar">
                  <p className="text-xl md:text-2xl font-light leading-relaxed text-gray-200 font-serif">
                    "<StreamingText content={riskData.validation} />"
                  </p>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <span className="block text-[10px] text-gray-600 tracking-widest mb-1">PATIENT SUMMARY</span>
                  <p className="text-sm text-gray-400 font-sans leading-relaxed">{riskData.summary}</p>
                </div>

                {/* HELPLINES GRID */}
                {showHelplines && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/5"
                  >
                    {helplinesData.map((line, i) => (
                      <div key={i} className="group bg-white/5 border border-white/10 p-4 rounded-lg hover:border-purple-500/50 transition-colors">
                        <div className="text-[10px] text-purple-300 tracking-widest mb-1">{line.description || line.desc}</div>
                        <a href={`tel:${line.number || line.num}`} className="text-lg font-serif text-white hover:text-purple-300 transition-colors">
                          {line.name} ↗
                        </a>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* RESET BUTTON */}
                <div className="mt-12 flex justify-center border-t border-white/5 pt-8">
                  <button
                    onClick={resetSession}
                    className="group flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-full transition-all duration-300"
                  >
                    <span className="text-[10px] tracking-[0.2em] text-gray-400 group-hover:text-white uppercase transition-colors">
                      Start New Session
                    </span>
                    <svg className="w-3 h-3 text-gray-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>

              </motion.div>
            ) : (
              /* B. ORB VIEW (Persistent) */
              <motion.div key="orb" className="relative z-10 py-4 px-12">
                <Conversation
                  setRiskData={setRiskData}
                  setShowHelplines={setShowHelplines}
                  setHelplinesData={setHelplinesData}
                  setIsProcessing={setIsProcessing}
                  onSessionStart={() => setIsSessionActive(true)}
                  onSessionEnd={() => setIsSessionActive(false)}
                />
                {/* Listening Hint */}
                {isSessionActive && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 0.5 }}
                    className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] tracking-widest text-gray-500 whitespace-nowrap"
                  >
                    LISTENING...
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      </main >

      {!isSessionActive && !riskData && (
        <footer className="absolute bottom-0 left-0 z-10 flex justify-between items-center px-8 md:px-12 pb-8 pt-4 text-[10px] tracking-[0.1em] font-sans text-gray-600 w-full">
          <div>
            <h3 className="text-white tracking-[0.2em] mb-1">MINDWELL</h3>
            <p>©2025 ALL RIGHTS RESERVED.</p>
          </div>
          <div className="cursor-pointer hover:text-white transition-colors">SUPPORT</div>
        </footer>
      )
      }
    </div >
  );
}

export default App;
