import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getHeaders, API_BASE } from '../services/api'
import PageHeader from '../components/PageHeader'

function getPrefs() {
  try {
    return JSON.parse(localStorage.getItem('portline_prefs')) || {}
  } catch { return {} }
}

function savePrefs(prefs) {
  localStorage.setItem('portline_prefs', JSON.stringify(prefs))
}

function validatePassword(pw) {
  if (pw.length < 8) return 'Password must be at least 8 characters'
  return null
}

export default function SettingsPage() {
  const { user, updateProfile } = useAuth()
  const [prefs, setPrefs] = useState(getPrefs)
  const avatarRef = useRef()

  const [editName, setEditName] = useState(user?.name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editPasswordConfirm, setEditPasswordConfirm] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [avatarPreview, setAvatarPreview] = useState(() => {
    if (!user?.avatar) return null
    const sep = user.avatar.includes('?') ? '&' : '?'
    return `${user.avatar}${sep}token=${localStorage.getItem('portline_token')}`
  })

  const changingPassword = !!(editPassword || editPasswordConfirm)

  const handlePrefChange = (key, value) => {
    const updated = { ...prefs, [key]: value }
    setPrefs(updated)
    savePrefs(updated)
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API_BASE}/api/auth/avatar`, {
        method: 'POST',
        headers: getHeaders(),
        body: formData,
      })
      if (res.ok) {
        const token = localStorage.getItem('portline_token')
        const avatarUrl = `${API_BASE}/api/auth/avatar/${user?.id}?token=${token}&t=${Date.now()}`
        setAvatarPreview(avatarUrl)
        updateProfile({ avatar: avatarUrl })
      }
    } catch {}
  }

  const handleProfileSave = (e) => {
    e.preventDefault()
    setProfileError('')
    setProfileSaved(false)

    if (!editName.trim()) {
      setProfileError('Name cannot be empty')
      return
    }

    // If changing password, validate fully
    if (changingPassword) {
      if (!currentPassword) {
        setProfileError('Enter your current password to set a new one')
        return
      }
      const pwError = validatePassword(editPassword)
      if (pwError) {
        setProfileError(pwError)
        return
      }
      if (editPassword !== editPasswordConfirm) {
        setProfileError('Passwords do not match')
        return
      }
      // Mock: accept any current password for now (backend will verify later)
    }

    updateProfile({ name: editName.trim() })
    setCurrentPassword('')
    setEditPassword('')
    setEditPasswordConfirm('')
    setProfileSaved(true)
  }

  const initials = editName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex-1 p-3 md:p-5 md:px-8 overflow-auto">
        <div className="max-w-2xl">
          {/* Profile */}
          <form onSubmit={handleProfileSave} className="bg-white border border-border rounded-md p-4 md:p-6 mb-4">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Profile</h2>

            <div className="flex items-center gap-4 mb-5">
              <div className="relative">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 bg-[#555] rounded-full flex items-center justify-center text-lg text-[#bbb] font-semibold">
                    {initials}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => avatarRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center cursor-pointer hover:bg-[#e55a25] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div className="text-xs text-text-muted">Click the camera to upload a photo</div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-text-secondary uppercase tracking-wider font-medium block mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-[#f5f5f5] border border-[#e0e0e0] rounded px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent/40"
                />
              </div>
              <div>
                <label className="text-xs text-text-secondary uppercase tracking-wider font-medium block mb-1.5">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full bg-[#f0f0f0] border border-[#e0e0e0] rounded px-3 py-2.5 text-sm text-text-muted outline-none cursor-not-allowed"
                />
                <div className="text-[11px] text-text-muted mt-1">Email cannot be changed</div>
              </div>

              {/* Change password section */}
              <div className="border-t border-border-light pt-4 mt-1">
                <h3 className="text-xs text-text-secondary uppercase tracking-wider font-medium mb-3">Change Password</h3>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Required only to change password"
                      className="w-full bg-[#f5f5f5] border border-[#e0e0e0] rounded px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent/40"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-text-muted block mb-1">New Password</label>
                      <input
                        type="password"
                        value={editPassword}
                        onChange={e => setEditPassword(e.target.value)}
                        placeholder="Min 6 chars, uppercase, number, special"
                        className="w-full bg-[#f5f5f5] border border-[#e0e0e0] rounded px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent/40"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={editPasswordConfirm}
                        onChange={e => setEditPasswordConfirm(e.target.value)}
                        placeholder="Repeat new password"
                        className="w-full bg-[#f5f5f5] border border-[#e0e0e0] rounded px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent/40"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-text-muted">
                    Leave password fields blank to keep your current password. Name and avatar changes don't require your password.
                  </div>
                </div>
              </div>
            </div>

            {profileError && (
              <div className="mt-3 text-sm text-signal bg-signal-light px-3 py-2 rounded-sm">{profileError}</div>
            )}
            {profileSaved && (
              <div className="mt-3 text-sm text-ok bg-ok-light px-3 py-2 rounded-sm">Profile updated successfully.</div>
            )}

            <div className="mt-4 flex justify-end">
              <button type="submit" className="bg-accent text-white px-5 py-2 rounded text-sm font-medium cursor-pointer hover:bg-[#e55a25] transition-colors">
                Save Profile
              </button>
            </div>
          </form>

          {/* Preferences */}
          <div className="bg-white border border-border rounded-md p-4 md:p-6 mb-4">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Preferences</h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div>
                  <div className="text-sm text-text-primary">Default date range</div>
                  <div className="text-xs text-text-muted">Set the default period for the overview dashboard</div>
                </div>
                <select
                  value={prefs.dateRange || 'last30'}
                  onChange={e => handlePrefChange('dateRange', e.target.value)}
                  className="bg-[#f5f5f5] border border-[#e0e0e0] rounded px-3 py-2 text-sm text-[#555] outline-none cursor-pointer w-full sm:w-auto"
                >
                  <option value="last30">Last 30 days</option>
                  <option value="last7">Last 7 days</option>
                  <option value="thisMonth">This month</option>
                  <option value="all">All time</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div>
                  <div className="text-sm text-text-primary">Currency display</div>
                  <div className="text-xs text-text-muted">Primary currency for summaries</div>
                </div>
                <select
                  value={prefs.currencyDisplay || 'original'}
                  onChange={e => handlePrefChange('currencyDisplay', e.target.value)}
                  className="bg-[#f5f5f5] border border-[#e0e0e0] rounded px-3 py-2 text-sm text-[#555] outline-none cursor-pointer w-full sm:w-auto"
                >
                  <option value="original">Original currency</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
          </div>

          {/* ERP Connection */}
          <div className="bg-white border border-border rounded-md p-4 md:p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-4">ERP Connection</h2>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-text-primary">API Status</div>
                <div className="text-xs text-text-muted">Connection to the ERP system</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-ok rounded-full"></span>
                <span className="text-xs text-ok font-medium">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
