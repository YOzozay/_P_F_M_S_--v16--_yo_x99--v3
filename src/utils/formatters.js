// src/utils/formatters.js

export const fmt = (number) => {
    if (number === undefined || number === null || isNaN(number)) return "0.00";
    return Number(number).toLocaleString('th-TH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };