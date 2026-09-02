"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useKioskStore } from "@/store/useKioskStore";

export function Screensaver() {
  const idleSeconds = useKioskStore((s) => s.idleSeconds);
  const resetIdle = useKioskStore((s) => s.resetIdle);

  // Show screensaver if idle for 60 seconds
  const isIdle = idleSeconds >= 60;

  return (
    <AnimatePresence>
      {isIdle && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-white cursor-pointer"
          onClick={resetIdle}
        >
          {/* Subtle background gradient animation */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-black to-slate-900/20 animate-pulse" style={{ animationDuration: '4s' }} />
          
          <div className="relative flex flex-col items-center gap-12 pointer-events-none">
             <h1 className="text-2xl font-bold tracking-[0.5em] text-red-500 uppercase">Enterprise Wayfinding</h1>
             <motion.h2 
               animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
               transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
               className="text-6xl md:text-8xl font-display font-black tracking-widest text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
             >
               TOUCH TO START
             </motion.h2>
             <p className="text-xl text-white/40 tracking-widest font-medium">Find stores, directions, and facilities</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
