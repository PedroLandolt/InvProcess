import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const result = await login(email, password)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error)
    }
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
          <h2 className="text-lg font-bold text-text-primary mb-1">Sign in</h2>
          <p className="text-sm text-text-muted mb-8">Enter your credentials to access the dashboard</p>

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
            <div>
              <label className="text-xs text-text-secondary uppercase tracking-wider font-medium block mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#f5f5f5] border border-[#e0e0e0] rounded px-4 py-3 text-sm text-text-primary outline-none focus:border-accent/40"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-accent bg-accent-light px-4 py-2.5 rounded-sm">{error}</div>
            )}

            <div className="flex justify-end">
              <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs text-text-muted hover:text-accent cursor-pointer transition-colors">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-accent text-white py-3 rounded text-sm font-medium cursor-pointer hover:bg-[#e55a25] transition-colors mt-1"
            >
              Sign in
            </button>
          </form>

          <div className="mt-8 pt-5 border-t border-border-light">
            <p className="text-xs text-text-muted mb-2">Demo accounts:</p>
            <div className="flex flex-col gap-1.5">
              <div className="text-xs text-text-secondary">
                <span className="font-medium text-text-primary">Analyst:</span> analyst@portline.com / analyst
              </div>
              <div className="text-xs text-text-secondary">
                <span className="font-medium text-text-primary">Manager:</span> manager@portline.com / manager
              </div>
              <div className="text-xs text-text-secondary">
                <span className="font-medium text-text-primary">Admin:</span> admin@portline.com / admin
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
