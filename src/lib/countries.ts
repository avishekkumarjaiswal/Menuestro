export interface CountryOption {
  code: string;
  name: string;
  currencyCode: string;
  currencySymbol: string;
  currencyName: string;
  flag: string;
}

export const COUNTRIES: CountryOption[] = [
  { code: 'IN', name: 'India', currencyCode: 'INR', currencySymbol: '₹', currencyName: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'US', name: 'United States', currencyCode: 'USD', currencySymbol: '$', currencyName: 'US Dollar', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', currencyCode: 'GBP', currencySymbol: '£', currencyName: 'British Pound', flag: '🇬🇧' },
  { code: 'AE', name: 'United Arab Emirates', currencyCode: 'AED', currencySymbol: 'AED', currencyName: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', currencyCode: 'SAR', currencySymbol: 'SAR', currencyName: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'CA', name: 'Canada', currencyCode: 'CAD', currencySymbol: 'CA$', currencyName: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', currencyCode: 'AUD', currencySymbol: 'AU$', currencyName: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany (Eurozone)', currencyCode: 'EUR', currencySymbol: '€', currencyName: 'Euro', flag: '🇩🇪' },
  { code: 'FR', name: 'France (Eurozone)', currencyCode: 'EUR', currencySymbol: '€', currencyName: 'Euro', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy (Eurozone)', currencyCode: 'EUR', currencySymbol: '€', currencyName: 'Euro', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain (Eurozone)', currencyCode: 'EUR', currencySymbol: '€', currencyName: 'Euro', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands (Eurozone)', currencyCode: 'EUR', currencySymbol: '€', currencyName: 'Euro', flag: '🇳🇱' },
  { code: 'SG', name: 'Singapore', currencyCode: 'SGD', currencySymbol: 'S$', currencyName: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', currencyCode: 'MYR', currencySymbol: 'RM', currencyName: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'ID', name: 'Indonesia', currencyCode: 'IDR', currencySymbol: 'Rp', currencyName: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'TH', name: 'Thailand', currencyCode: 'THB', currencySymbol: '฿', currencyName: 'Thai Baht', flag: '🇹🇭' },
  { code: 'PH', name: 'Philippines', currencyCode: 'PHP', currencySymbol: '₱', currencyName: 'Philippine Peso', flag: '🇵🇭' },
  { code: 'VN', name: 'Vietnam', currencyCode: 'VND', currencySymbol: '₫', currencyName: 'Vietnamese Dong', flag: '🇻🇳' },
  { code: 'JP', name: 'Japan', currencyCode: 'JPY', currencySymbol: '¥', currencyName: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', currencyCode: 'KRW', currencySymbol: '₩', currencyName: 'South Korean Won', flag: '🇰🇷' },
  { code: 'MX', name: 'Mexico', currencyCode: 'MXN', currencySymbol: 'MX$', currencyName: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'BR', name: 'Brazil', currencyCode: 'BRL', currencySymbol: 'R$', currencyName: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'ZA', name: 'South Africa', currencyCode: 'ZAR', currencySymbol: 'R', currencyName: 'South African Rand', flag: '🇿🇦' },
  { code: 'CH', name: 'Switzerland', currencyCode: 'CHF', currencySymbol: 'CHF', currencyName: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'SE', name: 'Sweden', currencyCode: 'SEK', currencySymbol: 'kr', currencyName: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', currencyCode: 'NOK', currencySymbol: 'kr', currencyName: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', currencyCode: 'DKK', currencySymbol: 'kr', currencyName: 'Danish Krone', flag: '🇩🇰' },
  { code: 'PL', name: 'Poland', currencyCode: 'PLN', currencySymbol: 'zł', currencyName: 'Polish Zloty', flag: '🇵🇱' },
  { code: 'TR', name: 'Turkey', currencyCode: 'TRY', currencySymbol: '₺', currencyName: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'NZ', name: 'New Zealand', currencyCode: 'NZD', currencySymbol: 'NZ$', currencyName: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'EG', name: 'Egypt', currencyCode: 'EGP', currencySymbol: 'E£', currencyName: 'Egyptian Pound', flag: '🇪🇬' },
  { code: 'NG', name: 'Nigeria', currencyCode: 'NGN', currencySymbol: '₦', currencyName: 'Nigerian Naira', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', currencyCode: 'KES', currencySymbol: 'KSh', currencyName: 'Kenyan Shilling', flag: '🇰🇪' },
  { code: 'PK', name: 'Pakistan', currencyCode: 'PKR', currencySymbol: 'Rs', currencyName: 'Pakistani Rupee', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', currencyCode: 'BDT', currencySymbol: '৳', currencyName: 'Bangladeshi Taka', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka', currencyCode: 'LKR', currencySymbol: 'Rs', currencyName: 'Sri Lankan Rupee', flag: '🇱🇰' },
  { code: 'NP', name: 'Nepal', currencyCode: 'NPR', currencySymbol: 'Rs', currencyName: 'Nepalese Rupee', flag: '🇳🇵' },
  { code: 'QA', name: 'Qatar', currencyCode: 'QAR', currencySymbol: 'QR', currencyName: 'Qatari Riyal', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait', currencyCode: 'KWD', currencySymbol: 'KD', currencyName: 'Kuwaiti Dinar', flag: '🇰🇼' },
  { code: 'BH', name: 'Bahrain', currencyCode: 'BHD', currencySymbol: 'BD', currencyName: 'Bahraini Dinar', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman', currencyCode: 'OMR', currencySymbol: 'OMR', currencyName: 'Omani Rial', flag: '🇴🇲' },
];

export function getCountryByCode(code?: string): CountryOption | undefined {
  if (!code) return undefined;
  return COUNTRIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
}

export function getCountryByName(name?: string): CountryOption | undefined {
  if (!name) return undefined;
  return COUNTRIES.find((c) => c.name.toLowerCase() === name.toLowerCase());
}

export function formatCurrencyPrice(price: number | string, symbol = '₹'): string {
  const num = typeof price === 'number' ? price : parseFloat(price);
  if (isNaN(num)) return `${symbol}${price}`;
  return `${symbol}${num.toLocaleString()}`;
}
