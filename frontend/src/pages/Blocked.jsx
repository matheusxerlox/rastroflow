import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

export default function Blocked() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 border-t-4 border-red-500 rounded-2xl p-8 shadow-2xl text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-red-500/20 p-4 rounded-full">
            <AlertTriangle size={48} className="text-red-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-100 mb-2">Assinatura Encerrada</h1>
        <p className="text-gray-400 mb-8 leading-relaxed text-sm">
          Sua conta ou a conta matriz associada a você encontra-se com a assinatura pendente ou bloqueada. 
          Entre em contato com o suporte ou realize uma nova assinatura para reativar seu acesso. Todos os seus dados continuam salvos de forma segura.
        </p>
        <Link to="/login" className="inline-block w-full bg-gray-900 border border-gray-700 hover:border-gray-500 text-white font-medium py-3 px-6 rounded-xl transition-all">
          Voltar ao Login
        </Link>
      </div>
    </div>
  )
}
