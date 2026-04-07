# 🚀 FinanceOS

**FinanceOS** คือแอปพลิเคชันจัดการการเงินส่วนบุคคลแบบ Full-stack ที่ออกแบบมาเพื่อช่วยให้คุณควบคุมรายได้ หนี้สิน และวิเคราะห์สุขภาพทางการเงินได้อย่างแม่นยำในที่เดียว โดยเชื่อมต่อข้อมูลเรียลไทม์กับ Google Sheets

---

## 🛠 Tech Stack

- **Frontend:** [React (Vite)](https://reactjs.org/), [Tailwind CSS](https://tailwindcss.com/)
- **Icons & UI:** [Lucide React](https://lucide.dev/), [SweetAlert2](https://sweetalert2.github.io/), [Framer Motion](https://www.framer.com/motion/)
- **Backend:** [Google Apps Script](https://developers.google.com/apps-script) (Web App)
- **Database:** [Google Sheets](https://www.google.com/sheets/about/) (Cloud Storage)

---

## ✨ ฟีเจอร์เด่น (Key Features)

- **📊 Dashboard & DTI:** แสดงผลรายได้สุทธิ ภาระหนี้รายเดือน และเกจวัดสุขภาพการเงิน (**Debt-to-Income Ratio**) แบบเรียลไทม์ พร้อมระบบวิเคราะห์สถานะการเงินอัตโนมัติ
- **⏱️ OT & Salary Tracking:** คำนวณรายได้จากฐานเงินเดือนและชั่วโมง OT (1.5x, 3x) อัตโนมัติตามกฎบริษัทและฐานภาษีที่ตั้งค่าไว้
- **🏦 Loan & Installment Management:** ระบบจัดการหนี้รถ หนี้บ้าน และการผ่อนชำระผ่านบัตรเครดิต พร้อมแถบแสดงความคืบหน้า (Progress Bar)
- **📅 Backdated History:** รองรับการลงข้อมูลย้อนหลัง (Paid Installments) โดยระบบจะสร้างประวัติการจ่ายเงินและตัดยอดหนี้คงเหลือให้อัตโนมัติเพื่อให้ข้อมูลแม่นยำที่สุด
- **📱 Responsive Design:** ออกแบบด้วยหลัก Mobile-first รองรับการแสดงผลทุกหน้าจอ ไม่ว่าจะเป็นสมาร์ทโฟน แท็บเล็ต หรือคอมพิวเตอร์

---

## 📂 โครงสร้างโปรเจกต์ (File Structure)

- `src/` : โค้ดส่วนหน้าบ้าน (Frontend) ทั้งหมด รวมถึง Components, Pages และ Logic การแสดงผล
- `GS.txt` : โค้ดส่วนหลังบ้าน (Backend) สำหรับรันบน Google Apps Script เพื่อจัดการรับ-ส่งข้อมูลกับ Google Sheets

---

## 🚀 การติดตั้งเบื้องต้น (Quick Start)

### 1. เครื่องมือที่ต้องมี
- [Node.js](https://nodejs.org/) (เวอร์ชันล่าสุด)
- บัญชี Google (สำหรับใช้งาน Google Sheets & Web App Deployment)

### 2. ขั้นตอนการติดตั้ง
```bash
# 1. Clone โปรเจกต์
git clone https://github.com/your-username/finance-os.git

# 2. เข้าไปยัง Folder
cd finance-os

# 3. ติดตั้ง Dependencies
npm install

# 4. รันโปรเจกต์ (Local Development)
npm run dev
```

### 3. การตั้งค่า Backend
- คัดลอกโค้ดจาก `GS.txt` ไปวางในโครงการ [Google Apps Script](https://script.google.com/)
- ทำการ **Deploy** เป็น Web App และนำ URL ที่ได้มาใส่ในไฟล์ `src/api/gsApi.js`

---

## 📝 บันทึกเพิ่มเติม
FinanceOS เน้นความเรียบง่ายแต่ทรงพลัง โดยใช้ฟอนต์ **'Prompt'** สำหรับภาษาไทยเพื่อความเป็นสากล และ **'Inter'** สำหรับตัวเลขเพื่อให้ข้อมูลอ่านง่ายและชัดเจนที่สุด

---
**พัฒนาโดยทีม Advanced Agentic Coding - Google Deepmind**
