import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "../api/gsApi";
import { getPayMonth, getToday } from "../utils/dateUtils";
import { fmt } from "../utils/formatters";
import { calculatePayroll } from "../utils/payrollUtils";
import Swal from 'sweetalert2';

// ✅ นำเข้า Icon ที่จำเป็นสำหรับ Modal เข้ามาเพิ่มครับ
import { Settings, Save, Plus, History, X, Calendar, Zap, Clock, Hash } from 'lucide-react';

import { Card } from "../components/ui/Card";
import { Section } from "../components/ui/Section";
import { Btn, XBtn } from "../components/ui/Btn";
import { Badge } from "../components/ui/Badge";
import { FormField } from "../components/form/FormField";
import { FInput } from "../components/form/FInput";
import { CustomDatePicker } from "../components/form/CustomDatePicker";
import { CustomSelect } from "../components/form/CustomSelect";
import { MonthPicker } from "../components/form/MonthPicker";
import { Loading } from "../components/shared/Loading";
import { ErrMsg } from "../components/shared/ErrMsg";

const MONTH_NAMES = {
  "01": "ม.ค.", "02": "ก.พ.", "03": "มี.ค.", "04": "เม.ย.",
  "05": "พ.ค.", "06": "มิ.ย.", "07": "ก.ค.", "08": "ส.ค.",
  "09": "ก.ย.", "10": "ต.ค.", "11": "พ.ย.", "12": "ธ.ค."
};

const CONFIG_FIELDS = [
  { key: "salary_divisor_days", label: "วันทำงาน/เดือน (หาร)" },
  { key: "work_hours_per_day", label: "ชั่วโมง/วัน" },
  { key: "ot_multiplier_1", label: "OT HOLIDAY *" },
  { key: "ot_multiplier_1_5", label: "OT 1.5X *" },
  { key: "ot_multiplier_3", label: "OT 3X *" },
  { key: "ot_meal_threshold_hours", label: "OT ได้ค่าอาหาร (ชม.ขั้นต่ำ)" },
  { key: "meal_normal_per_day", label: "ค่าอาหาร NORMAL/วัน" },
  { key: "meal_ot_per_day", label: "ค่าอาหาร OT/วัน" },
  { key: "fuel_per_day", label: "ค่าน้ำมัน/วัน" },
  { key: "social_security_max_base", label: "ฐานประกันสังคม (สูงสุด)" },
  { key: "social_security_rate", label: "อัตราประกันสังคม" },
  { key: "student_loan_fixed", label: "กยศ. หักคงที่/เดือน" },
  { key: "diligence_allowance", label: "เบี้ยขยัน/เดือน" }
];

