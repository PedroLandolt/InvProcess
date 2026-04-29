import { formatCurrency } from '../utils/format'
import StatusBadge from './StatusBadge'

export default function InvoiceList({ invoices, selectedId, onSelect, statusFilter, onStatusFilter }) {
  const statusTabs = ['all', 'ok', 'review', 'error']

  return (
    <div className="bg-white border border-border rounded-md overflow-hidden flex flex-col h-full">
      <div className="px-4 py-2.5 border-b border-border-light flex justify-between items-center shrink-0 min-h-[44px]">
        <div className="flex items-center gap-3">
          <div className="w-[18px]" />
          <span className="text-sm font-semibold text-text-primary">Invoices</span>
        </div>
        <div className="flex gap-1.5">
          {statusTabs.map(s => (
            <button
              key={s}
              onClick={() => onStatusFilter(s)}
              className={`text-xs px-3 py-1 rounded-sm cursor-pointer transition-colors ${
                statusFilter === s ? 'bg-[#333] text-white' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {invoices.map(inv => (
          <div
            key={inv.id}
            onClick={() => onSelect(inv.id)}
            className={`px-4 py-3 cursor-pointer border-b border-[#f5f5f5] last:border-b-0 transition-colors ${
              selectedId === inv.id
                ? 'border-l-2 border-l-accent bg-accent-light'
                : 'border-l-2 border-l-transparent hover:bg-[#fafafa]'
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text-primary truncate">{inv.vendorName}</div>
                <div className="text-xs text-text-muted mt-0.5 font-mono">
                  #{inv.invoiceNumber} · {inv.currency} · {inv.issueDate}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="text-sm font-bold text-text-primary">
                  {formatCurrency(inv.totalAmount, inv.currency)}
                </span>
                <StatusBadge status={inv.status} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-text-muted">Match</span>
              <div className="flex-1 max-w-[100px] h-[3px] bg-[#eee] rounded-[1px]">
                <div
                  className={`h-full rounded-[1px] ${
                    inv.matchQuality >= 0.8 ? 'bg-ok' : inv.matchQuality >= 0.5 ? 'bg-accent' : 'bg-signal'
                  }`}
                  style={{ width: `${inv.matchQuality * 100}%` }}
                />
              </div>
              <span
                className={`text-[11px] font-medium ${
                  inv.matchQuality >= 0.8 ? 'text-ok' : inv.matchQuality >= 0.5 ? 'text-accent' : 'text-signal'
                }`}
              >
                {Math.round(inv.matchQuality * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
