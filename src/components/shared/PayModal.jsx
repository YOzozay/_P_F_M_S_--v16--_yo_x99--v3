import React, { useState, useEffect } from 'react';
import { Btn } from '../ui/Btn';
import { ErrMsg } from './ErrMsg';
import { fmt } from '../../utils/formatters';

const inputStyle = {
  width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-input)",
  borderRadius: 10, padding: "9px 12px", color: "var(--c-text)", fontSize: 16, fontWeight: 700, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
};

export function PayModal({ loan, onClose, onConfirm, loading, err }) {
  // ตรวจสอบว่าเป็นงวดบ้านหรือไม่
  const isHome = loan._type === "home_loan" || loan.loan_type === "home_loan" || loan.id?.includes("home");
  
  // ประเมินดอกเบี้ย (เงินต้นคงเหลือ * ดอกเบี้ย% / 12 เดือน)
  const rate = Number(loan.interest_rate) || 0;
  const estimatedInterest = isHome && rate > 0 
    ? Math.round((Number(loan.remaining_amount) * (rate / 100)) / 12) 
    : 0;

  const [amt, setAmt] = useState(String(loan.monthly_due));
  const [interest, setInterest] = useState(String(estimatedInterest));

  // ✅ 1. เพิ่มระบบดักจับปุ่ม Esc เพื่อปิดแจ้งเตือน
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, loading]);

  // คำนวณเงินต้นอัตโนมัติ (ยอดรวม - ดอกเบี้ย)
  const principal = Math.max(0, Number(amt) - Number(interest));

  const handleConfirm = () => {
    if (isHome) {
      onConfirm({
        amount: Number(amt),
        principal: principal,
        interest: Number(interest)
      });
    } else {
      onConfirm(Number(amt));
    }
  };

  return (
    <div 
      style={{ 
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", 
        zIndex: 9999, display: "flex", alignItems: "center", 
        justifyContent: "center", padding: 20 
      }} 
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ 
        background: "var(--bg-picker)", border: "1px solid var(--border-card)", 
        borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 380, 
        boxShadow: "0 24px 60px rgba(0,0,0,0.5)" 
      }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--c-heading)", marginBottom: 4 }}>💳 ชำระค่างวด</div>
          <div style={{ fontSize: 14, color: "var(--c-secondary)", fontWeight: 700 }}>{loan.name}</div>
          <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 4 }}>
            ค่างวด {fmt(loan.monthly_due)} · คงเหลือ {fmt(loan.remaining_amount)}
          </div>
        </div>

        <div style={{ marginBottom: isHome ? 14 : 20 }}>
          <label style={{ display: "block", fontSize: 10, color: "var(--c-muted)", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>จำนวนที่ต้องการจ่ายรวม (฿)</label>
          <input type="number" value={amt} onChange={e => setAmt(e.target.value)} style={inputStyle} autoFocus />
        </div>

        {isHome && (
          <div style={{ background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.15)", borderRadius: 12, padding: "14px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 10, fontWeight: 700 }}>ดอกเบี้ยประเมิน: {rate}% (แก้ตามสลิปได้)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, color: "var(--c-muted)", marginBottom: 4 }}>ดอกเบี้ย</label>
                <input type="number" value={interest} onChange={e => setInterest(e.target.value)} style={{ ...inputStyle, fontSize: 14, padding: "8px", color: "#f43f5e" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, color: "var(--c-muted)", marginBottom: 4 }}>หักเงินต้น</label>
                <input type="text" value={fmt(principal)} disabled style={{ ...inputStyle, fontSize: 14, padding: "8px", color: "#10b981", opacity: 0.7 }} />
              </div>
            </div>
          </div>
        )}

        {err && <ErrMsg msg={err} />}
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* ✅ ปุ่มยกเลิกสีแดงมาตรฐาน */}
          <Btn onClick={onClose} color="#ef4444" style={{ fontWeight: 700 }}>ยกเลิก</Btn> 
          {/* ✅ ปุ่มยืนยันสีเขียวมาตรฐาน */}
          <Btn onClick={handleConfirm} color="#10b981" disabled={loading} style={{ fontWeight: 700 }}>
            {loading ? "..." : "ยืนยันชำระ"}
          </Btn>
        </div>
      </div>
    </div>
  );
}