import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PackageSearch, KeyRound, Eye, EyeOff } from 'lucide-react'
import api from '../lib/axios'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState({ type: '', msg: '' })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) {
      setStatus({ type: 'error', msg: 'Token inválido ou não fornecido.' })
    }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus({ type: '', msg: '' })
    
    if (newPassword !== confirmPassword) {
      return setStatus({ type: 'error', msg: 'As senhas não coincidem.' })
    }
    if (newPassword.length < 6) {
      return setStatus({ type: 'error', msg: 'A senha deve ter no mínimo 6 caracteres.' })
    }

    setLoading(true)
    
    try {
      await api.post('/auth/reset-password', { 
        token,
        new_password: newPassword
      })
      setStatus({ type: 'success', msg: 'Senha redefinida com sucesso!' })
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
       if (err.response && err.response.data && err.response.data.detail) {
        setStatus({ type: 'error', msg: err.response.data.detail })
      } else {
        setStatus({ type: 'error', msg: 'Token inválido ou expirado.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-10 text-white">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-tr from-green-500 to-emerald-600 p-4 rounded-2xl shadow-lg shadow-green-900/20">
              <PackageSearch size={40} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Nova Senha</h1>
          <p className="text-gray-400">Defina sua nova credencial de acesso</p>
        </div>

        {/* Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-600"></div>
          
          {status.type === 'success' ? (
             <div className="text-center py-6">
               <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 border border-green-500/20">
                 <KeyRound className="text-green-500" size={32} />
               </div>
               <h3 className="text-xl font-bold text-gray-100 mb-2">Sucesso!</h3>
               <p className="text-gray-400 text-sm mb-6">{status.msg}</p>
               <p className="text-xs text-gray-500">Redirecionando para o login...</p>
             </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {status.type === 'error' && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-xl text-center flex flex-col items-center">
                  <span>{status.msg}</span>
                  {!token && <a href="/login" className="mt-2 text-green-500 underline text-xs">Voltar ao Login</a>}
                </div>
              )}
              
              <div className={`${!token ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nova Senha</label>
                  <div className="relative mb-4">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all w-full placeholder-gray-600 pr-12"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Confirmar Senha</label>
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      required
                      className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all w-full placeholder-gray-600 pr-12"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <button 
                    type="submit" 
                    disabled={loading || !token}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 flex justify-center items-center"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      'Salvar Nova Senha'
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
