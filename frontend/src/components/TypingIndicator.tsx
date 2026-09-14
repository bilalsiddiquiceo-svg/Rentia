'use client';

import React from 'react';

export function TypingIndicator({ name }: { name?: string }) {
  return (
    <div className="flex items-center gap-2.5 px-1 py-1.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
        {name?.charAt(0)?.toUpperCase() ?? '?'}
      </div>
      <div className="rounded-2xl rounded-bl-sm border border-slate-100 bg-white px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-[5px]">
          <span className="typing-dot h-[6px] w-[6px] rounded-full bg-slate-400" />
          <span className="typing-dot h-[6px] w-[6px] rounded-full bg-slate-400" style={{ animationDelay: '0.15s' }} />
          <span className="typing-dot h-[6px] w-[6px] rounded-full bg-slate-400" style={{ animationDelay: '0.3s' }} />
        </div>
      </div>
    </div>
  );
}
