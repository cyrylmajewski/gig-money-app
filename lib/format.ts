export function sanitiseDecimal(raw: string): string {
  const cleaned = raw.replace(/[^0-9.,]/g, '');
  const normalised = cleaned.replace(',', '.');
  const parts = normalised.split('.');
  let final = (parts[0] ?? '').slice(0, 8);
  if (parts.length > 1) final += ',' + (parts[1] ?? '').slice(0, 2);
  return final;
}

export function parseAmount(raw: string): number {
  const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
  const value = parseFloat(cleaned);
  return isNaN(value) || value < 0 ? 0 : value;
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString('pl-PL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatAmountForInput(amount: number): string {
  if (amount === 0) return '';
  return amount.toLocaleString('pl-PL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
