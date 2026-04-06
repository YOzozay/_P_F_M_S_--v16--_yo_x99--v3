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
  
    // OTTrackerPage stores logs as { holiday_hours, ot15, ot3 } — map each correctly
    otLogs.forEach(log => {
      // x1.0 holiday hours
      const holidayHours = Number(log.holiday_hours) || 0;
      if (holidayHours > 0) {
        otPay += holidayHours * hourlyRate * 1.0;
        if (holidayHours >= otMealThreshold) otDaysCount++;
      }

      // x1.5 OT evening hours
      const ot15Hours = Number(log.ot15 || log.ot_evening_1_5x) || 0;
      if (ot15Hours > 0) {
        otPay += ot15Hours * hourlyRate * 1.5;
        if (ot15Hours >= otMealThreshold) otDaysCount++;
      }

      // x3.0 OT holiday evening hours
      const ot3Hours = Number(log.ot3 || log.ot_evening_3x) || 0;
      if (ot3Hours > 0) {
        otPay += ot3Hours * hourlyRate * 3.0;
        if (ot3Hours >= otMealThreshold) otDaysCount++;
      }
    });
  
    // 4. คำนวณเบี้ยเลี้ยง
    const mealNormal = workingDays * mealNormalRate;
    const mealOT = otDaysCount * mealOtRate;
    const fuel = workingDays * fuelRate;
  
    // 5. รวมสวัสดิการทั้งหมด (ก่อนหักลบ)
    const totalAllowances = mealNormal + mealOT + fuel;

    // 6. สรุปรายได้รวมก่อนหักลบ (True Gross)
    //    Gross = Base Salary + OT Pay + All Welfare/Allowances
    const grossIncome = salary + otPay + totalAllowances;
  
    // 7. การหักลบ (Deductions)
    //    Social Security คำนวณจาก Base Salary (ไม่รวม OT / เบี้ยเลี้ยง) สูงสุด 750 บาท
    const socialSecurityBase = Math.min(salary, ssMaxBase) * ssRate;
    const socialSecurity = Math.min(750, socialSecurityBase);
    const totalDeductions = socialSecurity + studentLoan;

    // 8. รายได้สุทธิ (Net) = Gross - Deductions
    const netIncome = grossIncome - totalDeductions;
  
    return {
      hourlyRate,
      otPay,
      mealNormal,
      mealOT,
      fuel,
      totalAllowances,  // mealNormal + mealOT + fuel
      grossIncome,       // salary + otPay + totalAllowances  (True Gross, pre-deduction)
      socialSecurity,    // หัก ประกันสังคม (from base salary only)
      studentLoan,       // หัก กยศ. (fixed)
      totalDeductions,   // socialSecurity + studentLoan
      netIncome,         // grossIncome - totalDeductions
    };
  }