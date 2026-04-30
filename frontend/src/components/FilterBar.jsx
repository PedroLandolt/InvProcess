import { useState } from 'react'
import DateFilter from './DateFilter'

function dateRangeToISO(range) {
  return range ? `${range.start}_${range.end}` : 'all'
}

function isoToDateRange(s) {
  if (!s || s === 'all') return null
  const [start, end] = s.split('_')
  if (!start || !end) return null
  return { start, end }
}

function getDefaultDateRange() {
  try {
    const saved = localStorage.getItem('portline_dateRange')
    if (saved) {
      const range = isoToDateRange(saved)
      if (range) return range
    }
  } catch {}
  const prefs = JSON.parse(localStorage.getItem('portline_prefs') || '{}')
  const preset = prefs.dateRange || 'last30'
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const d = (n) => { const x = new Date(now); x.setDate(x.getDate() + n); return x.toISOString().split('T')[0] }
  if (preset === 'all') return null
  if (preset === 'last7') return { start: d(-6), end: today }
  if (preset === 'thisMonth') return { start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, end: today }
  return { start: d(-29), end: today }
}

export default function FilterBar({ vendors, currencies, onFilterChange, onResetFilters, resultCount }) {
  const [search, setSearch] = useState('')
  const [vendor, setVendor] = useState('')
  const [currency, setCurrency] = useState('')
  const [dateRange, setDateRange] = useState(getDefaultDateRange)

  const hasFilters = (search || vendor || currency) && vendors?.length > 0

  const handleChange = (field, value) => {
    const updates = { search, vendor, currency, dateRange, [field]: value }
    if (field === 'search') setSearch(value)
    if (field === 'vendor') setVendor(value)
    if (field === 'currency') setCurrency(value)
    if (field === 'dateRange') {
      setDateRange(value)
      try { localStorage.setItem('portline_dateRange', dateRangeToISO(value)) } catch {}
    }
    onFilterChange({
      search: updates.search,
      vendor: updates.vendor,
      currency: updates.currency,
      dateRange: field === 'dateRange' ? value : dateRange,
    })
  }

  const handleReset = () => {
    const defaultRange = getDefaultDateRange()
    setSearch('')
    setVendor('')
    setCurrency('')
    setDateRange(defaultRange)
    try { localStorage.setItem('portline_dateRange', dateRangeToISO(defaultRange)) } catch {}
    onFilterChange({ search: '', vendor: '', currency: '', dateRange: defaultRange })
    onResetFilters?.()
  }

  return (
    <div className="px-4 md:px-8 py-3 bg-white border-b border-border-light flex flex-wrap gap-2 md:gap-3 items-center shrink-0 min-h-[50px]">
      <input
        type="text"
        placeholder="⌕  Search vendor, invoice #, invoice ID..."
        value={search}
        onChange={e => handleChange('search', e.target.value)}
        className="bg-[#f5f5f5] border border-[#e0e0e0] rounded px-3 py-2.5 text-sm text-[#555] w-full sm:w-auto sm:min-w-[280px] outline-none focus:border-accent/40"
      />
      <select
        value={vendor}
        onChange={e => handleChange('vendor', e.target.value)}
        className="bg-[#f5f5f5] border border-[#e0e0e0] rounded px-3 py-2 text-sm text-[#555] outline-none cursor-pointer"
      >
        <option value="">All Vendors</option>
        {vendors?.map(v => <option key={v} value={v}>{v}</option>)}
      </select>
      <select
        value={currency}
        onChange={e => handleChange('currency', e.target.value)}
        className="bg-[#f5f5f5] border border-[#e0e0e0] rounded px-3 py-2 text-sm text-[#555] outline-none cursor-pointer"
      >
        <option value="">All Currencies</option>
        {currencies?.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      {hasFilters && (
        <button
          onClick={handleReset}
          className="text-[11px] text-text-muted hover:text-accent cursor-pointer transition-colors flex items-center gap-1 px-2 py-1.5 rounded hover:bg-[#f9f9f9]"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Reset
        </button>
      )}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-text-muted">{resultCount} results</span>
        <DateFilter
          value={dateRange}
          onChange={range => handleChange('dateRange', range)}
        />
      </div>
    </div>
  )
}
