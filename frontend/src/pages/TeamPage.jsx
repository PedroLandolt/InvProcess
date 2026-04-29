import { useState, useEffect, useCallback } from 'react'
import PageHeader from '../components/PageHeader'
import { getHeaders, API_BASE } from '../services/api'

function MemberModal({ member, onSave, onClose }) {
  const isEdit = !!member?.id
  const [form, setForm] = useState({
    name: member?.name || '',
    email: member?.email || '',
    employeeId: member?.employeeId || '',
    status: member?.status || 'active',
  })
  const [sent, setSent] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) return
    if (!isEdit) {
      setSent(true)
      onSave({ ...member, ...form })
    } else {
      onSave({ ...member, ...form })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-md w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border-light">
          <span className="text-sm font-semibold text-text-primary">{isEdit ? 'Edit Team Member' : 'Invite Analyst'}</span>
        </div>
        {sent ? (
          <div className="p-5">
            <div className="bg-ok-light text-ok text-sm p-4 rounded-md font-medium mb-4">
              Invitation sent to {form.email}. The analyst will receive an email with a link to set their password and activate their account.
            </div>
            <div className="flex justify-end">
              <button onClick={onClose} className="bg-accent text-white px-4 py-2 rounded text-sm font-medium cursor-pointer hover:bg-[#e55a25] transition-colors">Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            <div>
              <label className="text-xs text-text-secondary uppercase tracking-wider font-medium block mb-1.5">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-[#f5f5f5] border border-[#e0e0e0] rounded px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent/40"
                placeholder="Ana Torres"
                required
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary uppercase tracking-wider font-medium block mb-1.5">Employee ID</label>
              <input
                type="text"
                value={form.employeeId}
                onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                className="w-full bg-[#f5f5f5] border border-[#e0e0e0] rounded px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent/40"
                placeholder="EMP-0042"
                required
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary uppercase tracking-wider font-medium block mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-[#f5f5f5] border border-[#e0e0e0] rounded px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent/40"
                placeholder="ana.torres@portline.com"
                required
              />
            </div>
            {!isEdit && (
              <div className="text-xs text-text-muted bg-[#f9f9f9] p-3 rounded-md">
                An invitation email will be sent to this address with a link to set their password.
              </div>
            )}
            {isEdit && (
              <div>
                <label className="text-xs text-text-secondary uppercase tracking-wider font-medium block mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-[#f5f5f5] border border-[#e0e0e0] rounded px-3 py-2.5 text-sm text-[#555] outline-none cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-1">
              <button type="button" onClick={onClose} className="bg-white border border-[#ddd] text-[#666] px-4 py-2 rounded text-sm cursor-pointer hover:bg-[#f5f5f5] transition-colors">Cancel</button>
              <button type="submit" className="bg-accent text-white px-4 py-2 rounded text-sm font-medium cursor-pointer hover:bg-[#e55a25] transition-colors">
                {isEdit ? 'Save Changes' : 'Send Invitation'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function TeamPage() {
  const [team, setTeam] = useState([])
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/team`, { headers: getHeaders() })
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchTeam() }, [fetchTeam])

  const handleSave = async (data) => {
    if (data.id) {
      try {
        await fetch(`${API_BASE}/api/team/${data.id}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({ name: data.name, status: data.status }),
        })
      } catch {}
      setTeam(prev => prev.map(m => m.id === data.id ? { ...m, ...data } : m))
      setModal(null)
    } else {
      try {
        const res = await fetch(`${API_BASE}/api/team`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ name: data.name, email: data.email }),
        })
        if (res.ok) {
          const newUser = await res.json()
          setTeam(prev => [...prev, { ...newUser, status: 'pending', lastLogin: 'Never' }])
        }
      } catch {}
    }
  }

  const handleToggleStatus = async (id) => {
    const member = team.find(m => m.id === id)
    if (!member) return
    const newStatus = member.status === 'active' ? 'inactive' : 'active'
    try {
      await fetch(`/api/team/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus }),
      })
    } catch {}
    setTeam(prev => prev.map(m =>
      m.id === id ? { ...m, status: newStatus } : m
    ))
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Team Management" />
        <div className="flex-1 p-8 text-center text-text-secondary text-sm">Loading...</div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Team Management"
        action={{ label: '+ Add Analyst', onClick: () => setModal('add') }}
      />
      <div className="flex-1 p-3 md:p-5 md:px-8 overflow-auto">
        {/* Desktop table */}
        <div className="bg-white border border-border rounded-md overflow-x-auto hidden md:block">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border-light">
                <th className="text-left px-4 py-3 text-xs text-text-muted uppercase tracking-wider font-medium">Name</th>
                <th className="text-left px-4 py-3 text-xs text-text-muted uppercase tracking-wider font-medium">Email</th>
                <th className="text-left px-4 py-3 text-xs text-text-muted uppercase tracking-wider font-medium">Role</th>
                <th className="text-left px-4 py-3 text-xs text-text-muted uppercase tracking-wider font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs text-text-muted uppercase tracking-wider font-medium">Last Login</th>
                <th className="text-left px-4 py-3 text-xs text-text-muted uppercase tracking-wider font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {team.map(member => (
                <tr key={member.id} className="border-b border-[#f5f5f5] hover:bg-[#fafafa]">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#555] rounded-full flex items-center justify-center text-xs text-[#bbb] font-semibold">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-sm font-semibold text-text-primary">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-text-secondary">{member.email}</td>
                  <td className="px-4 py-3.5 text-sm">
                    <span className={`px-2.5 py-1 rounded-sm text-xs font-medium ${
                      member.role === 'manager' ? 'bg-accent-light text-accent' : 'bg-[#f1f8f4] text-ok'
                    }`}>
                      {member.role === 'manager' ? 'Manager' : 'Analyst'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm">
                    <span className={`text-xs font-medium ${member.status === 'active' ? 'text-ok' : member.status === 'pending' ? 'text-accent' : 'text-text-muted'}`}>
                      ● {member.status === 'active' ? 'Active' : member.status === 'pending' ? 'Pending' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-text-secondary">{member.lastLogin || 'Never'}</td>
                  <td className="px-4 py-3.5">
                    {member.role !== 'manager' && (
                      <div className="flex gap-2">
                        <button onClick={() => setModal(member)} className="text-xs text-text-muted hover:text-text-secondary cursor-pointer">Edit</button>
                        <button onClick={() => handleToggleStatus(member.id)} className="text-xs text-accent hover:text-[#e55a25] cursor-pointer">
                          {member.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="flex flex-col gap-2 md:hidden">
          {team.map(member => (
            <div key={member.id} className="bg-white border border-border rounded-md p-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-[#555] rounded-full flex items-center justify-center text-xs text-[#bbb] font-semibold">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-text-primary">{member.name}</div>
                  <div className="text-xs text-text-secondary truncate">{member.email}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-sm text-[11px] font-medium shrink-0 ${
                  member.role === 'manager' ? 'bg-accent-light text-accent' : 'bg-[#f1f8f4] text-ok'
                }`}>
                  {member.role === 'manager' ? 'Manager' : 'Analyst'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className={`font-medium ${member.status === 'active' ? 'text-ok' : member.status === 'pending' ? 'text-accent' : 'text-text-muted'}`}>
                  ● {member.status === 'active' ? 'Active' : member.status === 'pending' ? 'Pending' : 'Inactive'}
                </span>
                <span className="text-text-muted">{member.lastLogin || 'Never'}</span>
              </div>
              {member.role !== 'manager' && (
                <div className="flex gap-3 mt-2 pt-2 border-t border-[#f5f5f5]">
                  <button onClick={() => setModal(member)} className="text-xs text-text-muted hover:text-text-secondary cursor-pointer">Edit</button>
                  <button onClick={() => handleToggleStatus(member.id)} className="text-xs text-accent hover:text-[#e55a25] cursor-pointer">
                    {member.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <MemberModal
          member={modal === 'add' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
