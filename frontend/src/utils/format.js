export function formatCurrency(amount, currency) {
  if (amount == null || isNaN(amount)) return `${currency || ''} 0.00`
  const symbols = { USD: '$', EUR: '€', INR: '₹', GBP: '£', CHF: 'CHF ', DKK: 'kr ', CNY: '¥' }
  const symbol = symbols[currency] || (currency ? currency + ' ' : '')
  return `${symbol}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
