import React, { useEffect, useState } from 'react';
import { Brain, Sparkles } from 'lucide-react';

interface LumiSpeechBubbleProps {
  text: string;
  isThinking: boolean;
  isVisible: boolean;
  isProactive?: boolean;
}

export const LumiSpeechBubble: React.FC<LumiSpeechBubbleProps> = ({ 
  text, 
  isThinking, 
  isVisible,
  isProactive = false
}) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (isThinking) {
      setDisplayedText('');
      return;
    }
    if (text) {
      setDisplayedText(text);
    } else {
      setDisplayedText('');
    }
  }, [text, isThinking]);

  if (!isVisible && !isThinking) return null;

  return (
    <div className="fixed bottom-36 left-1/2 -translate-x-1/2 z-[300] w-full max-w-3xl px-12 transition-all duration-700 pointer-events-none">
      <div className={`flex flex-col items-center gap-5 py-8 px-14 rounded-[4rem] border border-cyan-500/5 backdrop-blur-3xl shadow-[0_0_120px_rgba(0,0,0,0.6)] transition-all ${isThinking ? 'bg-cyan-500/5' : 'bg-black/40'}`}>
        {isThinking ? (
          <div className="flex items-center gap-8">
            <Brain size={20} className="text-cyan-400 animate-pulse" />
            <div className="flex gap-2.5">
              <div className="w-2 h-2 bg-cyan-400/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 bg-cyan-400/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 bg-cyan-400/50 rounded-full animate-bounce" />
            </div>
          </div>
        ) : (
          <div className="text-center">
             <p className="text-xl font-bold text-white/95 leading-relaxed tracking-wide italic shadow-sm">
              {displayedText}
            </p>
            {isProactive && (
              <div className="flex items-center justify-center gap-3 mt-4 opacity-50">
                <Sparkles size={10} className="text-amber-400" />
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white">OS SYNC SUGGESTION</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
