import React, { useState } from "react";
import { MONTHS } from "../../utils/dateUtils";

export function MonthPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(value.split("-")[0]));
  const activeMonth = Number(value.split("-")[1]) - 1;
  const select = (mi) => { onChange(`${year}-${String(mi + 1).padStart(2, "0")}`); setOpen(false); };
  
  return (
    <div className="relative select-none">
      <button 
        onClick={() => setOpen(o => !o)} 
        className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3.5 text-slate-800 dark:text-slate-200 text-sm font-semibold cursor-pointer min-w-[150px] justify-between transition-colors hover:border-blue-400"
      >
        <span>{MONTHS[activeMonth]} {year}</span>
        <span className={`text-[10px] text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      
      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-50 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-xl p-4 min-w-[220px]">
          <div className="flex items-center justify-between mb-3.5">
            <button onClick={() => setYear(y => y - 1)} className="bg-slate-100 dark:bg-slate-700 border-none rounded-md w-7 h-7 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition-colors">‹</button>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">{year}</span>
            <button onClick={() => setYear(y => y + 1)} className="bg-slate-100 dark:bg-slate-700 border-none rounded-md w-7 h-7 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition-colors">›</button>
          </div>
          
          <div className="grid grid-cols-4 gap-1.5">
            {MONTHS.map((m, i) => {
              const isCurrent = year === Number(value.split("-")[0]) && i === activeMonth;
              return (
                <button 
                  key={m} 
                  onClick={() => select(i)} 
                  className={`py-1.5 rounded-md text-sm font-medium transition-all ${
                    isCurrent 
                      ? "bg-blue-500 text-white font-bold" 
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
          
          <div className="mt-3 text-right">
            <button 
              onClick={() => { const n = new Date(); setYear(n.getFullYear()); select(n.getMonth()); }} 
              className="text-[11px] font-semibold text-blue-500 hover:text-blue-600 cursor-pointer bg-transparent border-none p-0"
            >
              เดือนนี้
            </button>
          </div>
        </div>
      )}
    </div>
  );
}