export const API_BASE = import.meta.env.VITE_API_URL || ''

export function getHeaders() {
  const token = localStorage.getItem('portline_token')
  const h = {}
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers: { ...getHeaders(), ...opts.headers } })
  return res
}

export async function fetchInvoices() {
  const res = await apiFetch('/api/invoices')
  if (!res.ok) throw new Error('Failed to fetch invoices')
  const data = await res.json()
  return data.items || []
}

export async function fetchInvoice(id) {
  const res = await apiFetch(`/api/invoices/${id}`)
  if (!res.ok) return null
  return res.json()
}

export async function fetchCompanies() {
  const res = await apiFetch('/api/companies')
  if (!res.ok) throw new Error('Failed to fetch companies')
  return res.json()
}

export async function submitToERP(invoiceId) {
  try {
    const res = await apiFetch(`/api/invoices/${invoiceId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.ok) return { success: true, invoiceId }
  } catch {}
  return { success: false, invoiceId }
}

export async function uploadInvoice(file) {
  const formData = new FormData()
  formData.append('files', file)
  const res = await apiFetch('/api/upload/pdfs', {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error('Upload failed')
  const data = await res.json()
  if (data.results && data.results.length > 0) {
    return { success: true, fileName: data.results[0].fileName, status: data.results[0].status }
  }
  throw new Error('No results returned')
}
