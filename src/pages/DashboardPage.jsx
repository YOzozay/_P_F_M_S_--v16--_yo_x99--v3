import React, { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, Calendar, BarChart2 } from "lucide-react";
import { apiGet } from "../api/gsApi";
import { fmt } from "../utils/formatters";
import { getPayMonth } from "../utils/dateUtils";

import { MonthPicker } from "../components/form/MonthPicker";
import { Loading } from "../components/shared/Loading";
import { ErrMsg } from "../components/shared/ErrMsg";

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState("monthly");
    const [payMonth, setPayMonth] = useState(getPayMonth() || "2024-01");
    const currentYear = new Date().getFullYear();

    // States for Monthly
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    
    // States for Yearly
    const [yearlyData, setYearlyData] = useState([]);
    const [yearLoading, setYearLoading] = useState(false);
    const [yearErr, setYearErr] = useState(null);

    const [showBalance, setShowBalance] = useState(true);

    const mask = (val) => (showBalance ? val : "****");

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

    // Yearly data filtering logic: No future months
    const now = new Date();
    const actualYear = now.getFullYear();
    const actualMonth = now.getMonth() + 1;

    const filteredYearlyData = yearlyData.filter(m => {
        if (!m.payMonth) return true; // fallback
        const [itemYear, itemMonth] = m.payMonth.split("-").map(Number);
        if (itemYear < actualYear) return true;
        if (itemYear === actualYear) return itemMonth <= actualMonth;
        return false;
    });

    // Yearly Max Income calculations for progress bar
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

            {activeTab === "monthly" && (
                <>
                    {loading ? <div className="p-10"><Loading /></div> :
                     err ? <div className="p-10"><ErrMsg msg={err} /></div> :
                     !summary ? null :
                     (
                        <>
                            <div className="flex flex-wrap items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 gap-4 shadow-sm justify-between">
                                <div className="flex items-center gap-4">
                                    <MonthPicker value={payMonth} onChange={setPayMonth} />
                                    <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700" />
                                    <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                        รอบบิล: {s.period?.startDate || "-"} ถีง {s.period?.endDate || "-"}
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

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <div className="w-32 h-32 bg-emerald-500 rounded-full blur-3xl"></div>
                                    </div>
                                    <div className="relative z-10">
                                        <h3 className="text-emerald-800 dark:text-emerald-400 font-semibold text-sm">รายรับสุทธิประเมิน (รอบปัจจุบัน)</h3>
                                        <div className="text-4xl font-bold text-slate-800 dark:text-white mt-2 font-mono">
                                            ฿ {mask(fmt(s.netIncome || 0))}
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                                            <span className="bg-white/60 dark:bg-slate-800/60 px-2 py-1 rounded">เงินเดือน: {mask(fmt(s.income?.monthlySalary || 0))}</span>
                                            <span className="bg-white/60 dark:bg-slate-800/60 px-2 py-1 rounded">+ OT/เบี้ยเลี้ยง: {mask(fmt((s.income?.otPay || 0) + (s.income?.mealNormal || 0) + (s.income?.mealOt || 0) + (s.income?.fuel || 0)))}</span>
                                            <span className="bg-white/60 dark:bg-slate-800/60 px-2 py-1 rounded text-rose-600 dark:text-rose-400">- หักลบ: {mask(fmt(s.deductions?.totalDeduction || 0))}</span>
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
                        </>
                     )}
                </>
            )}

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
                     yearErr ? <div className="p-10"><ErrMsg msg={yearErr} /></div> :
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