export default function OTTrackerPage() {
  // --- States สำหรับหน้าหลัก ---
  const [payMonth, setPayMonth] = useState(getPayMonth() || "2024-01");
  const [otLogs, setOtLogs] = useState([]);
  const [config, setConfig] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const [form, setForm] = useState({
    date: getToday() || "",
    multiplier: "1.5",
    hours: ""
  });
  const [lastEnteredHours, setLastEnteredHours] = useState(null);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // --- States สำหรับ Modal การตั้งค่า ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftConfig, setDraftConfig] = useState({});
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [salaryForm, setSalaryForm] = useState({ effective_date: "", salary: "" });

  const showSuccessAlert = (title) => {
    const isDark = document.documentElement.classList.contains('dark');
    Swal.fire({
      title: 'สำเร็จ!',
      text: title,
      icon: 'success',
      timer: 1500,
      showConfirmButton: false,
      background: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#f8fafc' : '#334155'
    });
  };

  const showErrorAlert = (msg) => {
    const isDark = document.documentElement.classList.contains('dark');
    Swal.fire({
      title: 'ผิดพลาด!',
      text: msg,
      icon: 'error',
      background: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#f8fafc' : '#334155'
    });
  };

  // --- โหลดข้อมูล ---
  const loadData = useCallback(() => {
    setLoading(true); setErr(null);
    Promise.all([
      apiGet({ action: "getWorklogs", payMonth }),
      apiGet({ action: "getConfig" }),
      apiGet({ action: "getSalaryHistory" }), // โหลดประวัติเงินเดือนมารอไว้เลย
      apiGet({ action: "summary", payMonth })
    ]).then(([logs, conf, hist, sum]) => {
      setOtLogs(Array.isArray(logs) ? logs : []);
      setSalaryHistory(Array.isArray(hist) ? hist : []);
      setConfig(conf || {
        salary: 30000, salary_divisor_days: 30, work_hours_per_day: 8,
        meal_normal_per_day: 50, meal_ot_per_day: 50, ot_meal_threshold_hours: 3,
        fuel_per_day: 100, social_security_max_base: 15000, social_security_rate: 0.05,
        student_loan_fixed: 1500
      });
      setSummary(sum && !sum.error ? sum : null);
    }).catch(e => setErr("โหลดข้อมูลไม่สำเร็จ")).finally(() => setLoading(false));
  }, [payMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  // --- Handlers หน้าหลัก ---
  const handleAddOT = async (overrideMultiplier, overrideHours) => {
    if (submitting) return;
    const submitHours = overrideHours || form.hours;
    const submitMultiplier = overrideMultiplier || form.multiplier;

    if (!submitHours) return;
    setSubmitting(true);
    try {
      const hours = Number(submitHours);
      const payload = {
        action: "addWorklog",
        date: form.date,
        type: "ot",
        note: `OT x${submitMultiplier}`
      };
      if (submitMultiplier === "1") payload.holiday_hours = hours;
      if (submitMultiplier === "1.5") payload.ot_evening_1_5x = hours;
      if (submitMultiplier === "3") payload.ot_evening_3x = hours;

      await apiPost(payload);
      showSuccessAlert(`บันทึก OT x${submitMultiplier} เรียบร้อยแล้ว`);
      loadData();
      
      setLastEnteredHours(hours);
      setForm(p => ({ ...p, hours: "" }));
    } catch {
      showErrorAlert("บันทึก OT ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const isDark = document.documentElement.classList.contains('dark');
    const result = await Swal.fire({
      title: 'ยืนยันการลบรายการ?',
      text: 'หากลบแล้วจะไม่สามารถกู้คืนข้อมูลได้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก',
      background: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#f8fafc' : '#334155'
    });
    if (!result.isConfirmed) return;

    try {
      await apiPost({ action: "deleteWorklog", id });
      showSuccessAlert("ลบข้อมูลสำเร็จ");
      loadData();
    } catch {
      showErrorAlert("ลบข้อมูลไม่สำเร็จ");
    }
  };

  // --- Handlers สำหรับ Modal ตั้งค่า ---
  const openSettings = () => {
    setDraftConfig({ ...config }); // ก๊อปปี้ค่าปัจจุบันไปแก้ไขใน Draft
    setIsSettingsOpen(true);
  };

  const handleSaveConfig = async () => {
    if (savingSettings) return;
    setSavingSettings(true);
    try {
      await apiPost({ action: "updateConfig", ...draftConfig });
      showSuccessAlert("บันทึกการตั้งค่าระบบเรียบร้อย");
      setConfig(draftConfig); // อัปเดตการคำนวณหน้าหลักทันที
      setIsSettingsOpen(false); // ปิดหน้าต่าง
    } catch {
      showErrorAlert("ไม่สามารถบันทึกการตั้งค่าได้");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddSalary = async (e) => {
    e.preventDefault();
    if (savingSettings || !salaryForm.effective_date || !salaryForm.salary) return;
    setSavingSettings(true);
    try {
      await apiPost({ action: "addSalaryHistory", ...salaryForm });
      showSuccessAlert("บันทึกฐานเงินเดือนใหม่เรียบร้อย");
      setSalaryForm({ effective_date: "", salary: "" });
      loadData(); // รีโหลดประวัติใหม่
    } catch {
      showErrorAlert("ไม่สามารถเพิ่มฐานเงินเดือนได้");
    } finally {
      setSavingSettings(false);
    }
  };

  const baseSalary = summary?.income?.monthlySalary && summary.income.monthlySalary > 0 
                     ? summary.income.monthlySalary 
                     : (config?.salary || 0);

  const backendOtPay = summary?.income?.otPay || 0;

  const rawPayroll = config ? calculatePayroll({ ...config, salary: baseSalary }, otLogs, 22) : null;
  const payroll = rawPayroll ? {
    ...rawPayroll,
    otPay: backendOtPay > 0 ? backendOtPay : rawPayroll.otPay,
    grossIncome: baseSalary + (backendOtPay > 0 ? backendOtPay : rawPayroll.otPay) + rawPayroll.totalAllowances,
    netIncome: (baseSalary + (backendOtPay > 0 ? backendOtPay : rawPayroll.otPay) + rawPayroll.totalAllowances) - rawPayroll.totalDeductions
  } : null;

  const currentMonthStr = payMonth ? payMonth.split("-")[1] : "01";

  const totalHolidayHours = otLogs.reduce((acc, log) => acc + (Number(log.holiday_hours) || 0), 0);
  const totalOt15 = otLogs.reduce((acc, log) => acc + (Number(log.ot15 || log.ot_evening_1_5x) || 0), 0);
  const totalOt3 = otLogs.reduce((acc, log) => acc + (Number(log.ot3 || log.ot_evening_3x) || 0), 0);
  const grandTotalOt = totalHolidayHours + totalOt15 + totalOt3;

  const InputClass = "w-full p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-200 transition-colors text-sm";
  const LabelClass = "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider";

  if (loading && !config && !summary) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-slate-500 font-semibold">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 relative">

      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">OT & Income</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">บันทึกชั่วโมงทำล่วงเวลา และประมาณการรายได้สุทธิ</p>
        </div>
        {/* ✅ ปุ่มเปิด Settings แบบ Popup */}
        <button
          onClick={openSettings}
          className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm"
        >
          <Settings size={18} /> ตั้งค่าระบบ
        </button>
      </div>

      <div className="flex items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 gap-4 shadow-sm">
        <MonthPicker value={payMonth} onChange={setPayMonth} />
        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700" />
        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          รอบเงินเดือน: 21 {MONTH_NAMES[currentMonthStr]} - 20 เดือนถัดไป
        </div>
      </div>

      {err && <ErrMsg msg={err} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ฝั่งซ้าย: Form */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-5">บันทึกการทำล่วงเวลา (OT)</h3>
            <div className="space-y-5">
              <CustomDatePicker label="วันที่ทำ OT" value={form.date} onChange={v => f("date", v)} required />

              <FormField label="อัตราค่าล่วงเวลา (Multiplier)" icon={Zap} required>
                <CustomSelect
                  value={form.multiplier}
                  onChange={v => f("multiplier", v)}
                  options={[
                    { value: "1", label: "x1.0 (ทำในวันหยุด)" },
                    { value: "1.5", label: "x1.5 (ล่วงเวลาวันปกติ)" },
                    { value: "3", label: "x3.0 (ล่วงเวลาวันหยุด)" },
                  ]}
                />
              </FormField>

              <FInput label="จำนวนชั่วโมง" icon={Clock} type="number" value={form.hours} onChange={v => f("hours", v)} placeholder="เช่น 2.5 หรือ 3" required />
            </div>
            
            <div className="mt-8 space-y-3">
              <Btn onClick={() => handleAddOT()} color="#10b981" disabled={submitting} className="w-full">
                {submitting ? "กำลังบันทึก..." : "+ บันทึกชั่วโมง OT"}
              </Btn>
              
              {lastEnteredHours && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                   <button 
                     onClick={() => handleAddOT("1.5", lastEnteredHours)} 
                     disabled={submitting}
                     className="flex-1 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-transparent border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                   >
                     Quick x1.5 ({lastEnteredHours} ชม.)
                   </button>
                   <button 
                     onClick={() => handleAddOT("1", lastEnteredHours)} 
                     disabled={submitting}
                     className="flex-1 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-transparent border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                   >
                     Quick x1.0 ({lastEnteredHours} ชม.)
                   </button>
                </div>
              )}
            </div>
          </div>

          {payroll && (
            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-xl border border-emerald-200 dark:border-emerald-800/30 shadow-sm">
              <div className="text-emerald-600 dark:text-emerald-400 font-bold mb-4 pb-3 border-b border-emerald-200 dark:border-emerald-800/30">💰 ประมาณการรายได้สุทธิ (Estimate)</div>
              
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800/50 mb-4 space-y-2.5 shadow-sm text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5"><Clock size={14} className="text-emerald-500" /> รวมชั่วโมง x1.0 (วันหยุด):</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{totalHolidayHours} ชม.</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5"><Clock size={14} className="text-amber-500" /> รวมชั่วโมง x1.5 (OT ปกติ):</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-500">{totalOt15} ชม.</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5"><Clock size={14} className="text-rose-500" /> รวมชั่วโมง x3.0 (OT วันหยุด):</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-500">{totalOt3} ชม.</span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-200 border-t border-slate-100 dark:border-slate-700/50 pt-2.5 mt-2 font-bold">
                  <span className="flex items-center gap-1.5"><Hash size={14} className="text-blue-500" /> รวมชั่วโมง OT ทั้งหมด:</span>
                  <span className="text-blue-600 dark:text-blue-400">{grandTotalOt} ชม.</span>
                </div>
              </div>

              <div className="space-y-2.5 text-sm">
                {/* ── Income lines ── */}
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>เงินเดือนฐาน:</span> <span className="font-semibold">฿{fmt(baseSalary)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>ค่า OT สะสม:</span> <span className="font-bold text-blue-600 dark:text-blue-400">+฿{fmt(payroll.otPay)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>สวัสดิการ (ค่าอาหาร+เดินทาง):</span> <span className="font-bold text-emerald-600 dark:text-emerald-400">+฿{fmt(payroll.totalAllowances)}</span>
                </div>

                {/* ── Gross subtotal ── */}
                <div className="flex justify-between text-slate-700 dark:text-slate-200 bg-emerald-100/60 dark:bg-emerald-900/20 rounded-lg px-3 py-2 border border-emerald-200 dark:border-emerald-800/40 font-semibold">
                  <span>รายได้รวม (Gross):</span>
                  <span className="text-emerald-700 dark:text-emerald-300">฿{fmt(payroll.grossIncome)}</span>
                </div>

                {/* ── Deductions ── */}
                <div className="flex justify-between text-slate-600 dark:text-slate-300 pt-1">
                  <span>เงินสมทบประกันสังคม <span className="text-slate-400 dark:text-slate-500 text-xs">(จากเงินเดือนฐาน, สูงสุด ฿{fmt((Number(config.social_security_max_base) || 15000) * (Number(config.social_security_rate) || 0.05))})</span>:</span>
                  <span className="font-bold text-rose-500">-฿{fmt(payroll.socialSecurity)}</span>
                </div>
                {payroll.studentLoan > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>หัก กยศ. (คงที่):</span>
                    <span className="font-bold text-rose-500">-฿{fmt(payroll.studentLoan)}</span>
                  </div>
                )}

                {/* ── Net total ── */}
                <div className="flex justify-between items-center text-lg font-bold mt-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                  <span className="text-slate-700 dark:text-slate-200">รายได้สุทธิ (Net):</span>
                  <span className="text-emerald-600 dark:text-emerald-400">฿{fmt(payroll.netIncome)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ฝั่งขวา: Table */}
        <div className="bg-white dark:bg-slate-800 p-0 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">ประวัติ OT รอบบิลนี้ ({otLogs.reduce((s, l) => s + (Number(l.holiday_hours) || 0) + (Number(l.ot15) || 0) + (Number(l.ot3) || 0), 0)} ชม.)</h3>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-400 animate-pulse">กำลังโหลดข้อมูล...</div>
          ) : otLogs.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">ยังไม่มีประวัติ OT ในรอบบิลนี้</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              <div className="grid grid-cols-[1fr_80px_80px_40px] px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/20">
                <span>วันที่</span><span className="text-center">เรท</span><span className="text-right">ชั่วโมง</span><span />
              </div>
              {otLogs.map((log) => {
                let logHours = 0;
                let logMultiplier = "";
                let badgeColor = "#f59e0b";
                if (log.holiday_hours) { logHours = log.holiday_hours; logMultiplier = "1.0"; badgeColor = "#10b981"; }
                else if (log.ot15) { logHours = log.ot15; logMultiplier = "1.5"; badgeColor = "#f59e0b"; }
                else if (log.ot3) { logHours = log.ot3; logMultiplier = "3.0"; badgeColor = "#ef4444"; }

                return (
                  <div key={log.id} className="grid grid-cols-[1fr_80px_80px_40px] px-5 py-4 items-center text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{log.date}</span>
                    <span className="text-center"><Badge text={`x${logMultiplier}`} color={badgeColor} /></span>
                    <span className="text-right font-mono font-bold text-blue-600 dark:text-blue-400">{logHours} ชม.</span>
                    <div className="text-right"><XBtn onClick={() => handleDelete(log.id)} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL ตั้งค่า (POPUP)                          */}
      {/* ========================================== */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-4xl max-h-full overflow-hidden flex flex-col rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 md:p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shrink-0">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                <Settings size={24} className="text-blue-500" /> ตั้งค่าระบบ (Settings)
              </h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:text-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-5 md:p-6 overflow-y-auto flex flex-col gap-8">

              {/* Section 1: Payroll Config */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-5 uppercase tracking-wider border-l-4 border-blue-500 pl-3">
                  Payroll Config
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                  {CONFIG_FIELDS.map(({ key, label }) => (
                    <div key={key}>
                      <label className={LabelClass}>{label}</label>
                      <input
                        type="number"
                        value={draftConfig[key] ?? ""}
                        onChange={e => setDraftConfig(p => ({ ...p, [key]: e.target.value }))}
                        className={InputClass}
                        step="0.01"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSaveConfig}
                    disabled={savingSettings}
                    className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-8 py-2.5 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors shadow-sm"
                  >
                    <Save size={18} /> {savingSettings ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700"></div>

              {/* Section 2 & 3: Salary History */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Form เพิ่มเงินเดือน */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-5 uppercase tracking-wider border-l-4 border-emerald-500 pl-3">
                    เพิ่มประวัติเงินเดือนใหม่
                  </h3>
                  <form onSubmit={handleAddSalary} className="space-y-4 bg-slate-50 dark:bg-slate-900/30 p-5 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <div>
                      <label className={LabelClass}>วันที่เริ่มใช้ (Effective Date) <span className="text-rose-500">*</span></label>
                      <CustomDatePicker value={salaryForm.effective_date} onChange={v => setSalaryForm(p => ({ ...p, effective_date: v }))} required />
                    </div>
                    <div>
                      <label className={LabelClass}>ฐานเงินเดือน (฿) <span className="text-rose-500">*</span></label>
                      <input type="number" value={salaryForm.salary} onChange={e => setSalaryForm(p => ({ ...p, salary: e.target.value }))} className={InputClass} placeholder="เช่น 30000" required />
                    </div>
                    <button type="submit" disabled={savingSettings} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors shadow-sm mt-2">
                      <Plus size={18} /> เพิ่มประวัติ
                    </button>
                  </form>
                </div>

                {/* List ประวัติเงินเดือน */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-5 uppercase tracking-wider border-l-4 border-purple-500 pl-3">
                    ประวัติเงินเดือน (Salary History)
                  </h3>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-[300px] overflow-y-auto">
                      {salaryHistory.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-sm">ยังไม่มีข้อมูล</div>
                      ) : (
                        salaryHistory.map((h, i) => (
                          <div key={i} className="flex justify-between items-center px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{h.effective_date}</span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">฿{fmt(h.salary)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}