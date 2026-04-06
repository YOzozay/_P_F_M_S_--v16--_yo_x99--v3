import React, { useState, useEffect, useCallback } from 'react';
import { Car, Home, Plus, Trash2, Landmark, List } from 'lucide-react';
import Swal from 'sweetalert2';
import { apiGet, apiPost } from "../api/gsApi";
import { fmt } from "../utils/formatters";
import { FInput } from "../components/form/FInput";

export default function LoansPage() {
  const [activeTab, setActiveTab] = useState('car');
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState([]);

  // Forms
  const [carForm, setCarForm] = useState({ name: '', company: '', totalAmount: '', monthlyInstallment: '', startDate: '', totalMonths: '' });
  const [homeForm, setHomeForm] = useState({ name: '', bank: '', totalAmount: '', monthlyInstallment: '', startDate: '', totalMonths: '' });

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
    setLoading(true);
    try {
      const action = activeTab === 'car' ? "getCarLoans" : "getHomeLoans";
      const data = await apiGet({ action });
      const mapped = Array.isArray(data) ? data.map(i => ({...i, type: activeTab})) : [];
      setLoans(mapped);
    } catch (e) {
      console.error(e);
      // Fallback if API not fully supported or fails
      setLoans([]);
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
        paid_installments: 0,
        start_date: carForm.startDate
      });
      showSuccessAlert('เพิ่มข้อมูลสินเชื่อรถยนต์เรียบร้อยแล้ว');
      loadData();
      setCarForm({ name: '', company: '', totalAmount: '', monthlyInstallment: '', startDate: '', totalMonths: '' });
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
        paid_installments: 0,
        start_date: homeForm.startDate
      });
      showSuccessAlert('เพิ่มข้อมูลสินเชื่อบ้านเรียบร้อยแล้ว');
      loadData();
      setHomeForm({ name: '', bank: '', totalAmount: '', monthlyInstallment: '', startDate: '', totalMonths: '' });
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

  const renderLoanCard = (loan) => {
    let monthsPaid = 0;
    if (loan.start_date) {
      const start = new Date(loan.start_date);
      const now = new Date();
      monthsPaid = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      if (now.getDate() >= start.getDate()) {
        monthsPaid += 1; // Include current month if passed the start date day
      }
      if (monthsPaid < 0) monthsPaid = 0;
      if (loan.total_months && monthsPaid > loan.total_months) monthsPaid = loan.total_months;
    }
    const due = parseFloat(loan.monthly_due || loan.monthly_installment) || 0;
    const paidAmount = monthsPaid * due;
    const totalAmount = parseFloat(loan.total_amount) || 0;
    const progress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
    const remaining = totalAmount - paidAmount;

    return (
      <div key={loan.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl relative group transition-all duration-200 hover:border-slate-300">
        <button onClick={() => handleDelete(loan.id)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
        <div className="font-semibold text-slate-800 dark:text-white text-lg">{loan.name}</div>
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
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header Area */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Loans & Installments</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">จัดการสินเชื่อรถยนต์และสินเชื่อบ้าน (Flat Rate & Effective Rate)</p>
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
        ) : (
          <>
            {/* CAR LOAN TAB */}
            {activeTab === 'car' && (
              <div className="space-y-8">
                <form onSubmit={handleAddCarLoan} className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="md:col-span-2">
                    <label className={LabelClass}>รุ่นรถ / ยี่ห้อ</label>
                    <input required type="text" value={carForm.name} onChange={e => setCarForm({...carForm, name: e.target.value})} className={InputClass} placeholder="เช่น Honda Civic RS" />
                  </div>
                  <div className="md:col-span-2">
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
                    <label className={LabelClass}>วันที่เริ่มชำระงวดแรก</label>
                    <input required type="date" value={carForm.startDate} onChange={e => setCarForm({...carForm, startDate: e.target.value})} className={InputClass} />
                  </div>
                  <div className="md:col-span-1">
                    <label className={LabelClass}>จำนวนงวดทั้งหมด</label>
                    <input required type="number" value={carForm.totalMonths} onChange={e => setCarForm({...carForm, totalMonths: e.target.value})} className={InputClass} placeholder="เช่น 48, 60" />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                     <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors">
                      <Plus size={18} />
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
                <form onSubmit={handleAddHomeLoan} className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="md:col-span-2">
                    <label className={LabelClass}>ชื่อบ้าน / โครงการ</label>
                    <input required type="text" value={homeForm.name} onChange={e => setHomeForm({...homeForm, name: e.target.value})} className={InputClass} placeholder="เช่น ทาวน์โฮม 2 ชั้น" />
                  </div>
                  <div className="md:col-span-2">
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
                    <label className={LabelClass}>วันที่เริ่มชำระงวดแรก</label>
                    <input required type="date" value={homeForm.startDate} onChange={e => setHomeForm({...homeForm, startDate: e.target.value})} className={InputClass} />
                  </div>
                  <div className="md:col-span-1">
                    <label className={LabelClass}>ระยะเวลา (งวด)</label>
                    <input required type="number" value={homeForm.totalMonths} onChange={e => setHomeForm({...homeForm, totalMonths: e.target.value})} className={InputClass} placeholder="เช่น 360" />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                     <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors">
                      <Plus size={18} />
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
