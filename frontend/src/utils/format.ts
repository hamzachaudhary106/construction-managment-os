/**
 * Format number as Pakistani Rupees (Rs).
 * Uses comma for thousands and two decimal places.
 */
export function formatRs(value: number | string): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(n)) return 'Rs 0.00';
  return `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
