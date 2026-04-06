import React, { useState, useEffect, useRef } from 'react';

export function CustomSelect({ value, onChange, options, placeholder = "เลือก..." }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  
  const selected = options.find(o => (o.value ?? o) === value);
  const label = selected ? (selected.label ?? selected) : null;
  
  return (
    <div ref={ref} className="relative select-none">
      <button 
        onClick={(e) => { e.preventDefault(); setOpen(o => !o); }} 
        className="flex items-center justify-between gap-2 w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        <span className={`truncate ${label ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 font-normal'}`}>
          {label || placeholder}
        </span>
        <span className={`text-[10px] text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xl max-h-[240px] overflow-y-auto">
          {options.map((opt, i) => {
            const val = opt.value ?? opt; 
            const lbl = opt.label ?? opt; 
            const active = val === value;
            return (
              <button 
                key={i} 
                onClick={(e) => { e.preventDefault(); onChange(val); setOpen(false); }} 
                className={`block w-full text-left px-3.5 py-2.5 text-sm transition-colors border-b last:border-b-0 border-slate-100 dark:border-slate-700/50 ${
                  active 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold' 
                    : 'bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                {lbl}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}