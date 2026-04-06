import React, { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, Calendar, BarChart2, Activity, CreditCard, RefreshCw, Car, Home, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { apiGet, apiPost } from "../api/gsApi";
import { fmt } from "../utils/formatters";
import { getPayMonth } from "../utils/dateUtils";
import Swal from "sweetalert2";

import { MonthPicker } from "../components/form/MonthPicker";
import { Loading } from "../components/shared/Loading";
import { ErrMsg } from "../components/shared/ErrMsg";

// ── DTI helpers ────────────────────────────────────────────────
function getDtiColor(dti) {
    if (dti < 36) return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "ดี", ring: "ring-emerald-500" };
    if (dti < 50) return { bar: "bg-amber-400", text: "text-amber-600 dark:text-amber-400",   label: "พอใช้", ring: "ring-amber-400" };
    return          { bar: "bg-rose-500",   text: "text-rose-600 dark:text-rose-400",     label: "สูง", ring: "ring-rose-500" };
}

// ── Upcoming item type icons ──────────────────────────────────
const TYPE_META = {
    loan_car:  { icon: Car,        label: "สินเชื่อรถ",  color: "text-blue-500",   bg: "bg-blue-100 dark:bg-blue-900/30" },
    loan_home: { icon: Home,       label: "สินเชื่อบ้าน", color: "text-violet-500", bg: "bg-violet-100 dark:bg-violet-900/30" },
    bill:      { icon: RefreshCw,  label: "บิลประจำ",    color: "text-teal-500",   bg: "bg-teal-100 dark:bg-teal-900/30" },
    credit:    { icon: CreditCard, label: "รูดผ่อน",     color: "text-amber-500",  bg: "bg-amber-100 dark:bg-amber-900/30" },
};

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState("monthly");
    const [payMonth, setPayMonth] = useState(getPayMonth() || "2024-01");
    const currentYear = new Date().getFullYear();

    // ── Monthly summary ──────────────────────────────────────
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);

    // ── Financial health data (DTI + Upcoming) ───────────────
    const [healthData, setHealthData] = useState(null);
    const [healthLoading, setHealthLoading] = useState(false);

    // ── Pay-now tracking ─────────────────────────────────────
    const [payingId, setPayingId] = useState(null);   // which item is pending
    const [paidIds, setPaidIds] = useState(new Set()); // ids already paid this session

    // ── Yearly ──────────────────────────────────────────────
    const [yearlyData, setYearlyData] = useState([]);
    const [yearLoading, setYearLoading] = useState(false);
    const [yearErr, setYearErr] = useState(null);

    const [showBalance, setShowBalance] = useState(true);
    const mask = (val) => (showBalance ? val : "****");

    // ── Load main summary ────────────────────────────────────
    const loadDashboard = useCallback(() => {
        if (activeTab === "monthly") {
            setLoading(true); setErr(null);
            apiGet({ action: "summary", payMonth })
                .then((data) => {
                    if (data.error) throw new Error(data.error);
                    setSummary(data);
                })
                .catch((e) => setErr(e.message))
                .finally(() => setLoading(false));
        } else {
            setYearLoading(true); setYearErr(null);
            apiGet({ action: "yearSummary", year: currentYear.toString() })
                .then((data) => {
                    if (data.error) throw new Error(data.error);
                    setYearlyData(Array.isArray(data) ? data : []);
                })
                .catch((e) => setYearErr(e.message))
                .finally(() => setYearLoading(false));
        }
    }, [payMonth, activeTab, currentYear]);

    useEffect(() => { loadDashboard(); }, [loadDashboard]);

    // ── Load health / debt data (DTI + Upcoming) ─────────────
    const loadHealthData = useCallback(async () => {
        if (activeTab !== "monthly") return;
        setHealthLoading(true);
        try {
            const [carLoans, homeLoans, fixedBills, installments] = await Promise.all([
                apiGet({ action: "getCarLoans" }),
                apiGet({ action: "getHomeLoans" }),
                apiGet({ action: "getFixedList" }),
                apiGet({ action: "getInstallments" }),
            ]);

            const cars  = Array.isArray(carLoans)    ? carLoans    : [];
            const homes = Array.isArray(homeLoans)   ? homeLoans   : [];
            const bills = Array.isArray(fixedBills)  ? fixedBills  : [];
            const rawInst = Array.isArray(installments) ? installments : [];

            // ── Aggregate installment groups ──────────────────
            const instGroups = Object.values(
                rawInst.reduce((acc, inst) => {
                    const tid = inst.transaction_id;
                    if (!acc[tid]) acc[tid] = {
                        id: tid, itemName: inst.description, cardName: inst.card_name,
                        cardId: inst.card_id, months: parseInt(inst.months) || 1,
                        monthly_due: parseFloat(inst.amount) || 0,
                        installments: []
                    };
                    acc[tid].installments.push(inst);
                    return acc;
                }, {})
            ).filter(g => g.months > 1); // only installment (ผ่อน), not full-pay

            // ── DTI numerator ─────────────────────────────────
            const totalLoanDue  = [...cars, ...homes].reduce((s, l) => s + (parseFloat(l.monthly_due || l.monthly_installment) || 0), 0);
            const totalBillDue  = bills.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
            const totalCreditDue = instGroups.reduce((s, g) => s + (parseFloat(g.monthly_due) || 0), 0);
            const totalDebt = totalLoanDue + totalBillDue + totalCreditDue;

            // ── Upcoming payments for current payMonth ────────
            const upcoming = [];

            cars.forEach(l => {
                upcoming.push({
                    id: `car_${l.id}`, rawId: l.id, type: "loan_car",
                    name: l.name, sub: l.lender || l.company || "ไม่ระบุ",
                    amount: parseFloat(l.monthly_due || l.monthly_installment) || 0,
                    action: "payLoan",
                });
            });

            homes.forEach(l => {
                upcoming.push({
                    id: `home_${l.id}`, rawId: l.id, type: "loan_home",
                    name: l.name, sub: l.lender || l.bank || "ไม่ระบุ",
                    amount: parseFloat(l.monthly_due || l.monthly_installment) || 0,
                    action: "payLoan",
                });
            });

            bills.forEach(b => {
                upcoming.push({
                    id: `bill_${b.id}`, rawId: b.id, type: "bill",
                    name: b.name, sub: `เริ่ม ${b.start_date || "—"}`,
                    amount: parseFloat(b.amount) || 0,
                    action: "payFixedExpense",
                });
            });

            instGroups.forEach(g => {
                const unpaidInst = g.installments.find(i => i.status === "unpaid");
                if (unpaidInst) {
                    upcoming.push({
                        id: `credit_${g.id}`, rawId: unpaidInst.id, type: "credit",
                        name: g.itemName, sub: `บัตร ${g.cardName} • ${g.months} ด.`,
                        amount: parseFloat(g.monthly_due) || 0,
                        action: "payInstallment",
                    });
                }
            });

            setHealthData({ totalDebt, totalLoanDue, totalBillDue, totalCreditDue, upcoming });
        } catch (e) {
            console.error("Health data load error:", e);
        } finally {
            setHealthLoading(false);
        }
    }, [activeTab, payMonth]);

    useEffect(() => { loadHealthData(); }, [loadHealthData]);

    // ── Pay Now handler ───────────────────────────────────────
    const handlePayNow = async (item) => {
        const isDark = document.documentElement.classList.contains('dark');
        const result = await Swal.fire({
            title: 'ยืนยันการจ่ายเงิน?',
            html: `<div style="text-align:left;font-size:14px">
                <b>${item.name}</b><br/>
                <span style="color:#64748b">${item.sub}</span><br/><br/>
                จำนวน: <b style="color:#ef4444">฿${fmt(item.amount)}</b>
            </div>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#64748b',
            confirmButtonText: '✓ ยืนยัน จ่ายเลย',
            cancelButtonText: 'ยกเลิก',
            background: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#f8fafc' : '#334155'
        });
        if (!result.isConfirmed) return;

        setPayingId(item.id);
        try {
            const res = await apiPost({ action: item.action, id: item.rawId, payMonth });
            if (res?.error) throw new Error(res.error);
            setPaidIds(prev => new Set([...prev, item.id]));
            Swal.fire({
                title: 'สำเร็จ!', text: `จ่าย ${item.name} เรียบร้อยแล้ว`,
                icon: 'success', timer: 1500, showConfirmButton: false,
                background: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#f8fafc' : '#334155'
            });
        } catch (e) {
            console.error("Pay error:", e);
            Swal.fire({
                title: 'เกิดข้อผิดพลาด!',
                text: e.message || 'ไม่สามารถบันทึกการจ่ายได้ กรุณาลองใหม่',
                icon: 'error',
                background: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#f8fafc' : '#334155'
            });
        } finally {
            setPayingId(null);
        }
    };

    // ── DTI ───────────────────────────────────────────────────
    // True Gross = Base Salary + OT Pay + All Welfare/Allowances
    // This now comes directly from the backend API (totalGross).
    const grossMonthlyIncome = summary?.income?.totalGross || 0;
    const totalDebt = healthData?.totalDebt || 0;
    const dtiPct = grossMonthlyIncome > 0 ? (totalDebt / grossMonthlyIncome) * 100 : 0;
    const dtiStyle = getDtiColor(dtiPct);

    // ── Yearly ────────────────────────────────────────────────
    const now = new Date();
    const actualYear = now.getFullYear();
    const actualMonth = now.getMonth() + 1;

    const filteredYearlyData = yearlyData.filter(m => {
        if (!m.payMonth) return true;
        const [itemYear, itemMonth] = m.payMonth.split("-").map(Number);
        if (itemYear < actualYear) return true;
        if (itemYear === actualYear) return itemMonth <= actualMonth;
        return false;
    });

    const maxVal = Math.max(
        ...filteredYearlyData.map(d => Math.max(Number(d.netIncome) || 0, Number(d.totalExpenses) || 0)),
        1
    );

    const s = summary;

    return (
        <div className="space-y-6 pb-10">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard Overview</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">สรุปข้อมูลการเงินแบบ Real-time</p>
            </div>

            {/* ── Tabs ─────────────────────────────────────────── */}
            <div className="bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl flex gap-1 overflow-x-auto border border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => setActiveTab('monthly')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all flex-1 md:flex-none ${
                        activeTab === 'monthly'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                >
                    <Calendar size={16} /> สรุปรายเดือน
                </button>
                <button
                    onClick={() => setActiveTab('yearly')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all flex-1 md:flex-none ${
                        activeTab === 'yearly'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                >
                    <BarChart2 size={16} /> สรุปรายปี ({currentYear})
                </button>
            </div>

            {/* ══════════════════════════════════════════════════ */}
            {/* MONTHLY TAB                                        */}
            {/* ══════════════════════════════════════════════════ */}
            {activeTab === "monthly" && (
                <>
                    {loading ? <div className="p-10"><Loading /></div> :
                     err    ? <div className="p-10"><ErrMsg msg={err} /></div> :
                     !summary ? null :
                     (
                        <>
                            {/* ── Month Picker Bar ─────────────────────── */}
                            <div className="flex flex-wrap items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 gap-4 shadow-sm justify-between">
                                <div className="flex items-center gap-4">
                                    <MonthPicker value={payMonth} onChange={setPayMonth} />
                                    <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700" />
                                    <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                        รอบบิล: {s.period?.startDate || "—"} ถึง {s.period?.endDate || "—"}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowBalance(!showBalance)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 transition"
                                >
                                    {showBalance ? <Eye size={16} /> : <EyeOff size={16} />}
                                    {showBalance ? "ซ่อนตัวเลข" : "แสดงตัวเลข"}
                                </button>
                            </div>

                            {/* ── Income + Expense Cards ───────────────── */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <div className="w-32 h-32 bg-emerald-500 rounded-full blur-3xl"></div>
                                    </div>
                                     <div className="relative z-10">
                                        <h3 className="text-emerald-800 dark:text-emerald-400 font-semibold text-sm">รายรับรวม Gross (ประมาณการรอบปัจจุบัน)</h3>
                                        <div className="text-4xl font-bold text-slate-800 dark:text-white mt-2 font-mono">
                                            ฿ {mask(fmt(grossMonthlyIncome))}
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                                            <span className="bg-white/60 dark:bg-slate-800/60 px-2 py-1 rounded">เงินเดือน: {mask(fmt(s.income?.monthlySalary || 0))}</span>
                                            <span className="bg-white/60 dark:bg-slate-800/60 px-2 py-1 rounded">+ OT/เบี้ยเลี้ยง: {mask(fmt((s.income?.otPay || 0) + (s.income?.mealNormal || 0) + (s.income?.mealOt || 0) + (s.income?.fuel || 0)))}</span>
                                            <span className="bg-white/60 dark:bg-slate-800/60 px-2 py-1 rounded text-rose-600 dark:text-rose-400">- หักลบ: {mask(fmt(s.deductions?.totalDeduction || 0))}</span>
                                        </div>
                                        <div className="mt-2 text-xs text-emerald-700/70 dark:text-emerald-500/70">
                                            รับสุทธิ (Net): ฿{mask(fmt(s.netIncome || 0))} · ใช้ Gross สำหรับคำนวณ DTI
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-slate-600 dark:text-slate-400 font-semibold text-sm">รายจ่ายรวม (Expenses & Bills)</h3>
                                        <div className="text-3xl font-bold text-rose-500 mt-2 font-mono">
                                            ฿ {mask(fmt(s.expenses?.totalExpenses || 0))}
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                                        <span className="text-sm font-medium text-slate-500">เงินคงเหลือ:</span>
                                        <span className={`text-lg font-bold font-mono ${(s.netBalance || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            ฿ {mask(fmt(s.netBalance || 0))}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* ── DTI Health Card ──────────────────────── */}
                            {!healthLoading && grossMonthlyIncome > 0 && (
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
                                            <Activity size={20} className="text-violet-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-white text-base">ความสมบูรณ์ทางการเงิน (DTI)</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Debt-to-Income Ratio — ยิ่งต่ำยิ่งดี (เป้าหมาย &lt; 36%)</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* DTI Gauge */}
                                        <div className="md:col-span-1 flex flex-col items-center justify-center gap-3">
                                            <div className={`relative w-28 h-28 rounded-full ring-4 ${dtiStyle.ring} ring-offset-2 ring-offset-white dark:ring-offset-slate-800 flex items-center justify-center flex-col bg-slate-50 dark:bg-slate-900/50`}>
                                                <span className={`text-2xl font-black font-mono ${dtiStyle.text}`}>{dtiPct.toFixed(1)}%</span>
                                                <span className={`text-xs font-bold ${dtiStyle.text}`}>{dtiStyle.label}</span>
                                            </div>
                                            {/* Mini bar */}
                                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-2 rounded-full transition-all duration-700 ${dtiStyle.bar}`}
                                                    style={{ width: `${Math.min(dtiPct, 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Breakdown */}
                                        <div className="md:col-span-2 grid grid-cols-2 gap-3 content-center">
                                            {[
                                                { label: "รายได้รวม Gross", value: grossMonthlyIncome, color: "text-emerald-600 dark:text-emerald-400", hint: "เงินเดือน + OT + สวัสดิการ" },
                                                { label: "หนี้รวม/เดือน", value: totalDebt, color: "text-rose-500", hint: null },
                                                { label: "สินเชื่อ (Loans)", value: healthData?.totalLoanDue || 0, color: "text-blue-500", hint: null },
                                                { label: "บิลประจำ (Bills)", value: healthData?.totalBillDue || 0, color: "text-teal-500", hint: null },
                                                { label: "รูดผ่อน (Credit)", value: healthData?.totalCreditDue || 0, color: "text-amber-500", hint: null },
                                            ].map(item => (
                                                <div key={item.label} className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3">
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{item.label}</div>
                                                    {item.hint && <div className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">{item.hint}</div>}
                                                    <div className={`font-bold font-mono text-sm ${item.color}`}>
                                                        {showBalance ? `฿${fmt(item.value)}` : "****"}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {healthLoading && (
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex items-center gap-3 text-slate-400">
                                    <Loader2 size={18} className="animate-spin" />
                                    <span className="text-sm">กำลังคำนวณ DTI...</span>
                                </div>
                            )}

                            {/* ── Upcoming Payments ────────────────────── */}
                            {!healthLoading && healthData && healthData.upcoming.length > 0 && (
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                    <div className="flex items-center gap-3 p-5 border-b border-slate-100 dark:border-slate-700">
                                        <Clock size={18} className="text-slate-500" />
                                        <h3 className="font-bold text-slate-800 dark:text-white text-base">รายการที่ต้องจ่าย (เดือนนี้)</h3>
                                        <span className="ml-auto text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full font-semibold">
                                            {healthData.upcoming.length} รายการ
                                        </span>
                                    </div>

                                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {healthData.upcoming.map((item) => {
                                            const isPaid   = paidIds.has(item.id);
                                            const isPaying = payingId === item.id;
                                            const meta     = TYPE_META[item.type] || TYPE_META.bill;
                                            const Icon     = meta.icon;

                                            return (
                                                <div key={item.id} className={`flex items-center gap-4 px-5 py-4 transition-colors ${isPaid ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                                    {/* Icon */}
                                                    <div className={`p-2.5 rounded-xl shrink-0 ${meta.bg}`}>
                                                        <Icon size={18} className={meta.color} />
                                                    </div>

                                                    {/* Name / sub */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{item.name}</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{meta.label} · {item.sub}</div>
                                                    </div>

                                                    {/* Amount */}
                                                    <div className="text-right shrink-0">
                                                        <div className="font-bold font-mono text-rose-500 text-sm">
                                                            {showBalance ? `฿${fmt(item.amount)}` : "****"}
                                                        </div>
                                                    </div>

                                                    {/* Action */}
                                                    <div className="shrink-0 w-24 flex justify-end">
                                                        {isPaid ? (
                                                            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-xl">
                                                                <CheckCircle2 size={14} /> จ่ายแล้ว
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => handlePayNow(item)}
                                                                disabled={!!payingId}
                                                                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-xl transition-colors"
                                                            >
                                                                {isPaying ? (
                                                                    <><Loader2 size={13} className="animate-spin" /> กำลังจ่าย</>
                                                                ) : (
                                                                    <>จ่ายเลย</>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Footer: total */}
                                    <div className="flex justify-between items-center px-5 py-3 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700">
                                        <span className="text-xs text-slate-500 font-medium">รวมที่ต้องจ่ายเดือนนี้</span>
                                        <span className="font-bold font-mono text-rose-500 text-sm">
                                            {showBalance
                                                ? `฿${fmt(healthData.upcoming.reduce((s, i) => s + i.amount, 0))}`
                                                : "****"}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </>
                     )}
                </>
            )}

            {/* ══════════════════════════════════════════════════ */}
            {/* YEARLY TAB                                         */}
            {/* ══════════════════════════════════════════════════ */}
            {activeTab === "yearly" && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                           <BarChart2 size={20} className="text-emerald-500"/> ภาพรวมการเงินรายปี {currentYear}
                        </h3>
                        <button
                            onClick={() => setShowBalance(!showBalance)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 transition"
                        >
                            {showBalance ? <Eye size={16} /> : <EyeOff size={16} />}
                            {showBalance ? "ซ่อนตัวเลข" : "แสดงตัวเลข"}
                        </button>
                    </div>

                    {yearLoading ? <div className="p-10"><Loading /></div> :
                     yearErr    ? <div className="p-10"><ErrMsg msg={yearErr} /></div> :
                     (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                                    <tr>
                                        <th className="p-3 font-medium rounded-tl-lg">เดือน</th>
                                        <th className="p-3 font-medium text-right">รายรับรวม</th>
                                        <th className="p-3 font-medium text-right">รายจ่ายรวม</th>
                                        <th className="p-3 font-medium text-right">เงินคงเหลือ</th>
                                        <th className="p-3 font-medium w-[200px] rounded-tr-lg">สัดส่วน (รายรับ vs รายจ่าย)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {filteredYearlyData.map((d, i) => {
                                        const inc = Number(d.netIncome) || 0;
                                        const exp = Number(d.totalExpenses) || 0;
                                        const bal = Number(d.netBalance) || 0;
                                        const incPct = (inc / maxVal) * 100;
                                        const expPct = (exp / maxVal) * 100;

                                        const monthDisplay = d.payMonth ? (() => {
                                            const mNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
                                            const mi = Number(d.payMonth.split("-")[1]) - 1;
                                            return mNames[mi] || d.payMonth;
                                        })() : `เดือน ${i+1}`;

                                        return (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                                                    {d.monthName || monthDisplay}
                                                </td>
                                                <td className="p-3 text-emerald-600 dark:text-emerald-400 font-mono text-right font-medium">
                                                    ฿{inc === 0 ? "0.00" : mask(fmt(inc))}
                                                </td>
                                                <td className="p-3 text-rose-500 font-mono text-right font-medium">
                                                    ฿{exp === 0 ? "0.00" : mask(fmt(exp))}
                                                </td>
                                                <td className={`p-3 font-bold font-mono text-right ${bal >= 0 ? "text-slate-800 dark:text-white" : "text-rose-500"}`}>
                                                    ฿{bal === 0 ? "0.00" : mask(fmt(bal))}
                                                </td>
                                                <td className="p-3 align-middle w-[200px]">
                                                    <div className="flex flex-col gap-1.5 w-full">
                                                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden flex">
                                                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(incPct, 100)}%` }} />
                                                        </div>
                                                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden flex">
                                                            <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${Math.min(expPct, 100)}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredYearlyData.length === 0 && (
                                        <tr><td colSpan="5" className="p-6 text-center text-slate-400">ไม่มีข้อมูลในปีนี้</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                     )}
                </div>
            )}
        </div>
    );
}