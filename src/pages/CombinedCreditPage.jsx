import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Calendar, ShoppingCart, RefreshCw, Plus, Trash2, FileText, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { apiGet, apiPost } from "../api/gsApi";
import { fmt } from "../utils/formatters";
import { FInput } from "../components/form/FInput";
import { CustomDatePicker } from "../components/form/CustomDatePicker";
import { CustomSelect } from "../components/form/CustomSelect";
import { FormField } from "../components/form/FormField";
export default function CombinedCreditPage() {
  const [activeTab, setActiveTab] = useState('cards');
  const [loading, setLoading] = useState(true);

  // --- State สำหรับเก็บข้อมูลจาก API ---
  const [cards, setCards] = useState([]);
  const [statements, setStatements] = useState({});
  const [selectedCard, setSelectedCard] = useState(null);
  const [recurringBills, setRecurringBills] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [fullPayments, setFullPayments] = useState([]);
  const [selectedInstallment, setSelectedInstallment] = useState(null);

  // --- State สำหรับ Form ---
  const [cardForm, setCardForm] = useState({ name: '', credit_limit: '', closing_day: '', due_day: '' });
  const [billForm, setBillForm] = useState({ name: '', amount: '', startDate: '' });
  const [installmentForm, setInstallmentForm] = useState({ date: '', cardId: '', itemName: '', totalAmount: '', months: '', paid_installments: '' });
  const [fullPaymentForm, setFullPaymentForm] = useState({ date: '', cardId: '', itemName: '', amount: '' });

  // --- Helpers สำหรับ Alert ---
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

  // --- API Connections ---
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [cData, fData, iData] = await Promise.all([
        apiGet({ action: "getCreditSummary" }),
        apiGet({ action: "getFixedList" }),
        apiGet({ action: "getInstallments" })
      ]);

      // 1. จัดการข้อมูลบัตร
      setCards(Array.isArray(cData) ? cData.filter(c => c.name && String(c.name).trim() !== "") : []);

      // 2. จัดการบิลประจำ
      setRecurringBills(Array.isArray(fData) ? fData : []);

      // 3. จัดการรายการผ่อน & รูดเต็ม
      const rawInst = Array.isArray(iData) ? iData : [];
      const groups = Object.values(rawInst.reduce((acc, inst) => {
        const txId = inst.transaction_id;
        if (!acc[txId]) {
          acc[txId] = {
            id: txId,
            itemName: inst.description,
            cardName: inst.card_name,
            cardId: inst.card_id,
            months: parseInt(inst.months) || 1,
            totalAmount: parseFloat(inst.total_amount) || 0,
            installments: []
          };
        }
        acc[txId].installments.push(inst);
        return acc;
      }, {}));

      // เรียงงวดให้ถูกต้อง
      groups.forEach(g => g.installments.sort((a, b) => a.installment_no - b.installment_no));

      // แยก "รูดผ่อน" (>1 เดือน) และ "รูดเต็ม" (<=1 เดือน)
      setInstallments(groups.filter(g => g.months > 1));
      setFullPayments(groups.filter(g => g.months <= 1));

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  // --- Handlers สำหรับ Form ---
  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!cardForm.name || !cardForm.credit_limit) return;
    try {
      await apiPost({ action: "createCreditCard", ...cardForm });
      showSuccessAlert('เพิ่มบัตรเครดิตเรียบร้อยแล้ว');
      loadAllData();
      setCardForm({ name: '', credit_limit: '', closing_day: '', due_day: '' });
    } catch (e) { showErrorAlert(e.message || "สร้างบัตรไม่สำเร็จ"); }
  };

  const handleAddBill = async (e) => {
    e.preventDefault();
    try {
      await apiPost({ action: "addFixedExpense", name: billForm.name, amount: billForm.amount, start_date: billForm.startDate });
      showSuccessAlert('เพิ่มค่าใช้จ่ายคงที่เรียบร้อยแล้ว');
      loadAllData();
      setBillForm({ name: '', amount: '', startDate: '' });
    } catch (e) { showErrorAlert(e.message || "สร้างค่าใช้จ่ายคงที่ไม่สำเร็จ"); }
  };

  const handleAddInstallment = async (e) => {
    e.preventDefault();
    try {
      await apiPost({ 
        action: "createCreditTransaction", 
        card_id: installmentForm.cardId, 
        description: installmentForm.itemName, 
        amount: installmentForm.totalAmount, 
        transaction_date: installmentForm.date, 
        installment_months: installmentForm.months,
        paid_installments: Number(installmentForm.paid_installments) || 0
      });
      showSuccessAlert('บันทึกรายการผ่อนเรียบร้อยแล้ว');
      loadAllData();
      setInstallmentForm({ date: '', cardId: '', itemName: '', totalAmount: '', months: '', paid_installments: '' });
    } catch (e) { showErrorAlert(e.message || "บันทึกไม่สำเร็จ"); }
  };

  const handleAddFullPayment = async (e) => {
    e.preventDefault();
    try {
      await apiPost({ 
        action: "createCreditTransaction", 
        card_id: fullPaymentForm.cardId, 
        description: fullPaymentForm.itemName, 
        amount: fullPaymentForm.amount, 
        transaction_date: fullPaymentForm.date, 
        installment_months: 0 
      });
      showSuccessAlert('บันทึกรายการรูดเต็มเรียบร้อยแล้ว');
      loadAllData();
      setFullPaymentForm({ date: '', cardId: '', itemName: '', amount: '' });
    } catch (e) { showErrorAlert(e.message || "บันทึกไม่สำเร็จ"); }
  };

  const handleDelete = async (type, id) => {
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
      if (type === 'bill') await apiPost({ action: "deleteFixedExpense", id });
      if (type === 'inst' || type === 'full') await apiPost({ action: "cancelCreditTransaction", transaction_id: id });
      loadAllData();
    } catch (e) {
      showErrorAlert("ลบไม่สำเร็จ");
    }
  };

  const toggleStatement = async (cardId) => {
    if (selectedCard === cardId) { setSelectedCard(null); return; }
    setSelectedCard(cardId);
    if (!statements[cardId]) {
      const now = new Date();
      const stmt = await apiGet({ action: "getCreditStatement", card_id: cardId, year: now.getFullYear(), month: now.getMonth() + 1 });
      setStatements((p) => ({ ...p, [cardId]: stmt }));
    }
  };

  // --- UI Components ---
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

  const InputClass = "w-full p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-800 dark:text-slate-200 transition-colors text-sm";
  const LabelClass = "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider";

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header Area */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Credit & Debts</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">จัดการบัตรเครดิต ค่าใช้จ่ายคงที่ รูดเต็ม และคำนวณวันจ่ายอัตโนมัติ</p>
      </div>

      {/* Tabs Container */}
      <div className="bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl flex gap-1 overflow-x-auto border border-slate-200 dark:border-slate-800">
        <TabButton id="cards" label="จัดการบัตร" icon={CreditCard} />
        <TabButton id="recurring" label="ค่าใช้จ่ายคงที่" icon={RefreshCw} />
        <TabButton id="installments" label="รูดผ่อน" icon={Calendar} />
        <TabButton id="full" label="รูดเต็ม" icon={ShoppingCart} />
      </div>

      {/* Content Card */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm min-h-[400px]">
        
        {loading && activeTab !== 'cards' ? (
           <div className="text-center py-20 text-slate-400 animate-pulse">กำลังโหลดข้อมูล...</div>
        ) : (
          <>
            {/* --- Tab 1: จัดการบัตรเครดิต --- */}
            {activeTab === 'cards' && (
              <div className="space-y-8">
                <form onSubmit={handleAddCard} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <FInput required label="ชื่อบัตร" type="text" value={cardForm.name} onChange={v => setCardForm({...cardForm, name: v})} placeholder="เช่น KTC, UOB" />
                  </div>
                  <div>
                    <FInput required label="วงเงิน (฿)" type="number" value={cardForm.credit_limit} onChange={v => setCardForm({...cardForm, credit_limit: v})} placeholder="0" />
                  </div>
                  <div>
                    <FInput required label="วันตัดรอบบิล" type="number" min="1" max="31" value={cardForm.closing_day} onChange={v => setCardForm({...cardForm, closing_day: v})} placeholder="วันที่" />
                  </div>
                  <div>
                    <FInput required label="วันกำหนดจ่าย" type="number" min="1" max="31" value={cardForm.due_day} onChange={v => setCardForm({...cardForm, due_day: v})} placeholder="วันที่" />
                  </div>
                  <div className="md:col-span-4 flex items-end justify-end">
                    <button type="submit" className="w-full md:w-auto h-[42px] bg-emerald-500 hover:bg-emerald-600 text-white px-6 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors">
                      <Plus size={18} /> เพิ่มบัตร
                    </button>
                  </div>
                </form>

                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <CreditCard size={16}/> บัตรของคุณ ({cards.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cards.map(card => {
                      const util = Number(card.utilization_percent) || 0;
                      const isHigh = util > 75;
                      const isMed = util > 50 && util <= 75;
                      const colorBg = isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500';
                      const colorText = isHigh ? 'text-rose-500' : isMed ? 'text-amber-500' : 'text-emerald-500';
                      const active = selectedCard === card.card_id;
                      const stmt = statements[card.card_id];

                      return (
                        <div key={card.card_id} className={`p-4 bg-slate-50 dark:bg-slate-800/50 border rounded-xl relative group transition-all duration-200 ${active ? 'border-blue-400 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                          <button onClick={() => {
                              const isDark = document.documentElement.classList.contains('dark');
                              Swal.fire({ title: 'กำลังพัฒนา', text: 'ระบบลบบัตรกำลังอยู่ระหว่างพัฒนา', icon: 'info', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#334155' });
                            }} className="absolute top-3 right-3 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                          <div className="font-semibold text-slate-800 dark:text-white text-lg">{card.name}</div>
                          
                          <div className="mt-2 flex justify-between items-end text-xs text-slate-500 dark:text-slate-400 space-y-1">
                            <div className="space-y-1">
                              <div className="flex gap-2"><span>ตัดรอบ:</span> <span className="font-medium text-slate-700 dark:text-slate-300">วันที่ {card.closing_day}</span></div>
                              <div className="flex gap-2"><span>จ่ายเงิน:</span> <span className="font-medium text-rose-500 dark:text-rose-400">วันที่ {card.due_day}</span></div>
                            </div>
                            <div className="text-right">
                              <div className={`font-mono font-bold text-lg ${colorText}`}>{util.toFixed(1)}%</div>
                            </div>
                          </div>

                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1 mt-3 overflow-hidden">
                            <div className={`${colorBg} h-1 rounded-full`} style={{ width: `${Math.min(util, 100)}%` }}></div>
                          </div>

                          <div className="mt-4 flex justify-between items-center">
                            <span className="text-xs text-slate-500">Due: <span className="text-rose-500">{card.next_due_date || "—"}</span></span>
                            <button onClick={() => toggleStatement(card.card_id)} className="flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded">
                              <FileText size={14} /> {active ? 'ปิด Statement' : 'ดูยอดบิล'}
                            </button>
                          </div>

                          {active && (
                            <div className="mt-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                              {!stmt ? <div className="text-center text-slate-400">กำลังโหลด...</div>
                                : stmt.error ? <div className="text-center text-rose-500">{stmt.error}</div>
                                : (
                                  <div className="space-y-1.5">
                                    <div className="text-blue-500 font-bold uppercase mb-1">ยอดบิลล่าสุด</div>
                                    <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-700 pb-1"><span className="text-slate-500">ครบกำหนด</span><span className="font-medium text-rose-500">{stmt.due_date}</span></div>
                                    <div className="flex justify-between pt-1"><span className="text-slate-500">ยอดที่ต้องชำระ</span><span className="font-mono font-bold text-sm text-rose-500">฿{fmt(stmt.statement_total)}</span></div>
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* --- Tab 2: บิลประจำ --- */}
            {activeTab === 'recurring' && (
              <div className="space-y-8">
                <form onSubmit={handleAddBill} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2">
                    <FInput required label="ชื่อบิล" type="text" value={billForm.name} onChange={v => setBillForm({...billForm, name: v})} placeholder="เช่น ค่าเน็ตบ้าน, Netflix" />
                  </div>
                  <div>
                    <FInput required label="จำนวนเงิน (บาท)" type="number" value={billForm.amount} onChange={v => setBillForm({...billForm, amount: v})} placeholder="0" />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <CustomDatePicker required label="วันที่เริ่มรอบบิล" value={billForm.startDate} onChange={v => setBillForm({...billForm, startDate: v})} />
                    </div>
                    <button type="submit" className="h-[42px] px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center transition-colors">
                      <Plus size={20} />
                    </button>
                  </div>
                </form>

                <div className="space-y-3">
                  {recurringBills.map(bill => (
                    <div key={bill.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl"><RefreshCw size={18}/></div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{bill.name}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="font-bold text-rose-500">฿{parseFloat(bill.amount).toLocaleString()}</div>
                          <div className="text-[10px] text-slate-500">เริ่ม: {bill.start_date}</div>
                        </div>
                        <button onClick={() => handleDelete('bill', bill.id)} className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                  {recurringBills.length === 0 && <div className="text-center p-6 text-slate-400 text-sm">ยังไม่มีบิลประจำ</div>}
                </div>
              </div>
            )}

            {/* --- Tab 3: รูดผ่อนสินค้า --- */}
            {activeTab === 'installments' && (
              <div className="space-y-6">
                 <form onSubmit={handleAddInstallment} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                  <div>
                    <CustomDatePicker required label="วันที่รูด" value={installmentForm.date} onChange={v => setInstallmentForm({...installmentForm, date: v})} />
                  </div>
                  <div>
                    <FormField label="เลือกบัตร" required>
                      <CustomSelect 
                        value={installmentForm.cardId} 
                        onChange={v => setInstallmentForm({...installmentForm, cardId: v})} 
                        options={[{value: "", label: "-- เลือกบัตร --"}, ...cards.map(c => ({value: c.card_id, label: c.name}))]} 
                      />
                    </FormField>
                  </div>
                  <div className="md:col-span-3">
                    <FInput required label="ชื่อรายการสินค้า" type="text" value={installmentForm.itemName} onChange={v => setInstallmentForm({...installmentForm, itemName: v})} placeholder="เช่น iPhone 15 Pro" />
                  </div>
                  <div className="md:col-span-2">
                    <FInput required label="ยอดรวมทั้งหมด (บาท)" type="number" value={installmentForm.totalAmount} onChange={v => setInstallmentForm({...installmentForm, totalAmount: v})} />
                  </div>
                  <div className="md:col-span-2">
                    <FInput required label="จำนวนเดือนที่ผ่อน" type="number" min="2" value={installmentForm.months} onChange={v => setInstallmentForm({...installmentForm, months: v})} />
                  </div>
                  <div className="md:col-span-1">
                    <FInput label="ชำระแล้ว (งวด)" type="number" min="0" value={installmentForm.paid_installments} onChange={v => setInstallmentForm({...installmentForm, paid_installments: v})} placeholder="เช่น 0" tooltip="ระบุจำนวนงวดที่ชำระไปแล้ว หากเป็นการบันทึกย้อนหลัง" />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <button type="submit" className="w-full h-[42px] bg-emerald-500 hover:bg-emerald-600 text-white p-2.5 rounded-xl text-sm font-semibold transition">บันทึก</button>
                  </div>
                </form>

                {/* Installment Grid */}
                <div className="mt-8">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <ShoppingCart size={20} className="text-emerald-500" /> รายการผ่อนชำระบัตรเครดิต
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {installments.map(item => {
                      const cName = cards.find(c => String(c.card_id) === String(item.cardId))?.name || item.cardName;
                      const paidCount = item.installments.filter(i => i.status === 'paid').length;
                      const totalMonths = item.months;
                      const progressPct = totalMonths === 0 ? 0 : Math.min((paidCount / totalMonths) * 100, 100);
                      const monthAmount = parseFloat(item.installments[0]?.amount || 0);

                      return (
                        <div 
                          key={item.id} 
                          onClick={() => setSelectedInstallment(item)}
                          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-emerald-500/50"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-500 transition-colors line-clamp-1">{item.itemName}</h4>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 whitespace-nowrap ml-2">
                              {cName}
                            </span>
                          </div>
                          
                          <div className="font-bold font-mono text-xl text-amber-500 mb-1.5">
                            ฿{fmt(monthAmount)}
                          </div>
                          
                          <div className="flex flex-col gap-1.5 mt-2">
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                            </div>
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 text-right">
                              ชำระมาแล้ว {paidCount}/{totalMonths} เดือน
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {installments.length === 0 && (
                      <div className="md:col-span-2 text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
                        ยังไม่มีรายการผ่อนชำระ
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* --- Tab 4: รูดเต็มจำนวน --- */}
            {activeTab === 'full' && (
              <div className="space-y-6">
                <form onSubmit={handleAddFullPayment} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                  <div>
                    <CustomDatePicker required label="วันที่รูด" value={fullPaymentForm.date} onChange={v => setFullPaymentForm({...fullPaymentForm, date: v})} />
                  </div>
                  <div>
                    <FormField label="เลือกบัตร" required>
                      <CustomSelect 
                        value={fullPaymentForm.cardId} 
                        onChange={v => setFullPaymentForm({...fullPaymentForm, cardId: v})} 
                        options={[{value: "", label: "-- เลือกบัตร --"}, ...cards.map(c => ({value: c.card_id, label: c.name}))]} 
                      />
                    </FormField>
                  </div>
                  <div className="md:col-span-2">
                    <FInput required label="ชื่อรายการ" type="text" value={fullPaymentForm.itemName} onChange={v => setFullPaymentForm({...fullPaymentForm, itemName: v})} placeholder="เช่น เติมน้ำมัน, กินเลี้ยง" />
                  </div>
                  <div className="flex gap-2 items-end md:col-span-1">
                    <div className="flex-1">
                      <FInput required label="จำนวนเงิน" type="number" value={fullPaymentForm.amount} onChange={v => setFullPaymentForm({...fullPaymentForm, amount: v})} />
                    </div>
                    <button type="submit" className="h-[42px] px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center transition"><Plus size={20}/></button>
                  </div>
                </form>

                <div className="space-y-3">
                  {fullPayments.map(item => (
                    <div key={item.id} className="flex flex-col md:flex-row justify-between md:items-center p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl border-l-4 border-l-emerald-500 group">
                      <div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{item.itemName}</span>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex gap-2">
                          <span className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">รูดเมื่อ: {item.installments[0]?.transaction_date || "—"}</span>
                          <span className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">บัตร: {cards.find(c => String(c.card_id) === String(item.cardId))?.name || item.cardName}</span>
                        </div>
                      </div>
                      <div className="text-left md:text-right mt-3 md:mt-0 flex md:flex-col items-center md:items-end justify-between gap-4">
                        <div className="font-bold text-rose-500 text-lg">฿{parseFloat(item.totalAmount).toLocaleString()}</div>
                        <div className="flex items-center gap-3">
                          <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded">
                            รอจ่ายรอบบิล: {item.installments[0]?.due_date}
                          </div>
                          <button onClick={() => handleDelete('full', item.id)} className="text-slate-400 hover:text-rose-500 opacity-0 md:group-hover:opacity-100 transition"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {fullPayments.length === 0 && <div className="text-center p-6 text-slate-400 text-sm">ยังไม่มีรายการรูดเต็ม</div>}
                </div>
              </div>
            )}

          </>
        )}
      </div>

      {/* Installment Detail Modal */}
      {selectedInstallment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white line-clamp-1">{selectedInstallment.itemName}</h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  บัตร {cards.find(c => String(c.card_id) === String(selectedInstallment.cardId))?.name || selectedInstallment.cardName}
                </div>
              </div>
              <button 
                onClick={() => setSelectedInstallment(null)}
                className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content body */}
            <div className="p-4 space-y-4">
              {/* Stats Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                  <div className="text-[10px] uppercase font-bold text-indigo-500/80 dark:text-indigo-400 mb-1">ยอดเต็มทั้งหมด</div>
                  <div className="font-mono font-bold text-indigo-700 dark:text-indigo-300 text-lg">฿{fmt(selectedInstallment.totalAmount)}</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-100 dark:border-amber-800/50">
                  <div className="text-[10px] uppercase font-bold text-amber-500/80 dark:text-amber-400 mb-1">ยอดผ่อน / เดือน</div>
                  <div className="font-mono font-bold text-amber-600 dark:text-amber-400 text-lg">฿{fmt(selectedInstallment.installments[0]?.amount || 0)}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 col-span-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">อัตราดอกเบี้ย:</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/50">0%</span>
                </div>
              </div>

              {/* Installment Schedule */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 border-l-4 border-emerald-500 pl-2">ตารางงวด ({selectedInstallment.months} เดือน)</h4>
                <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
                  {selectedInstallment.installments.map((inst, idx) => {
                    const isPaid = inst.status === 'paid';
                    return (
                      <div key={inst.id || idx} className={`flex items-center justify-between p-3 rounded-xl border ${isPaid ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700/50 opacity-70' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex flex-col items-center justify-center text-xs font-bold ${isPaid ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                            {inst.installment_no}
                          </div>
                          <div className="text-sm font-medium text-slate-600 dark:text-slate-300 font-mono">
                            {inst.due_date || "—"}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`font-mono font-bold text-sm ${isPaid ? 'text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                            ฿{fmt(inst.amount)}
                          </div>
                          {isPaid ? (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 px-2 py-1 flex items-center justify-center rounded-full whitespace-nowrap min-w-[65px]">ชำระแล้ว</span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 px-2 py-1 flex items-center justify-center rounded-full whitespace-nowrap min-w-[65px]">รอชำระ</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer with Delete Action */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button 
                onClick={() => {
                  setSelectedInstallment(null); // Close modal first
                  handleDelete('inst', selectedInstallment.id);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl text-sm font-bold transition-colors shadow-sm"
              >
                <Trash2 size={16} /> ลบรายการ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}