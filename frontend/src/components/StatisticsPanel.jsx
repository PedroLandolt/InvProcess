import { useMemo, useState } from 'react'

export default function StatisticsPanel({ filteredInvoices, dateFilteredInvoices }) {
  const [sortAsc, setSortAsc] = useState(true)

  const stats = useMemo(() => {
    const invoices = filteredInvoices
    const total = invoices.length
    const ok = invoices.filter(i => i.status === 'ok').length
    const review = invoices.filter(i => i.status === 'review').length
    const error = invoices.filter(i => i.status === 'error').length
    const submitted = invoices.filter(i => i.submittedToERP).length

    // Status distribution per vendor
    const subMap = {}
    invoices.forEach(inv => {
      if (!subMap[inv.vendorName]) subMap[inv.vendorName] = { total: 0, ok: 0, review: 0, error: 0 }
      subMap[inv.vendorName].total++
      subMap[inv.vendorName][inv.status]++
    })
    const vendorRanking = Object.entries(subMap)
      .map(([name, d]) => {
        const okPct = d.total > 0 ? Math.round((d.ok / d.total) * 100) : 0
        return { name, ...d, okPct }
      })
      .sort((a, b) => sortAsc ? a.okPct - b.okPct : b.okPct - a.okPct)

    // Flagged vendors (from date-filtered only)
    const flagMap = {}
    dateFilteredInvoices.forEach(inv => {
      if (inv.status !== 'ok') {
        if (!flagMap[inv.vendorName]) flagMap[inv.vendorName] = { review: 0, error: 0 }
        flagMap[inv.vendorName][inv.status]++
      }
    })
    const flaggedVendors = Object.entries(flagMap)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => (b.review + b.error) - (a.review + a.error))

    return { total, ok, review, error, submitted, vendorRanking, flaggedVendors }
  }, [filteredInvoices, dateFilteredInvoices, sortAsc])

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      {/* Status bar */}
      <div className="bg-white border border-border rounded-md p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold text-text-primary">{stats.total}</span>
            <span className="text-xs text-text-secondary">processed</span>
          </div>
          <span className="text-xs font-semibold text-ok">{stats.ok}/{stats.total} approved</span>
        </div>
        {stats.total > 0 && (
          <>
            <div className="flex gap-0.5 h-1.5 rounded-sm overflow-hidden">
              <div className="bg-ok transition-all" style={{ width: `${(stats.ok / stats.total) * 100}%` }} />
              <div className="bg-accent transition-all" style={{ width: `${(stats.review / stats.total) * 100}%` }} />
              <div className="bg-signal transition-all" style={{ width: `${(stats.error / stats.total) * 100}%` }} />
            </div>
            <div className="flex gap-3 mt-1.5 text-[11px]">
              <span className="text-ok font-medium">{stats.ok} OK</span>
              <span className="text-accent font-medium">{stats.review} Review</span>
              <span className="text-signal font-medium">{stats.error} Error</span>
            </div>
          </>
        )}
      </div>

      {/* Vendor ranking */}
      <div className="bg-white border border-border rounded-md p-3 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] text-text-muted uppercase tracking-wider">Vendor Status</div>
          <button
            onClick={() => setSortAsc(s => !s)}
            className="text-[10px] text-text-muted hover:text-text-secondary cursor-pointer transition-colors flex items-center gap-0.5"
          >
            {sortAsc ? 'Low → High' : 'High → Low'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {sortAsc
                ? <polyline points="18 15 12 9 6 15" />
                : <polyline points="6 9 12 15 18 9" />
              }
            </svg>
          </button>
        </div>
        <div className="flex flex-col overflow-y-auto flex-1 min-h-0">
          {stats.vendorRanking.map(v => (
            <div key={v.name} className="py-1.5 border-b border-[#f5f5f5] last:border-b-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-primary truncate mr-2">{v.name}</span>
                <span className={`text-[11px] font-bold shrink-0 ${v.okPct === 100 ? 'text-ok' : v.okPct >= 50 ? 'text-accent' : 'text-signal'}`}>
                  {v.okPct}% OK
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-[3px] bg-[#eee] rounded-[1px]">
                  <div
                    className={`h-full rounded-[1px] ${v.okPct >= 80 ? 'bg-ok' : v.okPct >= 50 ? 'bg-accent' : v.okPct > 0 ? 'bg-signal' : ''}`}
                    style={{ width: `${v.okPct}%` }}
                  />
                </div>
                <span className="text-[10px] text-text-muted shrink-0">{v.total}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Flagged vendors */}
      {stats.flaggedVendors.length > 0 && (
        <div className="bg-white border border-border rounded-md p-3 shrink-0">
          <div className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5">Flagged Vendors</div>
          <div className="flex flex-wrap gap-1.5">
            {stats.flaggedVendors.map(v => (
              <div key={v.name} className="flex items-center gap-1 bg-[#f9f9f9] rounded px-2 py-1">
                <span className="text-[11px] text-text-primary">{v.name.split(' ').slice(0, 2).join(' ')}</span>
                <div className="flex gap-1 text-[10px] font-bold">
                  {v.review > 0 && <span className="text-accent">{v.review}R</span>}
                  {v.error > 0 && <span className="text-signal">{v.error}E</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
