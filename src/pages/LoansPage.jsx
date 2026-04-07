import React, { useState, useEffect, useCallback } from 'react';
import { Car, Home, Plus, Trash2, Landmark, List, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';
import { apiGet, apiPost } from "../api/gsApi";
import { fmt } from "../utils/formatters";
import { FInput } from "../components/form/FInput";
import { CustomDatePicker } from "../components/form/CustomDatePicker";

export default function LoansPage() {
  const [activeTab, setActiveTab] = useState('car');
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState([]);
  const [loadErr, setLoadErr] = useState(null);
  const [simulators, setSimulators] = useState({});
  const [lastSynced, setLastSynced] = useState(null);

  // Forms
  const [carForm, setCarForm] = useState({ name: '', company: '', totalAmount: '', monthlyInstallment: '', startDate: '', totalMonths: '', paidInstallments: '' });
  const [homeForm, setHomeForm] = useState({ name: '', bank: '', totalAmount: '', monthlyInstallment: '', startDate: '', totalMonths: '', paidInstallments: '' });

  // Alerts
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
      title: 'เกิดข้อผิดพลาด!',
      text: msg,
      icon: 'error',
      background: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#f8fafc' : '#334155'
    });
  };

  const loadData = useCallback(async () => {
    setLoadErr(null);
    const cacheKey = `loans_${activeTab}`;
    // ① Pre-load from cache for instant UI
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) { setLoans(JSON.parse(cached)); setLoading(false); }
      else setLoading(true);
    } catch { setLoading(true); }

    // ② Fetch fresh data from API
    try {
      const action = activeTab === 'car' ? "getCarLoans" : "getHomeLoans";
      const data = await apiGet({ action });
      if (data?.error) throw new Error(data.error);
      const mapped = Array.isArray(data) ? data.map(i => ({...i, type: activeTab})) : [];
      setLoans(mapped);
      try { localStorage.setItem(cacheKey, JSON.stringify(mapped)); } catch {}
      const t = new Date();
      setLastSynced(`${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}`);
    } catch (e) {
      console.error(e);
      setLoadErr(e.message || 'โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้า');
      if (!loans.length) setLoans([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAddCarLoan = async (e) => {
    e.preventDefault();
    try {
      await apiPost({ 
        action: "addLoan", 
        loan_type: "car",
        name: carForm.name,
        lender: carForm.company,
        total_amount: Number(carForm.totalAmount),
        monthly_due: Number(carForm.monthlyInstallment),
        due_day: carForm.startDate ? new Date(carForm.startDate).getDate() : 1,
        total_installments: Number(carForm.totalMonths),
        paid_installments: Number(carForm.paidInstallments) || 0,
        start_date: carForm.startDate
      });
      showSuccessAlert('เพิ่มข้อมูลสินเชื่อรถยนต์เรียบร้อยแล้ว');
      loadData();
      setCarForm({ name: '', company: '', totalAmount: '', monthlyInstallment: '', startDate: '', totalMonths: '', paidInstallments: '' });
    } catch (e) { showErrorAlert(e.message || "บันทึกไม่สำเร็จ"); }
  };

  const handleAddHomeLoan = async (e) => {
    e.preventDefault();
    try {
      await apiPost({ 
        action: "addLoan", 
        loan_type: "home",
        name: homeForm.name,
        lender: homeForm.bank,
        total_amount: Number(homeForm.totalAmount),
        monthly_due: Number(homeForm.monthlyInstallment),
        due_day: homeForm.startDate ? new Date(homeForm.startDate).getDate() : 1,
        total_installments: Number(homeForm.totalMonths),
        paid_installments: Number(homeForm.paidInstallments) || 0,
        start_date: homeForm.startDate
      });
      showSuccessAlert('เพิ่มข้อมูลสินเชื่อบ้านเรียบร้อยแล้ว');
      loadData();
      setHomeForm({ name: '', bank: '', totalAmount: '', monthlyInstallment: '', startDate: '', totalMonths: '', paidInstallments: '' });
    } catch (e) { showErrorAlert(e.message || "บันทึกไม่สำเร็จ"); }
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
      await apiPost({ action: "deleteLoan", id });
      loadData();
    } catch (e) {
      showErrorAlert("ลบไม่สำเร็จ");
    }
  };

  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all flex-1 md:flex-none ${
        activeTab === id 
          ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
      }`}
    >
      <Icon size={16} /> <span className="hidden sm:inline">{label}</span>
    </button>
  );

  const InputClass = "w-full p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-800 dark:text-slate-200 transition-colors text-sm";
  const LabelClass = "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider";

  const carLoansList = loans.filter(l => l.type === 'car');
  const homeLoansList = loans.filter(l => l.type === 'home');

  const updateSimulator = (id, field, value) => {
    setSimulators(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { rate: '', extra: '' }),
        [field]: value
      }
    }));
  };

  const renderLoanCard = (loan) => {
    let monthsPaid = parseInt(loan.paid_installments) || 0;
    if (loan.total_months && monthsPaid > loan.total_months) {
      monthsPaid = loan.total_months;
    }
    const due = parseFloat(loan.monthly_due || loan.monthly_installment) || 0;
    const paidAmount = monthsPaid * due;
    const totalAmount = parseFloat(loan.total_amount) || 0;
    const progress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
    const remaining = totalAmount - paidAmount;

    return (
      <div key={loan.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl relative group transition-all duration-200 hover:border-slate-300">
        <button onClick={() => handleDelete(loan.id)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
        <div className="font-semibold text-slate-800 dark:text-white text-lg truncate pr-8">{loan.name}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {loan.type === 'car' ? 'สถาบันการเงิน' : 'ธนาคาร'}: {loan.lender || loan.company || loan.bank || 'ไม่ระบุ'}
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-slate-500">ยอดจัดรวม</div>
            <div className="font-bold text-slate-800 dark:text-white">฿{fmt(totalAmount)}</div>
          </div>
          <div>
             <div className="text-slate-500">ค่างวด/เดือน</div>
             <div className="font-bold text-emerald-600 dark:text-emerald-400">฿{fmt(due)}</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
             <span>จ่ายแล้ว {monthsPaid}{loan.total_months ? `/${loan.total_months}` : ''} งวด (฿{fmt(paidAmount)})</span>
             <span>คงเหลือ ฿{fmt(remaining)}</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
             <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%` }}></div>
          </div>
        </div>

        {loan.type === 'home' && (
          <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">🛠 Simulator (คำนวณโปะบ้าน)</h4>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">ดอกเบี้ย/ปี (%)</label>
                <input 
                  type="number" 
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-emerald-500 transition-colors"
                  placeholder="เช่น 3.0"
                  value={simulators[loan.id]?.rate || ''}
                  onChange={(e) => updateSimulator(loan.id, 'rate', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">เงินโปะเพิ่ม (฿)</label>
                <input 
                  type="number" 
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
                  placeholder="0"
                  value={simulators[loan.id]?.extra || ''}
                  onChange={(e) => updateSimulator(loan.id, 'extra', e.target.value)}
                />
              </div>
            </div>

            {(() => {
              const rate = parseFloat(simulators[loan.id]?.rate) || 0;
              const extra = parseFloat(simulators[loan.id]?.extra) || 0;

              if (rate > 0 && remaining > 0) {
                const nextMonthInterest = remaining * ((rate / 100) / 12);
                const standardPrincipal = due - nextMonthInterest;
                
                let timeSavedText = "—";
                let interestSavedText = "—";

                if (standardPrincipal > 0 && extra > 0) {
                  const monthlyRate = (rate / 100) / 12;
                  
                  const simLoan = (principal, basePmt, extraPmt) => {
                    let bal = principal;
                    let totalInt = 0;
                    let months = 0;
                    let maxLoop = 1200;
                    const pmt = basePmt + extraPmt;
                    
                    while (bal > 0 && maxLoop > 0) {
                      const int = bal * monthlyRate;
                      totalInt += int;
                      let prin = pmt - int;
                      if (prin < 0) prin = 0; // if payment doesn't even cover interest
                      if (prin > bal) prin = bal;
                      bal -= prin;
                      months++;
                      maxLoop--;
                      if (prin === 0 && maxLoop > 0) maxLoop = 0; // infinite loop prevention
                    }
                    return { totalInt, months };
                  };

                  const std = simLoan(remaining, due, 0);
                  const ext = simLoan(remaining, due, extra);

                  const interestSaved = Math.max(0, std.totalInt - ext.totalInt);
                  const monthsSaved = Math.max(0, std.months - ext.months);

                  if (interestSaved > 0 || monthsSaved > 0) {
                    const savedY = Math.floor(monthsSaved / 12);
                    const savedM = Math.floor(monthsSaved % 12);
                    timeSavedText = savedY > 0 ? `${savedY} ปี ${savedM} เดือน` : `${savedM} เดือน`;
                    interestSavedText = `฿${fmt(interestSaved)}`;
                  }
                }

                return (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm border border-blue-100 dark:border-blue-800">
                    <div className="flex justify-between border-b border-blue-200 dark:border-blue-800 pb-1.5 mb-1.5">
                      <span className="text-slate-600 dark:text-slate-400">ดอกเบี้ยเดือนถัดไป:</span>
                      <span className="font-semibold text-rose-500">฿{fmt(nextMonthInterest)}</span>
                    </div>
                    <div className="flex justify-between border-b border-blue-200 dark:border-blue-800 pb-1.5 mb-1.5">
                      <span className="text-slate-600 dark:text-slate-400">ตัดต้นเดือนถัดไป:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">฿{fmt(standardPrincipal)}</span>
                    </div>
                    <div className="flex justify-between border-b border-blue-200 dark:border-blue-800 pb-1.5 mb-1.5">
                      <span className="text-slate-600 dark:text-slate-400">ประหยัดดอกเบี้ยได้:</span>
                      <span className="font-semibold text-amber-500">{interestSavedText}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">ผ่อนหมดไวขึ้น:</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{timeSavedText}</span>
                    </div>
                  </div>
                );
              }
              return (
                <div className="text-xs text-slate-400 dark:text-slate-500 text-center">
                  กรอกดอกเบี้ยต่อปีเพื่อดูการแตกยอด / กรอกเงินโปะเพื่อคำนวณส่วนลด
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header Area */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Loans &amp; Installments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">จัดการสินเชื่อรถยนต์และสินเชื่อบ้าน (Flat Rate &amp; Effective Rate)</p>
        </div>
        {lastSynced && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <RefreshCw size={12} className="shrink-0" />
            Synced {lastSynced}
          </div>
        )}
      </div>

      {/* Tabs Container */}
      <div className="bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl flex gap-1 overflow-x-auto border border-slate-200 dark:border-slate-800">
        <TabButton id="car" label="สินเชื่อรถ (Car Loan)" icon={Car} />
        <TabButton id="home" label="สินเชื่อบ้าน (Home Loan)" icon={Home} />
      </div>

      {/* Content Card */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm min-h-[400px]">
        {loading ? (
           <div className="text-center py-20 text-slate-400 animate-pulse">กำลังโหลดข้อมูล...</div>
        ) : loadErr ? (
           <div className="py-10 px-4"><div className="text-center text-rose-500 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-5 text-sm">{loadErr}</div></div>
        ) : (
          <>
            {/* CAR LOAN TAB */}
            {activeTab === 'car' && (
              <div className="space-y-8">
                <form onSubmit={handleAddCarLoan} className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  <div className="md:col-span-2">
                    <label className={LabelClass}>รุ่นรถ / ยี่ห้อ</label>
                    <input required type="text" value={carForm.name} onChange={e => setCarForm({...carForm, name: e.target.value})} className={InputClass} placeholder="เช่น Honda Civic RS" />
                  </div>
                  <div className="md:col-span-3">
                    <label className={LabelClass}>สถาบันการเงิน</label>
                    <input required type="text" value={carForm.company} onChange={e => setCarForm({...carForm, company: e.target.value})} className={InputClass} placeholder="เช่น กรุงศรี ออโต้" />
                  </div>
                  <div className="md:col-span-2">
                    <label className={LabelClass}>ยอดจัดรวม (฿)</label>
                    <input required type="number" value={carForm.totalAmount} onChange={e => setCarForm({...carForm, totalAmount: e.target.value})} className={InputClass} placeholder="0" />
                  </div>
                  <div className="md:col-span-2">
                    <label className={LabelClass}>ค่างวด/เดือน (฿)</label>
                    <input required type="number" value={carForm.monthlyInstallment} onChange={e => setCarForm({...carForm, monthlyInstallment: e.target.value})} className={InputClass} placeholder="0" />
                  </div>
                  <div className="md:col-span-2">
                    <CustomDatePicker required label="วันที่เริ่มผ่อนงวดแรก" value={carForm.startDate} onChange={v => setCarForm({...carForm, startDate: v})} />
                  </div>
                  <div className="md:col-span-1">
                    <label className={LabelClass}>จำนวนงวด</label>
                    <input required type="number" value={carForm.totalMonths} onChange={e => setCarForm({...carForm, totalMonths: e.target.value})} className={InputClass} placeholder="เช่น 48, 60" />
                  </div>
                  <div className="md:col-span-2">
                    <label className={LabelClass}>ชำระแล้ว (กรณีลงย้อนหลัง)</label>
                    <input type="number" min="0" value={carForm.paidInstallments} onChange={e => setCarForm({...carForm, paidInstallments: e.target.value})} className={InputClass} placeholder="ระบุ 0 หากเพิ่งเริ่มผ่อน" />
                  </div>
                  <div className="md:col-span-7 flex justify-end">
                     <button type="submit" className="w-[120px] bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors shadow-sm">
                      <Plus size={18} /> บันทึก
                    </button>
                  </div>
                </form>

                <div>
                   <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                     <List size={20}/> รายการสินเชื่อรถยนต์
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {carLoansList.map(renderLoanCard)}
                     {carLoansList.length === 0 && <div className="md:col-span-2 text-center py-10 text-slate-400">ไม่มีข้อมูลสัญญา</div>}
                   </div>
                </div>
              </div>
            )}

            {/* HOME LOAN TAB */}
            {activeTab === 'home' && (
              <div className="space-y-8">
                <form onSubmit={handleAddHomeLoan} className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  <div className="md:col-span-2">
                    <label className={LabelClass}>ชื่อบ้าน / โครงการ</label>
                    <input required type="text" value={homeForm.name} onChange={e => setHomeForm({...homeForm, name: e.target.value})} className={InputClass} placeholder="เช่น ทาวน์โฮม 2 ชั้น" />
                  </div>
                  <div className="md:col-span-3">
                    <label className={LabelClass}>ธนาคาร</label>
                    <input required type="text" value={homeForm.bank} onChange={e => setHomeForm({...homeForm, bank: e.target.value})} className={InputClass} placeholder="เช่น ธอส, SCB" />
                  </div>
                  <div className="md:col-span-2">
                    <label className={LabelClass}>วงเงินกู้ (฿)</label>
                    <input required type="number" value={homeForm.totalAmount} onChange={e => setHomeForm({...homeForm, totalAmount: e.target.value})} className={InputClass} placeholder="0" />
                  </div>
                  <div className="md:col-span-2">
                    <label className={LabelClass}>ค่างวด/เดือน (฿)</label>
                    <input required type="number" value={homeForm.monthlyInstallment} onChange={e => setHomeForm({...homeForm, monthlyInstallment: e.target.value})} className={InputClass} placeholder="0" />
                  </div>
                  <div className="md:col-span-2">
                    <CustomDatePicker required label="วันที่เริ่มผ่อนงวดแรก" value={homeForm.startDate} onChange={v => setHomeForm({...homeForm, startDate: v})} />
                  </div>
                  <div className="md:col-span-1">
                    <label className={LabelClass}>ระยะเวลา (งวด)</label>
                    <input required type="number" value={homeForm.totalMonths} onChange={e => setHomeForm({...homeForm, totalMonths: e.target.value})} className={InputClass} placeholder="เช่น 360" />
                  </div>
                  <div className="md:col-span-2">
                    <label className={LabelClass}>ชำระแล้ว (กรณีลงย้อนหลัง)</label>
                    <input type="number" min="0" value={homeForm.paidInstallments} onChange={e => setHomeForm({...homeForm, paidInstallments: e.target.value})} className={InputClass} placeholder="ระบุ 0 หากเพิ่งเริ่มผ่อน" />
                  </div>
                  <div className="md:col-span-7 flex justify-end">
                     <button type="submit" className="w-[120px] bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors shadow-sm">
                      <Plus size={18} /> บันทึก
                    </button>
                  </div>
                </form>

                <div>
                   <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                     <List size={20}/> รายการสินเชื่อบ้าน
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {homeLoansList.map(renderLoanCard)}
                     {homeLoansList.length === 0 && <div className="md:col-span-2 text-center py-10 text-slate-400">ไม่มีข้อมูลสัญญา</div>}
                   </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
