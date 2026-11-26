export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  label: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', label: 'USD ($)' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', label: 'NGN (₦)' },
  { code: 'EUR', symbol: '€', name: 'Euro', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound', label: 'GBP (£)' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', label: 'CAD (C$)' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', label: 'AUD (A$)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', label: 'JPY (¥)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', label: 'INR (₹)' },
  { code: 'AED', symbol: 'AED', name: 'Emirati Dirham', label: 'AED (د.إ)' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', label: 'SGD (S$)' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', label: 'CHF' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', label: 'ZAR (R)' }
];

export const DEFAULT_CURRENCY = SUPPORTED_CURRENCIES[0]; // USD
