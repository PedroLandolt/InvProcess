import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import { uploadInvoice } from '../services/api'

function loadUploadHistory() {
  try {
    return JSON.parse(localStorage.getItem('portline_uploads') || '[]')
  } catch { return [] }
}

function saveUploadHistory(uploads) {
  try {
    localStorage.setItem('portline_uploads', JSON.stringify(uploads.slice(0, 50)))
  } catch {}
}

export default function UploadPage() {
  const { user } = useAuth()
  const [pending, setPending] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [uploads, setUploads] = useState(loadUploadHistory)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef()

  const addFiles = (fileList) => {
    const pdfs = Array.from(fileList).filter(f => f.type === 'application/pdf')
    if (pdfs.length === 0) return
    setPending(prev => [...prev, ...pdfs.map(f => ({
      id: f.name + f.size + Date.now() + Math.random(),
      file: f,
    }))])
  }

  const removePending = (id) => {
    setPending(prev => prev.filter(f => f.id !== id))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  const handleUploadAll = async () => {
    if (pending.length === 0) return
    setUploading(true)
    const now = new Date().toLocaleString()
    const toProcess = [...pending]
    setPending(prev => prev.map(p => ({ ...p, processing: true })))

    for (const item of toProcess) {
      try {
        const result = await uploadInvoice(item.file)
        setPending(prev => prev.filter(p => p.id !== item.id))
        setUploads(prev => {
          const updated = [{
            id: item.id,
            fileName: item.file.name,
            size: item.file.size,
            uploadedBy: user?.name || 'Unknown',
            uploadedAt: now,
            status: result.success ? 'processed' : 'failed',
          }, ...prev]
          saveUploadHistory(updated)
          return updated
        })
      } catch {
        setPending(prev => prev.filter(p => p.id !== item.id))
        setUploads(prev => {
          const updated = [{
            id: item.id,
            fileName: item.file.name,
            size: item.file.size,
            uploadedBy: user?.name || 'Unknown',
            uploadedAt: now,
            status: 'failed',
          }, ...prev]
          saveUploadHistory(updated)
          return updated
        })
      }
    }
    setUploading(false)
  }

  return (
    <>
      <PageHeader title="Upload Invoices" />
      <div className="flex-1 p-3 md:p-5 md:px-8 overflow-auto">
        <div className="max-w-2xl mx-auto">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-md p-8 md:p-12 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-accent bg-accent-light' : 'border-border hover:border-[#ccc]'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={e => { addFiles(e.target.files); e.target.value = '' }}
            />
            <svg className="mx-auto mb-3 text-text-muted" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div className="text-sm font-semibold text-text-primary mb-1">
              Drop PDFs here or click to browse
            </div>
            <div className="text-xs text-text-muted">
              PDF invoice files only — select multiple at once
            </div>
          </div>

          {/* Pending files */}
          {pending.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-text-muted uppercase tracking-wider">{pending.length} file{pending.length > 1 ? 's' : ''} selected</span>
                <button
                  onClick={handleUploadAll}
                  disabled={uploading}
                  className="bg-accent text-white px-4 py-2 rounded text-sm font-medium cursor-pointer hover:bg-[#e55a25] transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Processing...' : `Upload ${pending.length} File${pending.length > 1 ? 's' : ''}`}
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {pending.map(item => (
                  <div key={item.id} className="bg-white border border-border rounded-md p-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${item.processing ? 'bg-accent-light' : 'bg-signal-light'}`}>
                      {item.processing ? (
                        <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="text-signal text-[10px] font-bold">PDF</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-text-primary truncate">{item.file.name}</div>
                      <div className="text-[11px] text-text-muted">{(item.file.size / 1024).toFixed(1)} KB</div>
                    </div>
                    {!item.processing && (
                      <button
                        onClick={() => removePending(item.id)}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f5f5f5] cursor-pointer text-text-muted hover:text-text-primary transition-colors shrink-0"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-xs text-text-muted mt-2">Uploaded by: {user?.name}</div>
            </div>
          )}

          {/* Upload history */}
          {uploads.length > 0 && (
            <div className="mt-6">
              <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Recent Uploads</div>
              <div className="flex flex-col gap-1.5">
                {uploads.map(u => (
                  <div key={u.id} className="bg-white border border-border rounded-md p-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${u.status === 'processed' ? 'bg-ok-light' : 'bg-signal-light'}`}>
                      {u.status === 'processed' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-text-primary truncate">{u.fileName}</div>
                      <div className="text-[11px] text-text-muted">{u.uploadedBy} · {u.uploadedAt}</div>
                    </div>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-sm shrink-0 ${
                      u.status === 'processed' ? 'text-ok bg-ok-light' : 'text-signal bg-signal-light'
                    }`}>
                      {u.status === 'processed' ? 'Processed' : 'Failed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
