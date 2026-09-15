"use client";

import { useState, useEffect } from "react";
import { X, Minimize2, Maximize2, ExternalLink, Loader2 } from "lucide-react";

interface YouTubePlayerProps {
  videoId: string | null;
  searchQuery: string | null;
  title: string;
  isMinimized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

export function YouTubePlayer({
  videoId,
  searchQuery,
  title,
  isMinimized,
  onMinimize,
  onMaximize,
  onClose,
}: YouTubePlayerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const hasValidId = videoId && videoId.length === 11;
  const embedUrl = hasValidId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
    : null;
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery || title)}`;

  if (isMinimized) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed bottom-6 left-6 z-[800] w-[200px] h-[140px] md:w-[280px] md:h-[180px] rounded-xl border border-white/15 shadow-2xl shadow-black/60 overflow-hidden group cursor-pointer bg-slate-950 animate-in slide-in-from-bottom-4 zoom-in-90 duration-300"
      >
        {/* PIP header */}
        <div className="absolute top-0 left-0 right-0 h-7 bg-gradient-to-b from-black/70 to-transparent z-10 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[7px] font-black uppercase tracking-widest text-white/50">
              YouTube
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onMaximize}
              className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all"
              title="Expand"
            >
              <Maximize2 size={10} />
            </button>
            <button
              onClick={onClose}
              className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-white/50 hover:text-red-400 hover:bg-white/20 transition-all"
              title="Close"
            >
              <X size={10} />
            </button>
          </div>
        </div>
        {/* PIP click to expand */}
        <div className="absolute inset-0 z-[5]" onClick={onMaximize} />
        {/* PIP content */}
        {hasValidId ? (
          <iframe
            src={embedUrl!}
            className="w-full h-full border-0 bg-black pointer-events-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-900">
            <Loader2 size={20} className="text-red-400 animate-spin" />
          </div>
        )}
      </div>
    );
  }

  // Full-screen view
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[800] animate-in fade-in duration-300"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="absolute inset-2 md:inset-4 lg:inset-8 bg-slate-950 rounded-2xl border border-white/10 shadow-2xl shadow-black/50 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-500">
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-white/60">
              YouTube
            </span>
            <span className="text-xs text-white/40 truncate max-w-[200px] md:max-w-[400px]">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onMinimize}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
              title="Minimize"
            >
              <Minimize2 size={14} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 relative bg-black">
          {hasValidId ? (
            <iframe
              src={embedUrl!}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              title={title}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8">
              <svg
                className="w-16 h-16 text-red-500 opacity-80"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
              </svg>
              <p className="text-white/50 text-sm text-center max-w-md">
                Could not find an exact video match for "{title}". Click below to search on YouTube.
              </p>
              <a
                href={searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition-colors"
              >
                <ExternalLink size={16} />
                Search on YouTube
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
