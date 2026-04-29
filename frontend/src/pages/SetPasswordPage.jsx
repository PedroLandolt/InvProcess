import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (!token) {
      setError('Invalid or missing token')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSuccess(true)
      } else {
        setError(data.detail || 'Failed to set password. The link may have expired.')
      }
    } catch {
      setError('Connection error. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#333] flex items-center justify-center p-4">
      <div className="w-full max-w-[440px]">
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="w-10 h-10 bg-accent rounded-md flex items-center justify-center">
            <span className="text-white text-lg font-black tracking-tight">P</span>
          </div>
          <div>
            <div className="text-white text-base font-semibold tracking-wide">PORTLINE</div>
            <div className="text-[#999] text-[11px] tracking-[2.5px] font-medium">INVOICE INTEL</div>
          </div>
        </div>

        <div className="bg-white rounded-md p-6 md:p-10">
          {success ? (
            <>
              <h2 className="text-lg font-bold text-text-primary mb-2">Password set!</h2>
              <p className="text-sm text-text-muted mb-6">
                Your password has been set successfully. You can now sign in.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-accent text-white py-3 rounded text-sm font-medium cursor-pointer hover:bg-[#e55a25] transition-colors"
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-text-primary mb-1">Set your password</h2>
              {email && <p className="text-sm text-text-muted mb-6">Setting password for <span className="text-text-primary font-medium">{email}</span></p>}
              {!email && <p className="text-sm text-text-muted mb-6">Create a password for your account.</p>}

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="text-xs text-text-secondary uppercase tracking-wider font-medium block mb-2">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-[#f5f5f5] border border-[#e0e0e0] rounded px-4 py-3 text-sm text-text-primary outline-none focus:border-accent/40"
                    placeholder="Min. 8 characters"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-text-secondary uppercase tracking-wider font-medium block mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className="w-full bg-[#f5f5f5] border border-[#e0e0e0] rounded px-4 py-3 text-sm text-text-primary outline-none focus:border-accent/40"
                    placeholder="Repeat password"
                    required
                  />
                </div>

                {error && (
                  <div className="text-sm text-accent bg-accent-light px-4 py-2.5 rounded-sm">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent text-white py-3 rounded text-sm font-medium cursor-pointer hover:bg-[#e55a25] transition-colors mt-1 disabled:opacity-50"
                >
                  {loading ? 'Setting password...' : 'Set Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
