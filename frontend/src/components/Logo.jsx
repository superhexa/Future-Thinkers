import React from "react";

export function Logo({ className = "", showText = true, dark = false }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`} data-testid="brand-logo">
      <div className="relative w-9 h-9 rounded-xl ft-navy-gradient grid place-items-center shadow-md">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        <span className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
      </div>
      {showText && (
        <div className="leading-tight">
          <div className={`font-head font-extrabold text-[15px] ${dark ? "text-white" : "text-slate-900"}`}>مفكرو المستقبل</div>
          <div className={`text-[10px] ${dark ? "text-slate-300" : "text-slate-500"}`}>Future Thinkers</div>
        </div>
      )}
    </div>
  );
}
