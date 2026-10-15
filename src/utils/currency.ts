import { fxService } from '../services/fxService';

/**
 * Multi-Currency Utilities, Rates, and Formatting
 * Supports USD, EUR, GBP, LKR, JPY, INR, AUD, CAD, SGD, AED, CNY
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  rateToUSD: number; // 1 USD = X Currency
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, rateToUSD: 1.0 },
  { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, rateToUSD: 0.92 },
  { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2, rateToUSD: 0.79 },
  { code: 'LKR', symbol: 'Rs.', name: 'Sri Lanka Rupee', decimals: 2, rateToUSD: 305.0 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2, rateToUSD: 86.5 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0, rateToUSD: 154.0 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2, rateToUSD: 1.54 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2, rateToUSD: 1.39 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2, rateToUSD: 1.35 },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', decimals: 2, rateToUSD: 3.67 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimals: 2, rateToUSD: 7.24 }
];

export const DEFAULT_CURRENCY_CODE = 'USD';

/**
 * Get active selected currency code from storage
 */
export function getStoredCurrency(): string {
  try {
    const saved = localStorage.getItem('fxtt_active_currency');
    if (saved && SUPPORTED_CURRENCIES.some((c) => c.code === saved)) {
      return saved;
    }
  } catch (e) {
    // Ignore storage errors
  }
  return DEFAULT_CURRENCY_CODE;
}

/**
 * Update and persist active currency, notifying all listeners
 */
export function setStoredCurrency(code: string): void {
  try {
    const valid = SUPPORTED_CURRENCIES.find((c) => c.code === code);
    const targetCode = valid ? valid.code : DEFAULT_CURRENCY_CODE;
    localStorage.setItem('fxtt_active_currency', targetCode);
    window.dispatchEvent(new CustomEvent('fxtt-currency-changed', { detail: { currency: targetCode } }));
  } catch (e) {
    // Ignore storage errors
  }
}

/**
 * Get currency configuration by code, enriched with live mid-market rate
 */
export function getCurrencyInfo(code?: string): CurrencyConfig {
  const target = (code || getStoredCurrency()).toUpperCase();
  const base =
    SUPPORTED_CURRENCIES.find((c) => c.code.toUpperCase() === target) ||
    SUPPORTED_CURRENCIES[0];

  // Overlay live mid-market rate if available
  const live = fxService.getRate(base.code);
  if (live) {
    return {
      ...base,
      rateToUSD: live.rateToUSD
    };
  }
  return base;
}

/**
 * Format a number into the specified or active currency
 */
export function formatCurrency(
  amount: number | undefined | null,
  currencyCode?: string | {
    currency?: string;
    showCode?: boolean;
    compact?: boolean;
    includeDecimals?: boolean;
  },
  options?: {
    showCode?: boolean;
    compact?: boolean;
    includeDecimals?: boolean;
  } | boolean
): string {
  let targetCurrency: string | undefined;
  let opts: { showCode?: boolean; compact?: boolean; includeDecimals?: boolean } | undefined;

  if (typeof currencyCode === 'object' && currencyCode !== null) {
    targetCurrency = currencyCode.currency;
    opts = currencyCode;
  } else if (typeof currencyCode === 'string') {
    targetCurrency = currencyCode;
    opts = typeof options === 'boolean' ? { includeDecimals: options } : options;
  } else {
    opts = typeof options === 'boolean' ? { includeDecimals: options } : options;
  }

  const curr = getCurrencyInfo(targetCurrency);
  if (amount === undefined || amount === null || isNaN(amount)) {
    return opts?.showCode ? `${curr.code} 0` : `${curr.symbol} 0`;
  }

  const num = Number(amount);
  const defaultDecimals = curr.decimals;
  const includeDecimals =
    opts?.includeDecimals ??
    (defaultDecimals === 0 ? false : opts?.compact ? num % 1 !== 0 : true);

  const decimals = includeDecimals ? defaultDecimals : 0;

  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  if (opts?.showCode) {
    return `${curr.code} ${formatted}`;
  }

  // Handle spacing for symbols like "Rs." or "AED " vs "$"
  const space = curr.symbol.length > 1 ? ' ' : '';
  return `${curr.symbol}${space}${formatted}`;
}

/**
 * Backward compatibility alias for Sri Lankan Rupees formatting
 */
export function formatLKR(
  amount: number | undefined | null,
  options?: {
    showCode?: boolean;
    compact?: boolean;
    includeDecimals?: boolean;
  } | boolean
): string {
  return formatCurrency(amount, 'LKR', options);
}

export const CURRENCY_CODE = 'USD';
export const CURRENCY_SYMBOL = '$';
export const CURRENCY_NAME = 'US Dollar';
export const CURRENCY_LOCAL_SYMBOL = '$';

/**
 * Convert value between currencies based on live mid-market exchange rate table
 */
export function convertCurrency(
  amount: number,
  fromCode: string,
  toCode: string
): number {
  if (isNaN(amount) || amount === 0) return 0;
  if (!fromCode || !toCode || fromCode.toUpperCase() === toCode.toUpperCase()) return amount;
  return fxService.convert(amount, fromCode, toCode);
}

/**
 * Convert an item's rate when its currency is manually switched
 * e.g., if converting $10 USD to LKR, this calculates 10 * 305.25 = 3052.5 LKR
 */
export function convertItemRate(
  unitCost: number,
  fromCurrency: string = 'USD',
  toCurrency: string = 'USD'
): { convertedRate: number; rateToUSD: number } {
  if (isNaN(unitCost)) return { convertedRate: 0, rateToUSD: 1 };
  const converted = convertCurrency(unitCost, fromCurrency, toCurrency);
  const info = getCurrencyInfo(toCurrency);
  return {
    convertedRate: Number(converted.toFixed(info.decimals > 0 ? 2 : 0)),
    rateToUSD: info.rateToUSD
  };
}

/**
 * Parse a currency string or raw input into a valid number
 */
export function parseCurrency(input: string | number | undefined | null): number {
  if (typeof input === 'number') return isNaN(input) ? 0 : input;
  if (!input) return 0;
  const clean = String(input).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

