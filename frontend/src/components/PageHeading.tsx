'use client';

import React from 'react';

interface PageHeadingProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeading({ title, subtitle, actions }: PageHeadingProps) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="h-12 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-[#0F766E] to-[#2DD4BF] shadow-sm shadow-[#0F766E]/30"
        />
        <div>
          <h1 className="font-[Cinzel] text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[32px]">
            {title}
          </h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
