import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PackageSearch, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loadingLocal, setLoadingLocal] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoadingLocal(true)
    
    try {
      const user = await login(email, password)
      if (user.is_admin) {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      if (err.response?.status === 403) {
        navigate('/blocked')
      } else if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Ocorreu um erro ao fazer login. Tente novamente.')
      }
    } finally {
      setLoadingLocal(false)
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
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">RastroFlow</h1>
          <p className="text-gray-400">Acesse sua conta para gerenciar encomendas</p>
        </div>

        {/* Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Decoração superior */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-600"></div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-xl text-center">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">E-mail</label>
              <input 
                type="email" 
                required
                className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all w-full placeholder-gray-600"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-300">Senha</label>
                <Link to="/forgot-password" className="text-xs text-green-500 hover:text-green-400 transition-colors">Esqueceu a senha?</Link>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all w-full placeholder-gray-600 pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <button 
              type="submit" 
              disabled={loadingLocal}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-3 pt-3.5 px-6 rounded-xl transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {loadingLocal ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Entrar na Plataforma'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
