import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';

// Icons ลบ Eye, EyeOff ออกเพราะย้ายไปจัดการใน DashboardPage แล้ว
import { LayoutDashboard, Wallet, CreditCard, Landmark, Sun, Moon, Activity, Menu, X } from 'lucide-react';

// นำเข้าหน้า (Pages) ต่างๆ
import DashboardPage from './pages/DashboardPage';
import OTTrackerPage from './pages/OTTrackerPage';
import CombinedCreditPage from './pages/CombinedCreditPage';
import LoansPage from './pages/LoansPage';

// --- Component: เมนูด้านซ้าย (Sidebar Link) ---
const SidebarLink = ({ to, icon: Icon, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick} // เพื่อให้ปิดเมนูอัตโนมัติเวลากดในมือถือ
      className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all ${isActive
        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-r-4 border-emerald-500'
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
    >
      <Icon size={18} className={isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'} />
      {label}
    </Link>
  );
};

export default function App() {
  // State สำหรับควบคุม Responsive และ Dark Mode
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // สลับโหมด Dark/Light
  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);

    if (nextMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <Router>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">

        {/* ========================================== */}
        {/* OVERLAY สำหรับมือถือ (พื้นหลังดำๆ เวลาเปิดเมนู) */}
        {/* ========================================== */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* ========================================== */}
        {/* SIDEBAR */}
        {/* ========================================== */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
          {/* Logo Area */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                <span className="text-xl">💰</span> FinanceOS
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">Personal Finance</p>
            </div>
            {/* ปุ่มปิดเมนูบนมือถือ */}
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400">
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
            <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" onClick={() => setIsSidebarOpen(false)} />
            <SidebarLink to="/ot" icon={Wallet} label="OT & Income" onClick={() => setIsSidebarOpen(false)} />
            <SidebarLink to="/debts" icon={CreditCard} label="Credit & Debts" onClick={() => setIsSidebarOpen(false)} />
            <SidebarLink to="/loans" icon={Landmark} label="Loans (รถ & บ้าน)" onClick={() => setIsSidebarOpen(false)} />
          </nav>

          {/* Bottom Area (Settings / Status) */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            {/* ปุ่ม Toggle Dark Mode */}
            <button
              onClick={toggleDarkMode}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <div className="flex items-center gap-2">
                {isDarkMode ? <Moon size={16} className="text-indigo-400" /> : <Sun size={16} className="text-amber-500" />}
                {isDarkMode ? 'Dark Mode' : 'Light Mode'}
              </div>
              <div className={`w-8 h-4 rounded-full border shadow-inner flex items-center p-0.5 transition-colors ${isDarkMode ? 'bg-indigo-500 border-indigo-600' : 'bg-white border-slate-300'}`}>
                <div className={`w-3 h-3 rounded-full transition-transform ${isDarkMode ? 'bg-white translate-x-4' : 'bg-slate-400 translate-x-0'}`}></div>
              </div>
            </button>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">FinanceOS</p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-500 flex items-center gap-1 mt-1">
                <Activity size={10} /> Connected · Sheets
              </p>
            </div>
          </div>
        </aside>

        {/* ========================================== */}
        {/* MAIN CONTENT */}
        {/* ========================================== */}
        <main className="flex-1 flex flex-col overflow-hidden w-full">

          {/* Top Header */}
          <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 shrink-0">
            <div className="flex items-center gap-3">
              {/* ปุ่ม Hamburger (แสดงเฉพาะมือถือ) */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                <Menu size={20} />
              </button>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white hidden sm:block">
                  <Routes>
                    <Route path="/" element="Dashboard Overview" />
                    <Route path="/ot" element="OT & Income" />
                    <Route path="/debts" element="Credit & Debts" />
                    <Route path="/loans" element="Loans & Installments" />
                  </Routes>
                </h2>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white sm:hidden">
                  FinanceOS
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-md text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="hidden sm:inline">Live Sync</span>
              <span className="sm:hidden">Live</span>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
              <Routes>
                {/* เสียบ Component หน้าต่างๆ ที่เราเขียนแยกไฟล์ไว้เข้ามาใช้งาน */}
                <Route path="/" element={<DashboardPage />} />
                <Route path="/ot" element={<OTTrackerPage />} />
                <Route path="/debts" element={<CombinedCreditPage />} />

                {/* หน้า Loans ที่กำลังจะทำใน Phase ต่อไป */}
                <Route path="/loans" element={<LoansPage />} />
              </Routes>
            </div>
          </div>

        </main>
      </div>
    </Router>
  );
}