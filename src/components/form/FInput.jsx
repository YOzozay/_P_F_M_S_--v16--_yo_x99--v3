import React from 'react';
import { FormField } from './FormField';

export function FInput({ label, type = "text", value, onChange, placeholder, required, icon }) {
  return (
    <FormField label={label} required={required} icon={icon}>
      <input 
        type={type} 
        value={value} 
        placeholder={placeholder} 
        onChange={e => onChange(e.target.value)} 
        // Force the same styled classes for both 'text' and 'date' types.
        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      />
    </FormField>
  );
}