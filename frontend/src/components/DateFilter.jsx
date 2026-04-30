import { useState, useRef, useEffect } from 'react'

const PRESETS = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 Days' },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'lastYear', label: 'Last Year' },
  { key: 'specificDay', label: 'Specific Day...' },
  { key: 'specificMonth', label: 'Specific Month...' },
  { key: 'specificYear', label: 'Specific Year...' },
  { key: 'customRange', label: 'Custom Range...' },
]

function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getMonthRange(year, month) {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return [toISODate(start), toISODate(end)]
}

function getYearRange(year) {
  return [`${year}-01-01`, `${year}-12-31`]
}

function applyPreset(key, customDay, customMonth, customYear, rangeStart, rangeEnd) {
  const now = new Date()
  const today = toISODate(now)
  const yesterday = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))

  switch (key) {
    case 'all': return null
    case 'today': return { start: today, end: today }
    case 'yesterday': return { start: yesterday, end: yesterday }
    case 'last7': return { start: toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)), end: today }
    case 'last30': return { start: toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)), end: today }
    case 'thisMonth': { const [s, e] = getMonthRange(now.getFullYear(), now.getMonth()); return { start: s, end: e } }
    case 'lastMonth': { const [s, e] = getMonthRange(now.getFullYear(), now.getMonth() - 1); return { start: s, end: e } }
    case 'thisYear': { const [s, e] = getYearRange(now.getFullYear()); return { start: s, end: e } }
    case 'lastYear': { const [s, e] = getYearRange(now.getFullYear() - 1); return { start: s, end: e } }
    case 'specificDay': return customDay ? { start: customDay, end: customDay } : null
    case 'specificMonth': {
      if (!customMonth) return null
      const [y, m] = customMonth.split('-').map(Number)
      const [s, e] = getMonthRange(y, m - 1)
      return { start: s, end: e }
    }
    case 'specificYear': return customYear ? { start: `${customYear}-01-01`, end: `${customYear}-12-31` } : null
    case 'customRange': {
      if (!rangeStart && !rangeEnd) return null
      return { start: rangeStart || '2000-01-01', end: rangeEnd || '2099-12-31' }
    }
    default: return null
  }
}

function formatLabel(key, customDay, customMonth, customYear, rangeStart, rangeEnd) {
  if (key === 'specificDay' && customDay) return customDay
  if (key === 'specificMonth' && customMonth) {
    const [y, m] = customMonth.split('-')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[Number(m) - 1]} ${y}`
  }
  if (key === 'specificYear' && customYear) return customYear
  if (key === 'customRange' && (rangeStart || rangeEnd)) {
    if (rangeStart && rangeEnd) return `${rangeStart} → ${rangeEnd}`
    if (rangeStart) return `From ${rangeStart}`
    return `Until ${rangeEnd}`
  }
  return PRESETS.find(p => p.key === key)?.label || 'All Time'
}

export default function DateFilter({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState('last30')
  const [customDay, setCustomDay] = useState('')
  const [customMonth, setCustomMonth] = useState('')
  const [customYear, setCustomYear] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const ref = useRef()

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (key) => {
    if (key === 'specificDay' || key === 'specificMonth' || key === 'specificYear' || key === 'customRange') {
      setPreset(key)
      return
    }
    setPreset(key)
    setCustomDay('')
    setCustomMonth('')
    setCustomYear('')
    setRangeStart('')
    setRangeEnd('')
    const range = applyPreset(key, '', '', '', '', '')
    onChange(range)
    setOpen(false)
  }

  const handleCustomApply = () => {
    const range = applyPreset(preset, customDay, customMonth, customYear, rangeStart, rangeEnd)
    onChange(range)
    setOpen(false)
  }

  const showCustomPicker = ['specificDay', 'specificMonth', 'specificYear', 'customRange'].includes(preset)

  const label = formatLabel(preset, customDay, customMonth, customYear, rangeStart, rangeEnd)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="bg-[#f5f5f5] border border-[#e0e0e0] rounded px-3 py-2 text-sm text-[#555] flex items-center gap-2 cursor-pointer hover:border-[#ccc] transition-colors whitespace-nowrap"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className="font-medium">{label}</span>
        <span className="text-[#bbb]">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-md shadow-lg z-50 w-[220px] py-1">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => handleSelect(p.key)}
              className={`w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors ${
                preset === p.key ? 'bg-accent-light text-accent font-medium' : 'text-[#555] hover:bg-[#f9f9f9]'
              }`}
            >
              {p.label}
            </button>
          ))}

          {showCustomPicker && (
            <div className="border-t border-border-light mt-1 pt-2 px-3 pb-2">
              {preset === 'specificDay' && (
                <input
                  type="date"
                  value={customDay}
                  onChange={e => setCustomDay(e.target.value)}
                  className="w-full bg-[#f5f5f5] border border-[#e0e0e0] rounded px-2 py-1.5 text-sm text-[#555] outline-none focus:border-accent/40"
                />
              )}
              {preset === 'specificMonth' && (
                <input
                  type="month"
                  value={customMonth}
                  onChange={e => setCustomMonth(e.target.value)}
                  className="w-full bg-[#f5f5f5] border border-[#e0e0e0] rounded px-2 py-1.5 text-sm text-[#555] outline-none focus:border-accent/40"
                />
              )}
              {preset === 'specificYear' && (
                <select
                  value={customYear}
                  onChange={e => setCustomYear(e.target.value)}
                  className="w-full bg-[#f5f5f5] border border-[#e0e0e0] rounded px-2 py-1.5 text-sm text-[#555] outline-none cursor-pointer"
                >
                  <option value="">Select year</option>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              )}
              {preset === 'customRange' && (
                <div className="flex flex-col gap-1.5">
                  <div>
                    <label className="text-[10px] text-text-muted uppercase">From</label>
                    <input
                      type="date"
                      value={rangeStart}
                      onChange={e => setRangeStart(e.target.value)}
                      className="w-full bg-[#f5f5f5] border border-[#e0e0e0] rounded px-2 py-1.5 text-sm text-[#555] outline-none focus:border-accent/40"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted uppercase">To</label>
                    <input
                      type="date"
                      value={rangeEnd}
                      onChange={e => setRangeEnd(e.target.value)}
                      className="w-full bg-[#f5f5f5] border border-[#e0e0e0] rounded px-2 py-1.5 text-sm text-[#555] outline-none focus:border-accent/40"
                    />
                  </div>
                </div>
              )}
              <button
                onClick={handleCustomApply}
                className="w-full mt-2 bg-accent text-white py-1.5 rounded text-sm font-medium cursor-pointer hover:bg-[#e55a25] transition-colors"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
