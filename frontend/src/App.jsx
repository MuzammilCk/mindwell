import { useState, useEffect } from 'react';
import Conversation from './components/Conversation';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Typewriter Text Component ───
const StreamingText = ({ content }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText('');
    let index = 0;
    if (!content) return;

    const intervalId = setInterval(() => {
      index++;
      if (index <= content.length) {
        setDisplayedText(content.substring(0, index));
      } else {
        clearInterval(intervalId);
      }
    }, 18);

    return () => clearInterval(intervalId);
  }, [content]);

  return <span>{displayedText}</span>;
};

// ─── Staggered Word Reveal ───
const WordReveal = ({ text, className = '' }) => {
  const words = text.split(' ');
  return (
    <span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{
            duration: 0.6,
            delay: i * 0.08,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="inline-block mr-[0.3em]"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
};

// ─── Floating Particles Background ───
const FloatingParticles = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 rounded-full bg-mindwell-violet/20"
        style={{
          left: `${15 + i * 15}%`,
          top: `${20 + (i % 3) * 25}%`,
        }}
        animate={{
          y: [0, -30, 0],
          opacity: [0.2, 0.5, 0.2],
          scale: [1, 1.5, 1],
        }}
        transition={{
          duration: 5 + i * 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: i * 0.8,
        }}
      />
    ))}
  </div>
);


// ═══════════════════════════════════════════
// ═══ MAIN APP ═══
// ═══════════════════════════════════════════

