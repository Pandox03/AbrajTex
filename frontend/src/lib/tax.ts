/** Split a TTC (tax-inclusive) amount into HT + TVA. */
export function splitTtc(amountTtc: number, taxRate = 20): { ht: number; tax: number; total: number } {
  const total = Math.round(Math.max(0, amountTtc) * 100) / 100
  const ht = Math.round((total / (1 + taxRate / 100)) * 100) / 100
  const tax = Math.round((total - ht) * 100) / 100

  return { ht, tax, total }
}
