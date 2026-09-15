import React, { useEffect, useState, useRef, memo } from 'react';

interface BroSpeechBubbleProps {
  text: string;
  isThinking: boolean;
  isVisible: boolean;
  isProactive?: boolean;
}

export const BroSpeechBubble = memo(({ 
  text, 
  isThinking, 
  isVisible,
}: BroSpeechBubbleProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [shouldScroll, setShouldScroll] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Check if text overflows and needs scrolling
  useEffect(() => {
    if (textRef.current && containerRef.current) {
      const textWidth = textRef.current.scrollWidth;
      const containerWidth = containerRef.current.clientWidth - 48; // account for padding
      setShouldScroll(textWidth > containerWidth);
    }
  }, [displayedText]);

  // Hide completely when no content
  const hasContent = isThinking || (isVisible && displayedText);
  
  return (
    <div 
      className={`fixed bottom-24 md:bottom-20 left-1/2 -translate-x-1/2 z-[300] pointer-events-none transition-all duration-500 ${
        hasContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{
        width: 'calc(100vw - 4rem)',
        maxWidth: '800px',
        minWidth: '280px',
      }}
    >
      {/* Glassmorphic container - fixed height */}
      <div 
        ref={containerRef}
        className="h-16 flex items-center px-6 rounded-xl overflow-hidden"
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(30, 30, 40, 0.4)',
          border: '1px solid rgba(120, 120, 140, 0.2)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Subtle scanlines overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
          }}
        />
        
        {isThinking ? (
          <div className="flex items-center gap-4 w-full">
            <div className="flex gap-1.5">
              <div className="w-1.5 h-1.5 bg-cyan-400/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-cyan-400/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-cyan-400/60 rounded-full animate-bounce" />
            </div>
            <span 
              className="text-[0.85rem] font-light tracking-[0.05em] whitespace-nowrap"
              style={{ color: 'rgba(200, 200, 220, 0.7)' }}
            >
              Processing...
            </span>
          </div>
        ) : (
          <div className="relative w-full overflow-hidden">
            <span 
              ref={textRef}
              className={`inline-block text-[1.1rem] font-light tracking-[0.05em] whitespace-nowrap ${
                shouldScroll ? 'animate-marquee' : ''
              }`}
              style={{ 
                color: 'rgba(200, 200, 220, 0.9)',
                textShadow: '0 0 20px rgba(200, 200, 220, 0.2)',
              }}
            >
              {displayedText}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

BroSpeechBubble.displayName = 'BroSpeechBubble';
