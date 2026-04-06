import React, { useEffect } from 'react';
import { Btn } from '../ui/Btn';
import { fmt } from '../../utils/formatters';

export function ConfirmModal({ 
  title, 
  subtitle, 
  amount, 
  onConfirm, 
  onClose, 
  loading, 
  type = "payment" // "payment" | "delete"
}) {
  const isDelete = type === "delete";

  // ✅ ระบบดักจับปุ่ม Esc เพื่อยกเลิก
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, loading]);

  return (
    <div 
      style={{ 
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", 
        zIndex: 10000, display: "flex", alignItems: "center", 
        justifyContent: "center", padding: 16 
      }} 
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ 
        background: "var(--bg-picker)", borderRadius: 20, padding: "28px 24px", 
        width: "100%", maxWidth: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
        border: "1px solid var(--border-card)"
      }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--c-heading)", marginBottom: 8 }}>
            {isDelete ? "🗑️ ยืนยันการลบ" : "💳 ยืนยันการชำระ"}
          </div>
          <div style={{ fontSize: 15, color: "var(--c-secondary)", fontWeight: 700 }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 13, color: "var(--c-muted)", marginTop: 6, fontWeight: 500 }}>
              {subtitle}
            </div>
          )}
        </div>

        {amount !== undefined && (
          <div style={{ 
            marginBottom: 24, padding: "16px", background: "rgba(255,255,255,0.03)", 
            borderRadius: 12, border: "1px solid var(--border-subtle)" 
          }}>
            <div style={{ fontSize: 10, color: "var(--c-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
              ยอดเงิน (฿)
            </div>
            <div style={{ 
              fontSize: 28, fontWeight: 800, 
              color: isDelete ? "#f87171" : "var(--c-heading)", 
              fontFamily: "'DM Mono', monospace"
            }}>
              {fmt(amount)}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* ✅ ปุ่มยกเลิก = แดง (#ef4444) */}
          <Btn onClick={onClose} color="#ef4444" style={{ fontWeight: 700 }}>
            ยกเลิก
          </Btn>
          {/* ✅ ปุ่มตกลง = เขียว (#10b981) หรือ แดงถ้าเป็นการลบ */}
          <Btn 
            onClick={onConfirm} 
            color={isDelete ? "#ef4444" : "#10b981"} 
            disabled={loading}
            style={{ fontWeight: 700 }}
          >
            {loading ? "..." : "ตกลง"}
          </Btn>
        </div>
      </div>
    </div>
  );
}