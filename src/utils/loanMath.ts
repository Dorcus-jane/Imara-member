// Flat interest, as in the design: "Interest · 12% flat".
// Example: UGX 200,000 at 12% flat over 12 months -> interest 24,000, total 224,000, monthly 18,667.
export function loanTotals(amount: number, ratePercent: number, termMonths: number) {
  const interest = amount * (ratePercent / 100);
  const total = amount + interest;
  const monthly = termMonths > 0 ? Math.round(total / termMonths) : total;
  return { interest, total, monthly };
}
