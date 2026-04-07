📑 FinanceOS: Project Master Context (สถานะปัจจุบัน)
Project Overview:
แอปพลิเคชันจัดการการเงินส่วนบุคคลแบบ Full-stack โดยใช้ React (Vite) เป็น Frontend และ Google Apps Script (GAS) เป็น Backend โดยใช้ Google Sheets เป็นฐานข้อมูล

Tech Stack:

Frontend: React, Tailwind CSS, Lucide Icons, SweetAlert2, Framer Motion.

Backend: Google Apps Script (ไฟล์ GS.txt), Web App Deployment.

Database: Google Sheets (Sheets: expenses, work_logs, credit_installments, loans, system_config, etc.)

Key Features & Logic (Updated):

OT & Income Calculation: คำนวณจาก work_logs โดยใช้ฐานเงินเดือนล่าสุดจาก salary_history และตัวคูณจาก system_config.

Financial Health (DTI): คำนวณภาระหนี้รวมต่อเดือน (debtBreakdown) ประกอบด้วย สินเชื่อรถ/บ้าน, ผ่อนบัตรเครดิต และบิลประจำ เทียบกับรายได้รวม (grossIncome).

Backdated History Support: * ฟังก์ชัน addLoan และ createCreditTransaction รองรับฟิลด์ paid_installments.

เมื่อระบุจำนวนงวดที่จ่ายแล้ว ระบบจะสร้างแถวสถานะ paid ในชีตประวัติ และลงบันทึกในชีต expenses ย้อนหลังให้อัตโนมัติเพื่อให้ยอดคงเหลือแม่นยำ.

Responsive Dashboard: การ์ด DTI รองรับการแสดงผลแบบ Mobile-first (Stack layout) เมื่อหน้าจอแคบลงเพื่อไม่ให้ UI ทับซ้อนกัน.

Data Structure Reference (Backend):

grossIncome = Salary + OT + Allowances.

netIncome = Gross Income - (Social Security + Taxes/Student Loan).

netBalance = Net Income - Total Monthly Debt - Variable Expenses.

debtBreakdown = { loans, credits, fixed, totalDebt, dti }.

UI Guidelines:

Fonts: 'Prompt' (Thai), 'Inter' (Numbers/English).

Theme: Dark Mode (Slate/Emerald), Glassmorphism effect.

Components: การ์ดต้องมีเงา (Shadow) และขอบมน (Rounded-2xl), ปุ่มใช้ Hover effect เสมอ.