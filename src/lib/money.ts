// Consistent, robust currency and money utility for PKR / Rs.

/**
 * Format numeric amount to PKR currency representation: "Rs. 1,450"
 */
export function formatMoney(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return 'Rs. 0';
  }
  const num = Math.round(Number(amount) * 100) / 100;
  // Format with commas, no decimals for integers, 2 decimals if fraction
  const hasDecimals = num % 1 !== 0;
  const formatted = num.toLocaleString('en-PK', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `Rs. ${formatted}`;
}

/**
 * Format without currency prefix: "1,450"
 */
export function formatNumber(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '0';
  }
  const num = Math.round(Number(amount) * 100) / 100;
  const hasDecimals = num % 1 !== 0;
  return num.toLocaleString('en-PK', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse input string or value safely into 2-decimal rounded number
 */
export function parseMoney(val: any): number {
  if (typeof val === 'number') {
    return Math.round(val * 100) / 100;
  }
  if (!val) return 0;
  const clean = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100) / 100;
}

/**
 * Safe addition to prevent float issues
 */
export function addMoney(...amounts: number[]): number {
  const sumCents = amounts.reduce((acc, curr) => acc + Math.round((curr || 0) * 100), 0);
  return sumCents / 100;
}

/**
 * Safe subtraction
 */
export function subtractMoney(base: number, ...subtractions: number[]): number {
  let cents = Math.round((base || 0) * 100);
  for (const s of subtractions) {
    cents -= Math.round((s || 0) * 100);
  }
  return cents / 100;
}

/**
 * Safe multiplication
 */
export function multiplyMoney(amount: number, factor: number): number {
  return Math.round(amount * factor * 100) / 100;
}

/**
 * Calculate rounding adjustment (round to nearest whole rupee if rounding is enabled)
 */
export function calculateRounding(amount: number, enabled: boolean): { roundedTotal: number; roundingAmount: number } {
  if (!enabled) {
    return { roundedTotal: amount, roundingAmount: 0 };
  }
  const roundedTotal = Math.round(amount);
  const roundingAmount = subtractMoney(roundedTotal, amount);
  return { roundedTotal, roundingAmount };
}
