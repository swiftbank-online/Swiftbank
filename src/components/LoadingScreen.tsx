import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

interface LoadingScreenProps {
  onFinish?: () => void;
  message?: string;
}

export default function LoadingScreen({ onFinish, message = "Securing digital connection to Swift Vault..." }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          if (onFinish) {
            // Give 450ms extra room for nice exit fades
            setTimeout(onFinish, 450);
          }
          return 100;
        }
        // Increment progress incrementally for natural load pacing
        const step = Math.floor(Math.random() * 15) + 5;
        return Math.min(prev + step, 100);
      });
    }, 150);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-radial from-slate-900 to-slate-950 text-white select-none">
      {/* Background visual accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-600/5 blur-3xl pointer-events-none"></div>

      <div className="relative flex flex-col items-center max-w-sm px-6 text-center animate-fade-in-up">
        {/* Animated Lightning Swift Icon */}
        <div className="relative flex items-center justify-center w-20 h-20 mb-8 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 shadow-[0_0_40px_rgba(0,87,255,0.4)] animate-bounce">
          <Zap className="w-10 h-10 text-white fill-white animate-pulse" />
          {/* Subtle outer scanning ring */}
          <div className="absolute -inset-2 rounded-3xl border border-blue-500/30 animate-ping opacity-60"></div>
        </div>

        {/* Brand Headline */}
        <h1 className="text-3xl font-bold tracking-tight mb-2 font-display">
          SWIFT<span className="text-blue-500">BANK</span>
        </h1>
        
        {/* Animated Subtitle */}
        <p className="text-sm text-slate-400 font-medium mb-8 min-h-[20px] transition-all duration-300">
          {message}
        </p>

        {/* Progress Bar Container */}
        <div className="relative w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Byte loading counter */}
        <div className="text-xs font-mono text-slate-500">
          {progress}% COMPLETED • AES_256
        </div>
      </div>
    </div>
  );
}
