import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PackageSearch, ArrowLeft, MailCheck } from 'lucide-react'
import api from '../lib/axios'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState({ type: '', msg: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatus({ type: '', msg: '' })
    
    try {
      await api.post('/auth/forgot-password', { email })
      setStatus({ type: 'success', msg: 'Se o e-mail existir, você receberá um link de recuperação em breve.' })
    } catch (err) {
      setStatus({ type: 'error', msg: 'Ocorreu um erro ao processar sua solicitação.' })
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
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Recuperar Senha</h1>
          <p className="text-gray-400">Informe seu e-mail para receber o link</p>
        </div>

        {/* Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-600"></div>
          
          {status.type === 'success' ? (
            <div className="text-center py-6">
              <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 border border-green-500/20">
                <MailCheck className="text-green-500" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-100 mb-2">E-mail Enviado!</h3>
              <p className="text-gray-400 text-sm mb-6">{status.msg}</p>
              <Link to="/login" className="text-green-500 hover:text-green-400 font-medium inline-flex items-center gap-2 transition-colors">
                <ArrowLeft size={16} /> Voltar para o Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {status.type === 'error' && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-xl text-center">
                  {status.msg}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">E-mail Cadastrado</label>
                <input 
                  type="email" 
                  required
                  className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all w-full placeholder-gray-600"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 flex justify-center items-center"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Enviar Link'
                  )}
                </button>
                <Link to="/login" className="text-center text-sm text-gray-400 hover:text-gray-200 transition-colors">
                  Cancelar
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
