import { Conversation } from './components/Conversation';

function App() {
  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col relative overflow-hidden font-serif selection:bg-white selection:text-black">
      {/* Noise Overlay */}
      <div className="bg-noise"></div>

      {/* Radial Gradient Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-white/5 rounded-full blur-[150px] pointer-events-none opacity-20"></div>

      {/* Navbar */}
      <nav className="relative z-10 flex justify-between items-center p-8 md:p-12 text-[10px] tracking-[0.2em] font-sans text-gray-400">
        <div className="cursor-pointer hover:text-white transition-colors">MENU →</div>
        <div className="cursor-pointer hover:text-white transition-colors">[ SCREENING MODE ]</div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">

        {/* Hero Text */}
        <div className="text-center mb-16 md:mb-24 scale-90 md:scale-100">
          <h1 className="text-5xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight text-white/90">
            Intelligent <span className="font-serif italic font-light text-white/70">Conversation</span><br />
            <span className="italic font-light">Driven</span> <span className="font-serif font-normal">by Voice.</span>
          </h1>

          <div className="mt-8 flex flex-col items-center gap-2">
            <span className="text-[10px] tracking-[0.3em] font-sans text-gray-500 uppercase border-b border-gray-800 pb-1">
              ELEVENLABS AGENTS × GOOGLE CLOUD
            </span>
            <p className="text-xs text-gray-400 font-sans max-w-lg mt-4 leading-relaxed tracking-wide">
              Combine the power of ElevenLabs and Vertex AI to give your app a <span className="text-white">natural, human voice</span>.
              Interact entirely through speech—conversational, intelligent, and empathetic.
            </p>
          </div>
        </div>

        {/* Conversation Module (The Orb) */}
        <div className="w-full max-w-md">
          <Conversation />
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 flex justify-between items-end p-8 md:p-12 text-[10px] tracking-[0.1em] font-sans text-gray-600">
        <div>
          <h3 className="text-white tracking-[0.2em] mb-1">MINDWELL</h3>
          <p>©2025 ALL RIGHTS RESERVED.</p>
        </div>
        <div className="cursor-pointer hover:text-white transition-colors">SUPPORT</div>
      </footer>
    </div>
  );
}

export default App;
