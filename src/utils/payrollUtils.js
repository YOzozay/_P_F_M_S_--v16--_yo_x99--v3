/**
 * คำนวณรายได้ทั้งหมดตามสูตร FinanceOS
 * @param {Object} config - การตั้งค่าต่างๆ (เงินเดือน, เรทประกันสังคม, ฯลฯ)
 * @param {Array} otLogs - ประวัติการทำ OT ในรอบบิลนั้น
 * @param {Number} workingDays - จำนวนวันทำงานจริงในรอบบิลนั้น
 */
export function calculatePayroll(config, otLogs, workingDays = 22) {
    // 1. ดึงค่า Config (หรือใช้ค่า Default ถ้าไม่มี)
    const salary = Number(config.salary) || 0;
    const divisorDays = Number(config.salary_divisor_days) || 30;
    const hoursPerDay = Number(config.work_hours_per_day) || 8;
    
    const mealNormalRate = Number(config.meal_normal_per_day) || 0;
    const mealOtRate = Number(config.meal_ot_per_day) || 0;
    const otMealThreshold = Number(config.ot_meal_threshold_hours) || 3;
    const fuelRate = Number(config.fuel_per_day) || 0;
    
    const ssMaxBase = Number(config.social_security_max_base) || 15000;
    const ssRate = Number(config.social_security_rate) || 0.05; // 5%
    const studentLoan = Number(config.student_loan_fixed) || 0;
  
    // 2. คำนวณอัตราค่าจ้างรายชั่วโมง
    const hourlyRate = (salary / divisorDays) / hoursPerDay;
  
    // 3. คำนวณ OT
    let otPay = 0;
    let otDaysCount = 0; // จำนวนวันที่มีการทำ OT ถึงเกณฑ์ได้ค่าข้าว
  
    // สมมติว่า otLogs คือ Array ของ { date, multiplier, hours }
    otLogs.forEach(log => {
      const hours = Number(log.hours) || 0;
      const mult = Number(log.multiplier) || 1; // 1, 1.5, 3
      
      otPay += (hours * hourlyRate * mult);
      
      if (hours >= otMealThreshold) {
        otDaysCount++;
      }
    });
  
    // 4. คำนวณเบี้ยเลี้ยง
    const mealNormal = workingDays * mealNormalRate;
    const mealOT = otDaysCount * mealOtRate;
    const fuel = workingDays * fuelRate;
  
    // 5. สรุปรายได้รวม (Gross)
    const grossIncome = salary + otPay + mealNormal + mealOT + fuel;
  
    // 6. การหักลบ (Deductions)
    const socialSecurity = Math.min(salary, ssMaxBase) * ssRate;
    
    // 7. รายได้สุทธิ (Net)
    const netIncome = grossIncome - socialSecurity - studentLoan;
  
    return {
      hourlyRate,
      otPay,
      mealNormal,
      mealOT,
      fuel,
      grossIncome,
      socialSecurity,
      studentLoan,
      netIncome
    };
  }