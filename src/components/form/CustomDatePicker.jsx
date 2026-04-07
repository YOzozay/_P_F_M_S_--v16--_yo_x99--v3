import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

// ── Pure-JS calendar helpers ──────────────────────────────────
const DAYS   = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
const MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

/** Parse 'YYYY-MM-DD' → Date (local midnight). Returns null on bad input. */
function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Format Date → 'YYYY-MM-DD' */
function fmtISO(d) {
  if (!d) return '';
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${dy}`;
}

/** Format Date → 'DD MMM YYYY' in Thai */
function fmtDisplay(d) {
  if (!d) return '';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** Get all days to show in the calendar grid for a given year/month (0-indexed) */
function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

// ─────────────────────────────────────────────────────────────
/**
 * CustomDatePicker
 *
 * Props:
 *   value    – 'YYYY-MM-DD' string (controlled)
 *   onChange – (newValue: string) => void
 *   label    – string (optional, shown above input)
 *   required – bool
 *   placeholder – string
 *   className – extra wrapper classes
 */
export function CustomDatePicker({ value, onChange, label, required, placeholder = 'เลือกวันที่', className = '' }) {
  const today   = new Date();
  const selected = parseDate(value);

  const [open, setOpen]       = useState(false);
  const [viewYear, setViewYear]   = useState(() => selected?.getFullYear()  ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => selected?.getMonth()      ?? today.getMonth());
  const [yearInput, setYearInput] = useState(false); // toggle year text input

  const wrapperRef = useRef(null);

  // ── Close on outside click ────────────────────────────────
  const handleOutside = useCallback((e) => {
    if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
      setOpen(false);
      setYearInput(false);
    }
  }, []);

  useEffect(() => {
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open, handleOutside]);

  // ── Sync view when external value changes ─────────────────
  useEffect(() => {
    if (selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
  }, [value]);

  // ── Navigation ────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // ── Select a day ─────────────────────────────────────────
  const pick = (day) => {
    if (!day) return;
    onChange(fmtISO(new Date(viewYear, viewMonth, day)));
    setOpen(false);
    setYearInput(false);
  };

  const days = getCalendarDays(viewYear, viewMonth);

  const isSelected = (day) =>
    selected &&
    selected.getFullYear() === viewYear &&
    selected.getMonth()    === viewMonth &&
    selected.getDate()     === day;

  const isToday = (day) =>
    today.getFullYear() === viewYear &&
    today.getMonth()    === viewMonth &&
    today.getDate()     === day;

  // ── Base styles matching app cards ────────────────────────
  const inputBase =
    'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer select-none ' +
    'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 ' +
    'text-slate-800 dark:text-slate-200 ' +
    'hover:border-emerald-400 dark:hover:border-emerald-600 ' +
    (open ? 'ring-2 ring-emerald-500 border-emerald-400 dark:border-emerald-600' : '');

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
          {label}{required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}

      {/* ── Trigger ─────────────────────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen(o => !o)}
        className={inputBase}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarDays size={15} className={selected ? 'text-emerald-500' : 'text-slate-400'} />
        <span className={selected ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}>
          {selected ? fmtDisplay(selected) : placeholder}
        </span>
      </div>

      {/* ── Popover ─────────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-label="Date picker"
          className="absolute z-50 mt-2 left-0 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 animate-in"
          style={{ animation: 'fadeInDown 0.12s ease' }}
        >
          {/* Header: prev / month+year / next */}
          <div className="flex items-center justify-between mb-3 gap-1">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-500 dark:text-slate-400"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1 flex-1 justify-center">
              {/* Month button */}
              <span className="text-sm font-bold text-slate-800 dark:text-white">
                {MONTHS[viewMonth]}
              </span>

              {/* Year — click to edit */}
              {yearInput ? (
                <input
                  type="number"
                  autoFocus
                  value={viewYear}
                  onChange={e => setViewYear(Number(e.target.value))}
                  onBlur={() => setYearInput(false)}
                  onKeyDown={e => e.key === 'Enter' && setYearInput(false)}
                  className="w-16 text-center text-sm font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg px-1 py-0.5 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setYearInput(true)}
                  className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-1 rounded"
                >
                  {viewYear}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-500 dark:text-slate-400"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className={`text-center text-[10px] font-bold py-1 ${d === 'อา' ? 'text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {days.map((day, i) => {
              const colDay   = (i % 7); // 0=Sun
              const isSun    = colDay === 0;
              const sel      = day && isSelected(day);
              const tod      = day && isToday(day);

              let dayCls = 'h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-sm font-medium transition-all ';
              if (!day) {
                dayCls += 'invisible';
              } else if (sel) {
                dayCls += 'bg-emerald-500 text-white font-bold shadow-sm';
              } else if (tod) {
                dayCls += 'ring-2 ring-emerald-400 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer';
              } else {
                dayCls += `${isSun ? 'text-rose-500 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'} hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer`;
              }

              return (
                <div key={i} className="flex items-center justify-center py-0.5">
                  <button
                    type="button"
                    onClick={() => pick(day)}
                    disabled={!day}
                    className={dayCls}
                  >
                    {day ?? ''}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <button
              type="button"
              onClick={() => pick(today.getDate()) || (setViewYear(today.getFullYear()), setViewMonth(today.getMonth()), pick(today.getDate()))}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              วันนี้
            </button>
            {selected && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="text-xs font-medium text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition"
              >
                ล้าง
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
