import { useState, useEffect } from 'react'
import { Link2, Copy, RefreshCw, KeyRound, Save, AlertTriangle } from 'lucide-react'
import api from '../lib/axios'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { user } = useAuth()
  const [webhookUrl, setWebhookUrl] = useState('')
  const [cobrancaUrl, setCobrancaUrl] = useState('')
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  
  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings/webhook-url')
      setWebhookUrl(res.data.webhook_url)
      
      // We don't have a GET for cobranca URL specifically, let's just leave it empty or fetch from user 
      // Actually /auth/login returns user. In a real scenario we could have a /settings/profile
      // For now, it will start empty.
    } catch (err) {
      console.error(err)
    }
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    alert('Copiado para a área de transferência!')
  }

  const handleRegenerate = async () => {
    if (!confirm("Atenção: o link atual para de funcionar imediatamente. Deseja continuar?")) return
    try {
      const res = await api.post('/settings/regenerate-token')
      setWebhookUrl(res.data.webhook_url)
    } catch (err) {
      alert("Erro ao regenerar")
    }
  }

  const handleSaveCobrancaUrl = async (e) => {
    e.preventDefault()
    try {
      await api.put('/settings/webhook-cobranca', { url: cobrancaUrl })
      alert("URL de cobrança salva com sucesso!")
    } catch (err) {
      alert("Erro ao salvar URL")
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passwords.new !== passwords.confirm) {
        return alert("As senhas não coincidem")
    }
    try {
      await api.put('/dashboard/change-password', { 
        current_password: passwords.current, 
        new_password: passwords.new 
      })
      alert("Senha alterada com sucesso!")
      setPasswords({ current: '', new: '', confirm: '' })
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao alterar senha")
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Configurações</h1>
        <p className="text-gray-400">Gerencie integrações e segurança da sua conta</p>
      </div>

      {user?.parent_name && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="text-yellow-500 flex-shrink-0" />
          <p className="text-yellow-200 text-sm">
            <strong>Aviso de Dependência:</strong> Esta conta está atrelada e consome os limites pertencentes a <strong>{user.parent_name}</strong>.
          </p>
        </div>
      )}

      <div className="grid gap-6">
        {/* Keedpay Integration */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
           <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2 mb-4">
             <Link2 className="text-blue-500"/> Webhook de Recebimento (Keedpay)
           </h2>
           <p className="text-gray-400 text-sm mb-4">Cole esta URL no painel da Keedpay para enviar automaticamente os dados de novos pedidos para o RastroFlow.</p>
           
           <div className="flex bg-gray-900 border border-gray-700 rounded-xl overflow-hidden mt-2">
             <div className="px-4 py-3 flex-1 overflow-hidden">
               <code className="text-green-400 text-sm break-all">{webhookUrl || 'Carregando...'}</code>
             </div>
             <button 
                onClick={() => handleCopy(webhookUrl)}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-3 text-white transition-colors flex items-center gap-2 border-l border-gray-600"
             >
               <Copy size={16}/> Copiar
             </button>
           </div>
           
           <div className="mt-4 pt-4 border-t border-gray-700">
             <button 
                onClick={handleRegenerate}
                className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                title="Gera um novo endpoint. O antigo deixará de funcionar."
             >
               <RefreshCw size={14}/> Gerar novo link de integração
             </button>
           </div>
        </div>

        {/* Cobrança Integration */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
           <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2 mb-4">
             <Link2 className="text-emerald-500"/> Webhook de Cobrança
           </h2>
           <p className="text-gray-400 text-sm mb-5">
             Cole aqui a URL (por exemplo, Make/Integromat ou n8n) para onde o RastroFlow enviará os dados  quando você clicar no botão <b>[Cobrar]</b> de uma encomenda.
           </p>
           
           <form onSubmit={handleSaveCobrancaUrl} className="flex flex-col sm:flex-row gap-3">
             <input 
                type="url"
                required
                placeholder="https://sua-url-de-automacao.com/webhook/..."
                value={cobrancaUrl}
                onChange={e => setCobrancaUrl(e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder-gray-600"
             />
             <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
               <Save size={18}/> Salvar URL
             </button>
           </form>
        </div>

        {/* Password */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-1 h-full bg-gray-500"></div>
           <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2 mb-6">
             <KeyRound className="text-gray-400"/> Segurança
           </h2>
           
           <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
             <div>
               <label className="block text-sm font-medium text-gray-400 mb-1.5">Senha Atual</label>
               <input 
                 type="password" required
                 value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})}
                 className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-green-500 outline-none"
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-400 mb-1.5">Nova Senha</label>
               <input 
                 type="password" required minLength={6}
                 value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})}
                 className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-green-500 outline-none"
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-400 mb-1.5">Confirmar Nova Senha</label>
               <input 
                 type="password" required minLength={6}
                 value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                 className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-green-500 outline-none"
               />
             </div>
             
             <button type="submit" className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-xl transition-all border border-gray-600">
               Alterar Senha
             </button>
           </form>
        </div>
      </div>
    </div>
  )
}
