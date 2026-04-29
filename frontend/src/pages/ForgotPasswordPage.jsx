import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetLink, setResetLink] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (res.ok) {
        setSent(true)
        if (data.resetLink) setResetLink(data.resetLink)
      } else {
        setError(data.detail || 'Something went wrong')
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
          {sent ? (
            <>
              <h2 className="text-lg font-bold text-text-primary mb-2">Check your email</h2>
              <p className="text-sm text-text-muted mb-6">
                If an account exists for <span className="text-text-primary font-medium">{email}</span>, you'll receive a link to reset your password.
              </p>
              {resetLink && (
                <div className="mb-6 p-3 bg-[#f9f9f9] border border-border rounded-md">
                  <p className="text-xs text-text-muted mb-1">Demo reset link (in production this would be emailed):</p>
                  <a href={resetLink} className="text-sm text-accent break-all hover:underline">{resetLink}</a>
                </div>
              )}
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-accent text-white py-3 rounded text-sm font-medium cursor-pointer hover:bg-[#e55a25] transition-colors"
              >
                Back to Sign In
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-text-primary mb-1">Forgot password?</h2>
              <p className="text-sm text-text-muted mb-6">Enter your email and we'll send you a reset link.</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="text-xs text-text-secondary uppercase tracking-wider font-medium block mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-[#f5f5f5] border border-[#e0e0e0] rounded px-4 py-3 text-sm text-text-primary outline-none focus:border-accent/40"
                    placeholder="analyst@portline.com"
                    required
                  />
                </div>

                {error && (
                  <div className="text-sm text-accent bg-accent-light px-4 py-2.5 rounded-sm">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent text-white py-3 rounded text-sm font-medium cursor-pointer hover:bg-[#e55a25] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <button onClick={() => navigate('/login')} className="text-xs text-text-muted hover:text-text-secondary cursor-pointer transition-colors">
              &larr; Back to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