function App() {
  const [riskData, setRiskData] = useState(null);
  const [showHelplines, setShowHelplines] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [helplinesData, setHelplinesData] = useState([
    { name: 'Tele-MANAS', num: '14416', desc: 'Govt. of India (24/7)' },
    { name: 'iCALL', num: '9152987821', desc: 'TISS Support (Mon-Sat)' },
    { name: 'Vandrevala Foundation', num: '1860-2662-345', desc: '24/7 Helpline' },
  ]);

  // Risk level helpers
  const getRiskGradient = (score) => {
    if (score >= 8) return 'from-rose-500 to-red-600';
    if (score >= 5) return 'from-amber-400 to-orange-500';
    return 'from-emerald-400 to-teal-500';
  };

  const getRiskLabel = (score) => {
    if (score >= 8) return 'High Risk';
    if (score >= 5) return 'Moderate';
    return 'Low Risk';
  };

  const getRiskTextColor = (score) => {
    if (score >= 8) return 'text-rose-400';
    if (score >= 5) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const resetSession = () => {
    setRiskData(null);
    setShowHelplines(false);
    setIsSessionActive(false);
  };

  return (
    <div className="min-h-screen w-screen flex flex-col relative overflow-x-hidden">
      {/* ─── Background Layers ─── */}
      <div className="aurora-bg" />
      <div className="noise-overlay" />
      <FloatingParticles />

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 w-full max-w-5xl mx-auto py-8">

        {/* ═══ HERO / LANDING ═══ */}
        <AnimatePresence mode="wait">
          {!isSessionActive && !riskData && (
            <motion.div
              key="hero"
              exit={{ opacity: 0, y: -60, scale: 0.96 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center gap-8 mb-8"
            >
              {/* Logo mark */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-mindwell-violet/20 to-mindwell-teal/10 border border-white/[0.06] flex items-center justify-center mb-2"
              >
                <span className="text-2xl">🧠</span>
              </motion.div>

              {/* Headline */}
              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif leading-[1.05] tracking-tight text-white/90">
                  <WordReveal text="Your voice tells" />
                  <br />
                  <WordReveal text="a deeper story." />
                </h1>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2, duration: 0.8 }}
                  className="text-sm md:text-base text-white/30 font-sans max-w-md mx-auto leading-relaxed tracking-wide"
                >
                  Speak naturally. MindWell listens with empathy, screens for
                  early mental health signals, and connects you to support.
                </motion.p>
              </div>

              {/* Tech badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6, duration: 0.6 }}
                className="flex items-center gap-3 text-[10px] tracking-[0.2em] text-white/15 uppercase font-sans"
              >
                <span>Google Gemini</span>
                <span className="w-1 h-1 rounded-full bg-white/10" />
                <span>Sarvam AI</span>
                <span className="w-1 h-1 rounded-full bg-white/10" />
                <span>Voice First</span>
              </motion.div>

              {/* Begin Session CTA */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8, duration: 0.6, type: 'spring' }}
                whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(139, 92, 246, 0.25)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsSessionActive(true)}
                className="group relative px-8 py-3.5 rounded-full bg-white/[0.04] border border-white/[0.08] hover:border-mindwell-violet/30 transition-colors duration-300 mt-4"
              >
                <span className="text-sm tracking-[0.15em] text-white/70 group-hover:text-white/90 transition-colors font-sans uppercase">
                  Begin Session
                </span>
                {/* Glow effect on hover */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-mindwell-violet/0 via-mindwell-violet/5 to-mindwell-teal/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ SESSION CONTAINER ═══ */}
        <AnimatePresence mode="wait">
          {(isSessionActive || riskData) && (
            <motion.div
              key="session"
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ duration: 0.7, type: 'spring', bounce: 0.15 }}
              className="w-full max-w-2xl glass-card px-6 sm:px-10 py-8 sm:py-10 relative overflow-hidden"
            >
              {/* Top bar inside session */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-mindwell-violet animate-pulse" />
                  <span className="text-[10px] tracking-[0.25em] text-white/30 uppercase font-sans">
                    {riskData ? 'Session Complete' : 'Live Session'}
                  </span>
                </div>
                {!riskData && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setIsSessionActive(false);
                    }}
                    className="text-[10px] tracking-widest text-white/20 hover:text-white/50 transition-colors uppercase font-sans"
                  >
                    End
                  </motion.button>
                )}
              </div>

              {/* ─── RESULTS VIEW ─── */}
              <AnimatePresence mode="wait">
                {riskData ? (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full"
                  >
                    {/* Risk Score Header */}
                    <div className="flex items-end justify-between mb-8 pb-6 border-b border-white/[0.06]">
                      <div>
                        <span className="text-[10px] tracking-[0.3em] text-white/25 uppercase block mb-2">
                          Clinical Assessment
                        </span>
                        <div className="flex items-baseline gap-3">
                          <span className={`text-5xl font-serif ${getRiskTextColor(riskData.score)}`}>
                            {riskData.score}
                          </span>
                          <span className="text-lg text-white/20 font-serif">/10</span>
                        </div>
                        <span className={`text-xs font-medium tracking-wide mt-1 block ${getRiskTextColor(riskData.score)}`}>
                          {getRiskLabel(riskData.score)}
                        </span>
                      </div>

                      {/* Risk Gauge */}
                      <div className="w-32">
                        <div className="risk-gauge-track">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(riskData.score / 10) * 100}%` }}
                            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                            className={`risk-gauge-fill bg-gradient-to-r ${getRiskGradient(riskData.score)}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Validation Text */}
                    <div className="mb-8 min-h-[60px] max-h-[35vh] overflow-y-auto pr-2">
                      <p className="text-lg md:text-xl font-serif text-white/70 leading-relaxed italic">
                        "<StreamingText content={riskData.validation} />"
                      </p>
                    </div>

                    {/* Patient Summary */}
                    {riskData.summary && (
                      <div className="py-5 border-t border-white/[0.04]">
                        <span className="text-[10px] tracking-[0.25em] text-white/20 uppercase block mb-2">
                          Session Summary
                        </span>
                        <p className="text-sm text-white/40 leading-relaxed font-sans">
                          {riskData.summary}
                        </p>
                      </div>
                    )}

                    {/* Helplines */}
                    <AnimatePresence>
                      {showHelplines && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 pt-5 border-t border-white/[0.04]">
                            <span className="col-span-full text-[10px] tracking-[0.25em] text-white/20 uppercase mb-1">
                              Crisis Resources
                            </span>
                            {helplinesData.map((line, i) => (
                              <motion.a
                                key={i}
                                href={`tel:${line.num}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="group p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-mindwell-violet/20 transition-all duration-300"
                              >
                                <span className="text-[10px] text-mindwell-violet/50 tracking-widest block mb-1">
                                  {line.desc}
                                </span>
                                <span className="text-sm text-white/70 group-hover:text-white transition-colors font-medium">
                                  {line.name} →
                                </span>
                              </motion.a>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Reset Button */}
                    <div className="mt-10 flex justify-center pt-6 border-t border-white/[0.04]">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={resetSession}
                        className="group flex items-center gap-2.5 px-6 py-3 rounded-full bg-white/[0.03] border border-white/[0.06] hover:border-mindwell-violet/20 transition-all duration-300"
                      >
                        <svg className="w-3.5 h-3.5 text-white/25 group-hover:text-mindwell-violet/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="text-[11px] tracking-[0.15em] text-white/30 group-hover:text-white/60 uppercase transition-colors font-sans">
                          New Session
                        </span>
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  /* ─── CONVERSATION VIEW ─── */
                  <motion.div key="conversation" className="w-full">
                    <Conversation
                      setRiskData={setRiskData}
                      setShowHelplines={setShowHelplines}
                      setHelplinesData={setHelplinesData}
                      setIsProcessing={setIsProcessing}
                      onSessionStart={() => setIsSessionActive(true)}
                      onSessionEnd={() => setIsSessionActive(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ─── Footer (Landing only) ─── */}
      <AnimatePresence>
        {!isSessionActive && !riskData && (
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 2 }}
            className="relative z-10 flex justify-between items-center px-8 md:px-12 pb-8 pt-4 text-[10px] tracking-[0.12em] font-sans text-white/15 w-full"
          >
            <div>
              <span className="text-white/25 tracking-[0.2em] block mb-0.5">MINDWELL</span>
              <span>©2025 ALL RIGHTS RESERVED</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="cursor-pointer hover:text-white/40 transition-colors">PRIVACY</span>
              <span className="cursor-pointer hover:text-white/40 transition-colors">SUPPORT</span>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
