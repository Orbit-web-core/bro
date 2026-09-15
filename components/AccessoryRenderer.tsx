import React from 'react';
import { BroAccessory } from '@/lib/types';

// Updated prop type to use BroAccessory
export const AccessoryRenderer: React.FC<{ type: BroAccessory }> = ({ type }) => {
  const s = { transform: `translate(calc(var(--mx) * -0.15), calc(var(--my) * -0.15))` };
  
  switch (type) {
    case 'snapback':
      return (
        <div className="absolute -top-16 w-[110%] h-32 flex flex-col items-center z-50 pointer-events-none" style={s}>
          <div className="w-56 h-36 bg-rose-600 rounded-[100px_100px_20px_20px] shadow-xl relative overflow-hidden border-b-8 border-rose-800">
             <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-rose-400 rounded-full" />
          </div>
          <div className="w-64 h-8 bg-rose-700 rounded-[50px_50px_10px_10px] -mt-6 shadow-md" />
        </div>
      );
    case 'cat-ears':
      return (
        <div className="absolute -top-12 w-full flex justify-between px-16 z-0 pointer-events-none" style={s}>
          <div className="w-16 h-16 bg-[#f8d0b8] rounded-tr-[50px] shadow-md border-t-8 border-r-8 border-white/20" />
          <div className="w-16 h-16 bg-[#f8d0b8] rounded-tl-[50px] shadow-md border-t-8 border-l-8 border-white/20" />
        </div>
      );
    case 'astronaut':
      return (
        <div className="absolute -top-16 w-[120%] h-[110%] bg-white/10 backdrop-blur-md border-[14px] border-slate-100 rounded-[120px_120px_60px_60px] shadow-2xl z-50 flex items-center justify-center" style={s}>
           <div className="absolute top-8 left-8 w-12 h-4 bg-white/40 blur-sm rounded-full -rotate-45" />
           <div className="absolute bottom-4 w-full h-1 bg-white/20" />
        </div>
      );
    case 'headphones':
      return (
        <div className="absolute -top-6 w-[115%] flex justify-between px-1 z-50 pointer-events-none" style={s}>
          <div className="w-14 h-36 bg-indigo-600 rounded-full shadow-2xl border-r-8 border-indigo-800" />
          <div className="w-14 h-36 bg-indigo-600 rounded-full shadow-2xl border-l-8 border-indigo-800" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-10 border-t-[16px] border-indigo-700 rounded-full" />
        </div>
      );
    case 'witch':
      return (
        <div className="absolute -top-52 w-72 h-48 bg-slate-900 z-50 flex flex-col items-center" style={{ ...s, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}>
           <div className="absolute bottom-4 w-full h-6 bg-purple-600 shadow-inner" />
        </div>
      );
    default: return null;
  }
};
