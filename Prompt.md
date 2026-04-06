Task: Create the Loans Page (Phase 3)
Please create the `src/pages/LoansPage.jsx` file.

Requirements:
1. UI/UX: Use the same Tailwind layout style as `CombinedCreditPage.jsx` (Use Tabs or distinct sections for Car Loans and Home Loans).
2. Car Loans Section (Flat Rate):
   - Input fields: Car Name/Model, Finance Company, Total Loan Amount, Monthly Installment (Flat Rate), Start Date, Total Months.
3. Home Loans Section (Effective Rate):
   - Input fields: Home/Property Name, Bank, Total Loan Amount, Monthly Installment, Start Date, Total Months.
4. Functionality: 
   - Add ability to save new loans using `apiPost` (action: "addLoan").
   - Display a list of active loans fetched via `apiGet` (action: "getLoans").
   - Include a progress bar for each loan showing how much has been paid vs remaining.
   - Use `sweetalert2` for success/error alerts.

Please generate the complete, self-contained code for `LoansPage.jsx`.  