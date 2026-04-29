import { useState, useEffect, useMemo } from 'react'
import FilterBar from '../components/FilterBar'
import InvoiceList from '../components/InvoiceList'
import StatisticsPanel from '../components/StatisticsPanel'
import RoleGate from '../components/RoleGate'
import { fetchInvoices, submitToERP, API_BASE } from '../services/api'
import { formatCurrency } from '../utils/format'

const getDefaultDateRange = () => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 29)
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] }
}

export default function OverviewPage() {
  const [invoices, setInvoices] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [filters, setFilters] = useState({ search: '', vendor: '', currency: '', dateRange: getDefaultDateRange() })
  const [showStats, setShowStats] = useState(false)
  const [viewingPdf, setViewingPdf] = useState(null)

  useEffect(() => {
    fetchInvoices().then(data => {
      setInvoices(Array.isArray(data) ? data : [])
    }).catch(() => setInvoices([]))
  }, [])

  const vendors = useMemo(() => [...new Set(invoices.map(i => i.vendorName))].sort(), [invoices])
  const currencies = useMemo(() => [...new Set(invoices.map(i => i.currency))].sort(), [invoices])

  // Date-only filtered (for flagged vendors in stats)
  const dateFiltered = useMemo(() => {
    if (!filters.dateRange) return invoices
    return invoices.filter(inv => {
      const uploaded = inv.uploadedAt?.split('T')[0]
      if (!uploaded) return false
      if (filters.dateRange.start && uploaded < filters.dateRange.start) return false
      if (filters.dateRange.end && uploaded > filters.dateRange.end) return false
      return true
    })
  }, [invoices, filters.dateRange])

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false
      if (filters.search) {
        const s = filters.search.toLowerCase()
        const idMatch = String(inv.id).includes(s)
        if (!idMatch && !inv.vendorName.toLowerCase().includes(s) && !inv.invoiceNumber.toLowerCase().includes(s)) return false
      }
      if (filters.vendor && inv.vendorName !== filters.vendor) return false
      if (filters.currency && inv.currency !== filters.currency) return false
      if (filters.dateRange) {
        const uploaded = inv.uploadedAt?.split('T')[0]
        if (!uploaded) return false
        if (filters.dateRange.start && uploaded < filters.dateRange.start) return false
        if (filters.dateRange.end && uploaded > filters.dateRange.end) return false
      }
      return true
    })
  }, [invoices, statusFilter, filters])

  const selected = invoices.find(i => i.id === selectedId)

  const handleSubmitERP = async (id) => {
    const result = await submitToERP(id)
    if (result.success) {
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, submittedToERP: true } : i))
    }
  }

  return (
    <>
      <FilterBar
        vendors={vendors}
        currencies={currencies}
        onFilterChange={setFilters}
        onResetFilters={() => setStatusFilter('all')}
        resultCount={filtered.length}
      />
      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 md:p-5 md:px-8 overflow-hidden">
        {/* Left: Invoice list OR Detail overlay */}
        <div className="flex-1 min-w-0 flex flex-col">
          {selectedId && selected ? (
            <div className="bg-white border border-border rounded-md overflow-hidden flex flex-col flex-1">
              {/* Header */}
              <div className="px-4 py-2.5 border-b border-border-light flex items-center gap-3 shrink-0 min-h-[44px]">
                <button
                  onClick={() => setSelectedId(null)}
                  className="w-[18px] h-[18px] flex items-center justify-center cursor-pointer text-text-secondary hover:text-text-primary transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <span className="text-sm font-semibold text-text-primary">Invoice Detail</span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-text-muted hidden sm:inline">Match Quality</span>
                  <div className="w-12 sm:w-16 h-[4px] bg-[#eee] rounded-[1px]">
                    <div
                      className={`h-full rounded-[1px] ${selected.matchQuality >= 0.8 ? 'bg-ok' : selected.matchQuality >= 0.5 ? 'bg-accent' : 'bg-signal'}`}
                      style={{ width: `${selected.matchQuality * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-ok font-semibold">{Math.round(selected.matchQuality * 100)}%</span>
                </div>
              </div>

              <DetailContent invoice={selected} onSubmitERP={handleSubmitERP} onViewPdf={setViewingPdf} />
            </div>
          ) : (
            <div className="flex items-center justify-between shrink-0 mb-2 lg:hidden">
              <span className="text-sm font-semibold text-text-primary">Invoices</span>
              <button
                onClick={() => setShowStats(s => !s)}
                className="text-xs text-text-muted hover:text-text-secondary cursor-pointer px-2 py-1 border border-border rounded"
              >
                {showStats ? 'Hide Stats' : 'Show Stats'}
              </button>
            </div>
          )}

          {/* Mobile stats overlay */}
          {showStats && !selectedId && (
            <div className="lg:hidden max-h-[40vh] overflow-y-auto shrink-0 mb-2">
              <StatisticsPanel filteredInvoices={filtered} dateFilteredInvoices={dateFiltered} />
            </div>
          )}

          {!selectedId && (
            <div className="flex-1 min-h-0">
              <InvoiceList
                invoices={filtered}
                selectedId={selectedId}
                onSelect={setSelectedId}
                statusFilter={statusFilter}
                onStatusFilter={setStatusFilter}
              />
            </div>
          )}
        </div>

        {/* Right: Statistics — desktop only (mobile uses toggle above) */}
        <div className="hidden lg:block w-[300px] shrink-0">
          <StatisticsPanel filteredInvoices={filtered} dateFilteredInvoices={dateFiltered} />
        </div>
      </div>

      {/* PDF Viewer Overlay */}
      {viewingPdf && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setViewingPdf(null)}>
          <div className="bg-white rounded-md w-full max-w-4xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-light shrink-0">
              <span className="text-sm font-semibold text-text-primary">PDF Preview</span>
              <div className="flex items-center gap-2">
                <a
                  href={`${API_BASE}/api/invoices/${viewingPdf}/pdf?token=${localStorage.getItem('token')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:text-[#e55a25] cursor-pointer"
                >
                  Open in new tab
                </a>
                <button
                  onClick={() => setViewingPdf(null)}
                  className="w-7 h-7 flex items-center justify-center cursor-pointer text-text-secondary hover:text-text-primary transition-colors rounded hover:bg-[#f5f5f5]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <iframe
                src={`${API_BASE}/api/invoices/${viewingPdf}/pdf?token=${localStorage.getItem('token')}`}
                className="w-full h-full border-0"
                title="Invoice PDF"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function DetailContent({ invoice, onSubmitERP, onViewPdf }) {
  const statusLabel = { ok: 'Ready for ERP submission', review: 'Needs manual review', error: 'Extraction failed' }
  const statusColor = { ok: 'text-ok', review: 'text-accent', error: 'text-signal' }

  return (
    <>
      <div className="flex-1 p-4 md:p-5 overflow-y-auto">
        {/* Vendor */}
        <div className="mb-5">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Vendor</div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div>
              <div className="text-base font-semibold text-text-primary">{invoice.vendorName}</div>
              <div className="text-sm text-text-secondary mt-1">Tax ID: {invoice.vendorTaxId || 'Not found'}</div>
            </div>
            {invoice.erpMatched && (
              <div className="text-sm text-ok bg-ok-light px-3 py-1.5 rounded-sm font-medium self-start">✓ ERP Match</div>
            )}
            {!invoice.erpMatched && invoice.erpCompanyName && (
              <div className="text-sm text-accent bg-accent-light px-3 py-1.5 rounded-sm font-medium self-start">⚠ Partial Match</div>
            )}
          </div>
        </div>

        {/* Extracted Data */}
        <div className="mb-5">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Extracted Data</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { label: 'Invoice #', value: invoice.invoiceNumber, mono: true },
              { label: 'Total Amount', value: formatCurrency(invoice.totalAmount, invoice.currency), accent: true },
              { label: 'Issue Date', value: invoice.issueDate },
              { label: 'Subtotal / Tax', value: `${formatCurrency(invoice.subtotal, invoice.currency)} / ${formatCurrency(invoice.taxAmount, invoice.currency)}` },
              { label: 'Due Date', value: invoice.dueDate || 'Not specified', muted: !invoice.dueDate },
              { label: 'Line Items', value: `${invoice.lineItems?.length || 0} items` },
            ].map(item => (
              <div key={item.label} className="bg-[#f9f9f9] rounded-md p-3">
                <div className="text-[11px] text-text-muted mb-0.5">{item.label}</div>
                <div className={`text-sm font-semibold ${item.mono ? 'font-mono' : ''} ${item.accent ? 'text-accent' : item.muted ? 'text-text-muted' : 'text-text-primary'}`}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Line Items */}
        {invoice.lineItems?.length > 0 && (
          <div className="mb-5">
            <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Line Items</div>
            <div className="border border-border rounded-md overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="border-b border-border-light bg-[#fafafa]">
                    <th className="text-left px-3 py-2 text-xs text-text-muted font-medium">Description</th>
                    <th className="text-right px-3 py-2 text-xs text-text-muted font-medium w-16">Qty</th>
                    <th className="text-right px-3 py-2 text-xs text-text-muted font-medium w-20">Price</th>
                    <th className="text-right px-3 py-2 text-xs text-text-muted font-medium w-20">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item, i) => (
                    <tr key={i} className="border-b border-[#f5f5f5] last:border-b-0">
                      <td className="px-3 py-2 text-sm text-text-primary">{item.description}</td>
                      <td className="px-3 py-2 text-sm text-text-secondary text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-sm text-text-secondary text-right">{formatCurrency(item.unitPrice, invoice.currency)}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-text-primary text-right">{formatCurrency(item.total, invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Processing Notes */}
        <div className="border border-border rounded-md p-3 bg-[#fcfcfc]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-[3px] h-3.5 bg-signal rounded-[1px]" />
            <span className="text-xs text-signal uppercase tracking-wider font-medium">Processing Notes</span>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">{invoice.processingNotes}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 md:px-5 py-3 border-t border-border-light bg-surface flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shrink-0">
        <div className="text-sm text-text-muted">
          <span className={`${statusColor[invoice.status]} font-semibold`}>● {invoice.status.toUpperCase()}</span>
          <span className="ml-1.5">— {statusLabel[invoice.status]}</span>
          {invoice.submittedToERP && invoice.submittedBy && (
            <span className="ml-2 text-text-muted">| Submitted by {invoice.submittedBy}{invoice.submittedAt ? ` on ${new Date(invoice.submittedAt).toLocaleDateString()}` : ''}</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onViewPdf(invoice.id)}
            className="bg-white border border-[#ddd] text-[#666] px-3 py-1.5 rounded-sm text-sm cursor-pointer hover:bg-[#f5f5f5] transition-colors"
          >
            View PDF
          </button>
          {!invoice.submittedToERP && (
            <RoleGate role="manager">
              <button
                onClick={() => onSubmitERP(invoice.id)}
                className="bg-accent text-white px-3 py-1.5 rounded-sm text-sm font-medium cursor-pointer hover:bg-[#e55a25] transition-colors"
              >
                Submit to ERP
              </button>
            </RoleGate>
          )}
          {invoice.submittedToERP && (
            <span className="text-sm text-ok font-medium px-3 py-1.5">✓ Submitted</span>
          )}
        </div>
      </div>
    </>
  )
}
