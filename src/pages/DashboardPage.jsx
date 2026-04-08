import React, { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, Calendar, BarChart2, Activity, CreditCard, RefreshCw, Car, Home, CheckCircle2, Loader2 } from "lucide-react";
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
    if (dti < 50) return { bar: "bg-amber-400", text: "text-amber-600 dark:text-amber-400", label: "พอใช้", ring: "ring-amber-400" };
    return { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", label: "สูง", ring: "ring-rose-500" };
}

function getSavingsColor(savingsRate) {
    if (savingsRate >= 20) return { text: "text-emerald-600 dark:text-emerald-400", label: "✅ ออมเงินได้เยี่ยม!", iconColor: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800" };
    if (savingsRate >= 10) return { text: "text-amber-600 dark:text-amber-400", label: "พอใช้", iconColor: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800" };
    return { text: "text-rose-600 dark:text-rose-400", label: "⚠️ ควรเพิ่มการออม", iconColor: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/20", border: "border-rose-200 dark:border-rose-800" };
}

// ── Upcoming item type meta ───────────────────────────────────
const TYPE_META = {
    loan_car: { icon: Car, label: "สินเชื่อรถ", color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
    loan_home: { icon: Home, label: "สินเชื่อบ้าน", color: "text-violet-500", bg: "bg-violet-100 dark:bg-violet-900/30" },
    bill: { icon: RefreshCw, label: "ค่าใช้จ่ายคงที่", color: "text-teal-500", bg: "bg-teal-100 dark:bg-teal-900/30" },
    credit: { icon: CreditCard, label: "รูดผ่อน", color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30" },
};

function PayRow({ item, paidIds, payingId, onPay }) {
    const isPaid = paidIds.has(item.id);
    const isPaying = payingId === item.id;
    const meta = TYPE_META[item.type] || TYPE_META.bill;
    const Icon = meta.icon;
    const showProgress = ['loan_car', 'loan_home', 'credit'].includes(item.type)
        && item.totalInstallments > 1;
    const pct = showProgress ? Math.min(Math.round((item.paidInstallments / item.totalInstallments) * 100), 100) : 0;

    return (
        <div className={`px-4 py-3 transition-colors ${isPaid ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${meta.bg}`}>
                    <Icon size={16} className={meta.color} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{item.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{meta.label} · {item.sub}</div>
                </div>
                <div className="text-right shrink-0">
                    <div className="font-bold font-mono text-rose-500 text-sm">฿{fmt(item.amount)}</div>
                </div>
                <div className="shrink-0 w-24 flex justify-end">
                    {isPaid ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg">
                            <CheckCircle2 size={14} /> ชำระแล้ว
                        </span>
                    ) : (
                        <button
                            onClick={() => onPay(item)}
                            disabled={!!payingId}
                            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors"
                        >
                            {isPaying ? (
                                <><Loader2 size={13} className="animate-spin" /> กำลังชำระ</>
                            ) : (
                                <>ชำระเงิน</>
                            )}
                        </button>
                    )}
                </div>
            </div>
            {showProgress && (
                <div className="mt-2 pl-11">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
                            {item.paidInstallments}/{item.totalInstallments} งวด · {pct}%
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState("monthly");
    const [payMonth, setPayMonth] = useState(getPayMonth() || "2024-01");
    const currentYear = new Date().getFullYear();

    // ── Unified State ──────────────────────────────────────
    const [summary, setSummary] = useState(null);
    const [healthData, setHealthData] = useState(null);
    const [yearlyData, setYearlyData] = useState([]);
    
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncErr, setSyncErr] = useState(null);

    // ── Pay-now tracking ─────────────────────────────────────
    const [payingId, setPayingId] = useState(null);
    const [paidIds, setPaidIds] = useState(new Set());

    const [showBalance, setShowBalance] = useState(false);
    const mask = (val) => (showBalance ? val : "****");

    // ── Last synced timestamp ─────────────────────────────────
    const [lastSynced, setLastSynced] = useState(null);
    const stampSync = () => {
        const t = new Date();
        setLastSynced(`${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`);
    };

    // ── Unified Refresh Data ─────────────────────────────────
    const refreshData = useCallback(async () => {
        setIsSyncing(true);
        setSyncErr(null);

        if (activeTab === "monthly") {
            const cacheKeySum = `dashboard_summary_${payMonth}`;
            const cacheKeyHealth = `dashboard_health_${payMonth}`;
            
            // 1. ลองโหลดจาก Cache ก่อนเพื่อความเร็ว (Stale-While-Revalidate)
            try {
                const cSum = localStorage.getItem(cacheKeySum);
                const cHealth = localStorage.getItem(cacheKeyHealth);
                if (cSum) setSummary(JSON.parse(cSum));
                if (cHealth) setHealthData(JSON.parse(cHealth));
            } catch {}

            try {
                const res = await apiGet({ action: "getDashboardData", payMonth });

                if (res.error) throw new Error(res.error);

                const { 
                    summary: sumRes, 
                    carLoans: carLoansArr, 
                    homeLoans: homeLoansArr, 
                    fixedList: fixedBillsArr, 
                    installments: installmentsArr 
                } = res;

                // จัดการข้อมูล Summary
                setSummary(sumRes);
                localStorage.setItem(cacheKeySum, JSON.stringify(sumRes));

                // จัดการข้อมูล Health / Debt
                const cars = Array.isArray(carLoansArr) ? carLoansArr : [];
                const homes = Array.isArray(homeLoansArr) ? homeLoansArr : [];
                const bills = Array.isArray(fixedBillsArr) ? fixedBillsArr : [];
                const rawInst = Array.isArray(installmentsArr) ? installmentsArr : [];

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
                ).filter(g => g.months > 1);

                const totalLoanDue = [...cars, ...homes].reduce((s, l) => s + (parseFloat(l.monthly_due || l.monthly_installment) || 0), 0);
                const totalBillDue = bills.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
                const totalCreditDue = instGroups.reduce((s, g) => s + (parseFloat(g.monthly_due) || 0), 0);
                const totalDebt = totalLoanDue + totalBillDue + totalCreditDue;

                const upcoming = [];
                cars.forEach(l => upcoming.push({
                    id: `car_${l.id}`, rawId: l.id, type: "loan_car",
                    name: l.name, sub: l.lender || l.company || "ไม่ระบุ",
                    amount: parseFloat(l.monthly_due || l.monthly_installment) || 0,
                    action: "payLoan",
                    paidInstallments: parseInt(l.paid_installments) || 0,
                    totalInstallments: parseInt(l.total_installments) || 0,
                }));
                homes.forEach(l => upcoming.push({
                    id: `home_${l.id}`, rawId: l.id, type: "loan_home",
                    name: l.name, sub: l.lender || l.bank || "ไม่ระบุ",
                    amount: parseFloat(l.monthly_due || l.monthly_installment) || 0,
                    action: "payLoan",
                    paidInstallments: parseInt(l.paid_installments) || 0,
                    totalInstallments: parseInt(l.total_installments) || 0,
                }));
                bills.forEach(b => upcoming.push({
                    id: `bill_${b.id}`, rawId: b.id, type: "bill",
                    name: b.name, sub: `เริ่ม ${b.start_date || "—"}`,
                    amount: parseFloat(b.amount) || 0,
                    action: "payFixedExpense",
                }));
                instGroups.forEach(g => {
                    const unpaidInst = g.installments.find(i => i.status === "unpaid");
                    if (unpaidInst) {
                        const paidCount = g.installments.filter(i => i.status === 'paid').length;
                        upcoming.push({
                            id: `credit_${g.id}`, rawId: unpaidInst.id, type: "credit",
                            name: g.itemName, sub: `บัตร ${g.cardName} • ${g.months} ด.`,
                            amount: parseFloat(g.monthly_due) || 0,
                            action: "payInstallment",
                            paidInstallments: paidCount,
                            totalInstallments: g.months,
                        });
                    }
                });

                const hData = { totalDebt, totalLoanDue, totalBillDue, totalCreditDue, upcoming };
                setHealthData(hData);
                localStorage.setItem(cacheKeyHealth, JSON.stringify(hData));
                
                stampSync();
            } catch (e) {
                setSyncErr(e.message);
                console.error("Dashboard monthly sync error:", e);
            }
        } else {
            // Yearly Tab
            try {
                const data = await apiGet({ action: "yearSummary", year: currentYear.toString() });
                if (data.error) throw new Error(data.error);
                setYearlyData(Array.isArray(data) ? data : []);
                stampSync();
            } catch (e) {
                setSyncErr(e.message);
            }
        }
        setIsSyncing(false);
    }, [payMonth, activeTab, currentYear]);

    useEffect(() => { refreshData(); }, [refreshData]);

    // ── Pay Now handler ───────────────────────────────────────
    const handlePayNow = async (item) => {
        const isDark = document.documentElement.classList.contains('dark');
        const result = await Swal.fire({
            title: 'ยืนยันการชำระเงิน?',
            html: `<div style="text-align:left;font-size:14px">
                <b>${item.name}</b><br/>
                <span style="color:#64748b">${item.sub}</span><br/><br/>
                จำนวน: <b style="color:#ef4444">฿${fmt(item.amount)}</b>
            </div>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#64748b',
            confirmButtonText: '✓ ยืนยัน ชำระเงิน',
            cancelButtonText: 'ยกเลิก',
            background: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#f8fafc' : '#334155'
        });
        if (!result.isConfirmed) return;

        setPayingId(item.id);
        try {
            const payload = { action: item.action, id: item.rawId, payMonth, amount: item.amount };
            
            if (item.type === "loan_car") payload.loan_type = "car_loan";
            if (item.type === "loan_home") payload.loan_type = "home_loan";
            
            if (payload.action === "payInstallment") {
                payload.action = "payCreditInstallment";
                payload.installment_id = payload.id;
            }
            if (payload.action === "payFixedExpense") {
                payload.name = item.name;
            }

            const res = await apiPost(payload);
            if (res?.error) throw new Error(res.error);
            setPaidIds(prev => new Set([...prev, item.id]));
            Swal.fire({
                title: 'บันทึกการชำระสำเร็จ!', text: `ชำระ ${item.name} เรียบร้อยแล้ว`,
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

    // ── Derived values ────────────────────────────────────────
    const grossMonthlyIncome = summary?.income?.grossIncome || summary?.income?.totalGross || 0;
    const totalDebt = healthData?.totalDebt || 0;
    const dtiPct = grossMonthlyIncome > 0 ? (totalDebt / grossMonthlyIncome) * 100 : 0;
    const dtiStyle = getDtiColor(dtiPct);
    const netIncome = summary?.netIncome || 0;

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

    // ── Dynamic Burden & Savings ──────────────────────────────
    const unpaidItems = healthData?.upcoming?.filter(i => !paidIds.has(i.id)) || [];
    const unpaidBurden = unpaidItems.reduce((acc, curr) => acc + curr.amount, 0);
    const finalSurplus = netIncome - unpaidBurden;
    const savingsRate = netIncome > 0 ? Math.max(0, (finalSurplus / netIncome) * 100) : 0;
    const savingsStyle = getSavingsColor(savingsRate);

    // ── Category card helper ──────────────────────────────────
    const renderCategory = (title, iconComponent, types, countBadgeColor) => {
        if (!healthData) return null;
        const items = healthData.upcoming.filter(i => types.includes(i.type));
        const catUnpaidSum = items.filter(i => !paidIds.has(i.id)).reduce((acc, curr) => acc + curr.amount, 0);

        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-6">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/20">
                    <div className="flex items-center gap-3">
                        {iconComponent}
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm">{title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded shadow-sm border ${countBadgeColor} bg-white dark:bg-slate-800 text-slate-500`}>
                            {items.length} รายการ
                        </span>
                    </div>
                    <div className="font-bold font-mono text-rose-500 text-sm">฿{fmt(catUnpaidSum)}</div>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {items.map(item => (
                        <PayRow key={item.id} item={item} paidIds={paidIds} payingId={payingId} onPay={handlePayNow} />
                    ))}
                    {items.length === 0 && (
                        <div className="p-4 text-center text-sm text-slate-400">ไม่มีรายการ</div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard Overview</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">สรุปข้อมูลการเงินแบบ Real-time</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={refreshData}
                        disabled={isSyncing}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 rounded-xl text-sm font-bold text-emerald-600 dark:text-emerald-400 transition shadow-sm border border-emerald-100 dark:border-emerald-800"
                    >
                        <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                        {isSyncing ? "Syncing..." : "Sync Data"}
                    </button>
                    <button
                        onClick={() => setShowBalance(!showBalance)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 transition shadow-sm"
                    >
                        {showBalance ? <Eye size={16} /> : <EyeOff size={16} />}
                        {showBalance ? "ซ่อนยอดเงิน" : "แสดงยอดเงิน"}
                    </button>
                </div>
            </div>

            {/* ── Tabs ─────────────────────────────────────────── */}
            <div className="bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl flex gap-1 overflow-x-auto border border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => setActiveTab('monthly')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl font-semibold text-sm transition-all flex-1 md:flex-none ${activeTab === 'monthly'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                >
                    <Calendar size={16} /> สรุปรายเดือน
                </button>
                <button
                    onClick={() => setActiveTab('yearly')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl font-semibold text-sm transition-all flex-1 md:flex-none ${activeTab === 'yearly'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                >
                    <BarChart2 size={16} /> สรุปรายปี ({currentYear})
                </button>
            </div>

            {syncErr && <ErrMsg msg={syncErr} />}

            {/* ═══════════════ CONTENT AREA ═══════════════ */}
            {activeTab === "monthly" ? (
                <>
                    {/* Monthly Main Content */}
                    {isSyncing && !summary ? (
                        <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <Loader2 size={40} className="text-emerald-500 animate-spin mb-4" />
                            <div className="text-slate-500 font-medium animate-pulse">กำลังรวบรวมข้อมูลรายเดือน...</div>
                        </div>
                    ) : !summary ? (
                        <div className="py-20 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                             ไม่พบข้อมูลสรุปรายเดือน
                        </div>
                    ) : (
                        <>
                            {/* ── Month Picker Bar ─── */}
                            <div className="flex flex-wrap items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 gap-4 shadow-sm">
                                <MonthPicker value={payMonth} onChange={setPayMonth} />
                                <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                                <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                    รอบบิล: {summary.period?.startDate || "—"} ถึง {summary.period?.endDate || "—"}
                                </div>
                                {lastSynced && (
                                    <div className="ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                                        Synced at {lastSynced}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-6">
                                {/* ══ LEFT COLUMN ══ */}
                                <div className="lg:col-span-5 flex flex-col gap-4">
                                    {/* Balance Sheet Summary Card */}
                                    <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
                                        <h3 className="font-bold text-slate-800 dark:text-white text-base mb-5 flex items-center gap-2">
                                            <Activity size={18} className="text-blue-500" /> สรุปการเงินรอบปัจจุบัน
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-base text-slate-600 dark:text-slate-400 font-semibold">รายได้รวม (ก่อนหัก)</span>
                                                <span className="text-base font-bold font-mono text-slate-800 dark:text-slate-200">฿{mask(fmt(grossMonthlyIncome))}</span>
                                            </div>
                                            <div className="flex justify-between items-baseline pb-4 border-b border-slate-200 dark:border-slate-700/60">
                                                <span className="text-base text-slate-500 dark:text-slate-400 font-semibold">หักลบ (กยศ. / ปกส. / ฯลฯ)</span>
                                                <span className="text-base font-bold font-mono text-rose-500">- ฿{fmt(summary.deductions?.totalDeduction || 0)}</span>
                                            </div>
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-lg text-slate-800 dark:text-slate-200 font-bold">รายได้สุทธิ (หลังหัก)</span>
                                                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">฿{mask(fmt(summary.netIncome || 0))}</span>
                                            </div>
                                            <div className="flex justify-between items-baseline pb-4 border-b border-slate-200 dark:border-slate-700/60">
                                                <span className="text-base text-slate-500 dark:text-slate-400 font-semibold">ภาระที่ยังไม่ชำระเดือนนี้</span>
                                                <span className="text-base font-bold font-mono text-rose-500">- ฿{fmt(unpaidBurden)}</span>
                                            </div>
                                            <div className="pt-1">
                                                {finalSurplus < 0 ? (
                                                    <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border-2 border-rose-200 dark:border-rose-700/50 text-center sm:text-left">
                                                        <div className="text-base font-bold text-rose-600 dark:text-rose-400 mb-1.5 uppercase tracking-tight">🚨 ยอดที่ต้องจัดสรรเพิ่ม</div>
                                                        <div className="text-3xl font-black font-mono text-rose-500">฿{mask(fmt(Math.abs(finalSurplus)))}</div>
                                                    </div>
                                                ) : (
                                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border-2 border-emerald-200 dark:border-emerald-700/50 text-center sm:text-left">
                                                        <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 uppercase tracking-tight">✅ สรุปยอดคงเหลือสุทธิ</div>
                                                        <div className="text-3xl font-black font-mono text-emerald-500">฿{mask(fmt(finalSurplus))}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Financial Health Card */}
                                    {healthData && grossMonthlyIncome > 0 && (
                                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 overflow-hidden relative">
                                            <div className={`absolute top-0 right-0 rounded-bl-2xl px-4 py-2 flex items-center gap-2 ${savingsStyle.bg} ${savingsStyle.border} border-b border-l`}>
                                                <div className="text-[10px] font-bold text-slate-500 uppercase">Savings</div>
                                                <div className={`font-mono font-bold ${savingsStyle.text}`}>{savingsRate.toFixed(1)}%</div>
                                            </div>
                                            <div className="flex items-center gap-3 mb-6 mt-2">
                                                <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-xl shrink-0">
                                                    <Activity size={20} className="text-violet-500" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800 dark:text-white text-base">สุขภาพการเงิน (DTI)</h3>
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Debt-to-Income Index</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col sm:flex-row gap-6 items-center">
                                                <div className="flex flex-col items-center justify-center shrink-0">
                                                    <div className={`relative w-24 h-24 rounded-full ring-4 ${dtiStyle.ring} ring-offset-2 ring-offset-white dark:ring-offset-slate-800 flex items-center justify-center flex-col bg-slate-50 dark:bg-slate-900/50`}>
                                                        <span className={`text-xl font-black font-mono ${dtiStyle.text}`}>{dtiPct.toFixed(1)}%</span>
                                                        <span className={`text-[10px] font-bold ${dtiStyle.text}`}>{dtiStyle.label}</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1 w-full grid grid-cols-2 gap-2">
                                                    {[
                                                        { label: "รายได้รวม", value: mask(fmt(grossMonthlyIncome)), color: "text-emerald-600" },
                                                        { label: "หนี้รวม/เดือน", value: fmt(totalDebt), color: "text-rose-500" },
                                                        { label: "สินเชื่อรถ/บ้าน", value: fmt(healthData.totalLoanDue || 0), color: "text-blue-500" },
                                                        { label: "ค่าใช้จ่ายคงที่", value: fmt(healthData.totalBillDue || 0), color: "text-teal-500" },
                                                        { label: "ผ่อน/บัตร", value: fmt(healthData.totalCreditDue || 0), color: "text-amber-500" },
                                                    ].map(item => (
                                                        <div key={item.label} className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3">
                                                            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">{item.label}</div>
                                                            <div className={`font-bold font-mono text-xs ${item.color}`}>฿{item.value}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ══ RIGHT COLUMN ══ */}
                                <div className="lg:col-span-7 space-y-4">
                                    {healthData ? (
                                        <>
                                            {renderCategory("ภาระหนี้สินผ่อนชำระ", <Home size={18} className="text-violet-500" />, ["loan_car", "loan_home"], "border-slate-200 dark:border-slate-700")}
                                            {renderCategory("รายการผ่อนชำระ & บัตรเครดิต", <CreditCard size={18} className="text-amber-500" />, ["credit"], "border-slate-200 dark:border-slate-700")}
                                            {renderCategory("ค่าใช้จ่ายคงที่ (Fixed)", <RefreshCw size={18} className="text-teal-500" />, ["bill"], "border-slate-200 dark:border-slate-700")}
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center p-20 text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200">
                                            <Loader2 size={24} className="animate-spin mr-2" /> กำลังตรวจสอบรายการชำระ...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </>
            ) : (
                /* ═══════════════ YEARLY TAB CONTENT ═══════════════ */
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                            <BarChart2 size={20} className="text-emerald-500" /> สรุปผลการดำเนินงานรายปี {currentYear}
                        </h3>
                    </div>

                    {isSyncing && yearlyData.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center">
                            <Loader2 size={40} className="text-emerald-500 animate-spin mb-4" />
                            <div className="text-slate-500 font-medium animate-pulse">กำลังคำนวณสัดส่วนรายปี...</div>
                        </div>
                    ) : yearlyData.length === 0 ? (
                        <div className="py-20 text-center text-slate-400">ยังไม่มีข้อมูลสำหรับปี {currentYear}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                                    <tr>
                                        <th className="p-4 font-bold uppercase tracking-wider text-[10px] rounded-tl-xl">เดือน</th>
                                        <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-right">รายรับสุทธิ</th>
                                        <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-right">รายจ่ายรวม</th>
                                        <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-right">เงินคงเหลือ</th>
                                        <th className="p-4 font-bold uppercase tracking-wider text-[10px] w-[200px] rounded-tr-xl">สัดส่วนรายรับ vs รายจ่าย</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {filteredYearlyData.map((d, i) => {
                                        const inc = Number(d.netIncome) || 0;
                                        const exp = Number(d.totalExpenses) || 0;
                                        const bal = Number(d.netBalance) || 0;
                                        const maxRow = Math.max(inc, exp);
                                        const incPct = (inc / maxVal) * 100;
                                        const expPct = (exp / maxVal) * 100;

                                        const mNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
                                        const monthStr = d.payMonth ? mNames[Number(d.payMonth.split("-")[1]) - 1] : "—";

                                        return (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="p-4 font-bold text-slate-700 dark:text-slate-300">{monthStr}</td>
                                                <td className="p-4 text-emerald-600 font-mono text-right font-bold">฿{inc === 0 ? "0" : mask(fmt(inc))}</td>
                                                <td className="p-4 text-rose-500 font-mono text-right font-bold">฿{exp === 0 ? "0" : mask(fmt(exp))}</td>
                                                <td className={`p-4 font-black font-mono text-right ${bal >= 0 ? "text-slate-800 dark:text-white" : "text-rose-500"}`}>
                                                    ฿{bal === 0 ? "0" : mask(fmt(bal))}
                                                </td>
                                                <td className="p-4 w-[200px]">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                                            <div className="bg-emerald-500 h-full transition-all duration-700" style={{ width: `${incPct}%` }} />
                                                        </div>
                                                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                                            <div className="bg-rose-500 h-full transition-all duration-700" style={{ width: `${expPct}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}