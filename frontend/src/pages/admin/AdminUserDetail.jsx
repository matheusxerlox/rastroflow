import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, ShieldBan, ShieldCheck, Plus, Link2, KeyRound, Mail, Trash2, UploadCloud, Download, Eye } from 'lucide-react'
import api from '../../lib/axios'
import AdminUserShipmentsModal from '../../components/admin/AdminUserShipmentsModal'

export default function AdminUserDetail() {
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  
  const [quotaAmount, setQuotaAmount] = useState(100)
  const [quotaMotivo, setQuotaMotivo] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [newExpirationDate, setNewExpirationDate] = useState('')
  const [editingExpiration, setEditingExpiration] = useState(false)

  const [csvFile, setCsvFile] = useState(null)
  const [csvLoading, setCsvLoading] = useState(false)
  const [csvResult, setCsvResult] = useState(null)

  const [showUserViewModal, setShowUserViewModal] = useState(false)

  const [dependents, setDependents] = useState([])
  const [newDependentName, setNewDependentName] = useState('')
  const [newDependentEmail, setNewDependentEmail] = useState('')
  const [loadingDependents, setLoadingDependents] = useState(false)

  const fetchDependents = async () => {
    try {
      const res = await api.get(`/admin/users/${id}/dependents`)
      setDependents(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchUser = async () => {
    try {
      const res = await api.get(`/admin/users/${id}`)
      setUser(res.data)
      if (res.data.plano_expira_em) {
        const d = new Date(res.data.plano_expira_em)
        const local = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
        setNewExpirationDate(local)
      } else {
        const d = new Date()
        d.setDate(d.getDate() + 30)
        const local = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
        setNewExpirationDate(local)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
    fetchDependents()
  }, [id])

  const handleAddDependent = async (e) => {
    e.preventDefault()
    if (!newDependentEmail || !newDependentName) return
    try {
      setLoadingDependents(true)
      await api.post(`/admin/users/${id}/dependents`, { name: newDependentName, email: newDependentEmail })
      alert("Dependente adicionado com sucesso!")
      setNewDependentName('')
      setNewDependentEmail('')
      fetchDependents()
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao adicionar dependente")
    } finally {
      setLoadingDependents(false)
    }
  }

  const handleRemoveDependent = async (dependentId) => {
    if (!confirm("Deseja realmente remover este dependente?")) return
    try {
      await api.delete(`/admin/users/${id}/dependents/${dependentId}`)
      alert("Dependente removido!")
      fetchDependents()
    } catch (err) {
      alert("Erro ao remover dependente")
    }
  }

  const handleToggleActive = async () => {
    if (!confirm(`Deseja realmente ${user.is_active ? 'bloquear' : 'desbloquear'} este usuário?`)) return
    try {
      await api.put(`/admin/users/${id}/toggle-active`)
      fetchUser()
    } catch (err) {
      alert("Erro ao alterar status")
    }
  }

  const handleAddQuota = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/admin/users/${id}/add-quota`, { quantidade: Number(quotaAmount), motivo: quotaMotivo })
      alert("Limite adicionado com sucesso!")
      setQuotaAmount(100)
      setQuotaMotivo('')
    } catch (err) {
      alert("Erro ao adicionar limite")
    }
  }

  const handleDelete = async () => {
    if (!confirm('Esta ação excluirá o usuário, histórico de logs, encomendas e limites associados. Processo IRREVERSÍVEL. Deseja prosseguir de forma definitiva?')) return
    try {
      await api.delete(`/admin/users/${id}`)
      alert("Usuário e todos os seus dados foram apagados permanentemente.")
      navigate("/admin/users")
    } catch(err) {
      alert("Erro ao excluir usuário")
    }
  }

  const handleResetEmail = async () => {
    if (!confirm('Deseja enviar um link de redefinição de senha para o email do usuário?')) return
    try {
      await api.post(`/admin/users/${id}/reset-password-email`)
      alert("Email enviado com sucesso!")
    } catch(err) {
      alert("Erro ao enviar email")
    }
  }

  const handleManualPassword = async (e) => {
    e.preventDefault()
    if(!newPassword) return
    if (!confirm('Forçar a alteração de senha deste usuário?')) return
    try {
      await api.post(`/admin/users/${id}/set-password`, { new_password: newPassword })
      alert("Senha alterada com sucesso!")
      setNewPassword('')
    } catch(err) {
      alert("Erro ao forçar senha")
    }
  }

  const handleUpdateExpiration = async (e) => {
    e.preventDefault()
    if (!newExpirationDate) return
    try {
      const isoDate = new Date(newExpirationDate).toISOString()
      await api.put(`/admin/users/${id}/expiration`, { plano_expira_em: isoDate })
      alert("Data de expiração atualizada com sucesso!")
      setEditingExpiration(false)
      fetchUser()
    } catch(err) {
      alert("Erro ao editar data de expiração")
    }
  }

  const handleCsvUpload = async (e) => {
    e.preventDefault()
    if (!csvFile) return
    const formData = new FormData()
    formData.append('file', csvFile)
    try {
      setCsvLoading(true)
      setCsvResult(null)
      const res = await api.post(`/admin/users/${id}/shipments/csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setCsvResult(res.data)
      setCsvFile(null)
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao processar o CSV')
    } finally {
      setCsvLoading(false)
    }
  }

  if (loading) return <div className="text-gray-400">Carregando detalhes...</div>
  if (!user) return <div className="text-red-400">Usuário não encontrado.</div>

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/users" className="p-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-400 hover:text-white transition-colors border border-gray-700">
           <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-3">
             Perfil do Usuário {user.is_admin && <span className="text-xs bg-red-500/20 text-red-500 px-2 py-0.5 rounded border border-red-500/20">Acesso root</span>}
          </h1>
          <p className="text-gray-400">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="md:col-span-1 border border-gray-700 rounded-2xl p-6 shadow-xl relative overflow-hidden bg-gray-800">
           <div className={`absolute top-0 left-0 w-1 h-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
           
           <div className="flex justify-center mb-6">
             <div className="h-24 w-24 rounded-full bg-gray-700 flex items-center justify-center text-red-400 font-bold text-4xl shadow-inner border-[4px] border-gray-800">
                {user.name.charAt(0).toUpperCase()}
             </div>
           </div>

           <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white mb-1">{user.name}</h2>
              <p className="text-gray-400 text-sm mb-3">Registrado em {new Date(user.created_at).toLocaleDateString()}</p>
              
              <button 
                onClick={handleToggleActive}
                className={`w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                  user.is_active 
                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20' 
                  : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20'
                }`}
              >
                {user.is_active ? <><ShieldBan size={16}/> Revogar Acesso (Bloquear)</> : <><ShieldCheck size={16}/> Restaurar Acesso (Desbloquear)</>}
              </button>
           </div>

           <div className="space-y-4 pt-6 border-t border-gray-700/50">
             <div>
               <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Plano Atual</p>
               <p className="text-gray-200 capitalize font-medium">{user.plano}</p>
             </div>
             <div>
               <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Status Webhooks</p>
               {user.webhook_token ? (
                  <span className="flex items-center gap-1 text-emerald-400 text-sm"><Link2 size={14}/> Ativo</span>
               ) : (
                  <span className="text-gray-500 text-sm">Não Configurado</span>
               )}
             </div>

             <div className="pt-4 border-t border-gray-700/50">
               <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Data de Expiração</p>
               {!editingExpiration ? (
                 <div className="flex items-center justify-between">
                   <p className="text-gray-200 font-medium text-sm">
                     {user.plano_expira_em ? (new Date(user.plano_expira_em).toLocaleDateString() + ' às ' + new Date(user.plano_expira_em).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})) : 'Vitalício/Sem data'}
                   </p>
                   <button onClick={() => setEditingExpiration(true)} className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                     Editar
                   </button>
                 </div>
               ) : (
                 <form onSubmit={handleUpdateExpiration} className="flex flex-col gap-2 mt-2">
                   <input
                     type="datetime-local"
                     className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:ring-2 focus:ring-blue-500 w-full"
                     value={newExpirationDate}
                     onChange={(e) => setNewExpirationDate(e.target.value)}
                     required
                   />
                   <div className="flex gap-2">
                     <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors flex-1">
                       Salvar
                     </button>
                     <button type="button" onClick={() => setEditingExpiration(false)} className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors">
                       Cancelar
                     </button>
                   </div>
                 </form>
               )}
             </div>
             
             <div className="pt-4 pb-2">
               <button 
                 onClick={() => setShowUserViewModal(true)}
                 className="w-full bg-gray-900 border border-gray-700 hover:bg-gray-800 hover:border-gray-600 text-gray-300 transition-all font-medium py-3 rounded-xl flex justify-center items-center gap-2 text-sm shadow-inner shadow-white/5 active:scale-[0.98]"
               >
                 <Eye size={18} className="text-green-400" /> Visão do Usuário
               </button>
             </div>
           </div>
        </div>

        {/* Actions Card */}
        <div className="md:col-span-2 space-y-6">
           
           {/* Adicionar Quota Manual */}
           <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
             <h3 className="text-lg font-bold text-gray-100 mb-4 flex items-center gap-2">
               <Plus className="text-green-500" /> Injeção Manual de Limite
             </h3>
             <p className="text-gray-400 text-sm mb-6">
               Adiciona limite extra para o mês atual deste usuário. Útil como bônus ou compensações.
             </p>
             
             <form onSubmit={handleAddQuota} className="flex flex-col sm:flex-row gap-4">
                <input 
                  type="number" min="1" required
                  placeholder="Qtd (ex: 100)"
                  className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-green-500 outline-none w-32"
                  value={quotaAmount} onChange={e => setQuotaAmount(e.target.value)}
                />
                <input 
                  type="text" required
                  placeholder="Motivo (Reembolso, Bônus, Cortesia...)"
                  className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-green-500 outline-none flex-1"
                  value={quotaMotivo} onChange={e => setQuotaMotivo(e.target.value)}
                />
                <button type="submit" className="bg-green-600 hover:bg-green-500 text-white font-medium px-6 py-2 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 whitespace-nowrap">
                   Injetar Limite
                </button>
             </form>
           </div>

           {/* Ações de Segurança e Conta */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
             
             {/* Redefinição de Senha */}
             <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
               <h3 className="text-lg font-bold text-gray-100 mb-4 flex items-center gap-2">
                 <KeyRound className="text-blue-500" /> Senha e Acesso
               </h3>
               
               <button onClick={handleResetEmail} className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 px-4 py-2 rounded-xl transition-all font-medium text-sm flex justify-center items-center gap-2 mb-4">
                  <Mail size={16}/> Enviar Link de Reset por E-mail
               </button>

               <div className="relative flex py-2 items-center">
                 <div className="flex-grow border-t border-gray-700"></div>
                 <span className="flex-shrink-0 mx-4 text-gray-500 text-xs uppercase">OU DEFINIR MANUALMENTE</span>
                 <div className="flex-grow border-t border-gray-700"></div>
               </div>

               <form onSubmit={handleManualPassword} className="flex flex-col gap-3 mt-2">
                 <input 
                   type="text" required placeholder="Nova senha forçada"
                   className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none w-full"
                   value={newPassword} onChange={e => setNewPassword(e.target.value)}
                 />
                 <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-medium text-sm transition-all shadow-lg">
                   Salvar Nova Senha
                 </button>
               </form>
             </div>

             {/* Deletar Conta Permanente */}
             <div className="bg-gray-800 border border-red-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-[100px] -z-10 blur-2xl"></div>
               <h3 className="text-lg font-bold text-red-500 mb-4 flex items-center gap-2">
                 <Trash2 /> Exclusão Definitiva
               </h3>
               <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                 O botão abaixo apaga o usuário instântaneamente. Essa exclusão deleta todos os dados associados a esta conta no banco de dados. <strong>Processo completamente irreversível.</strong>
               </p>
               
               <button onClick={handleDelete} className="w-full bg-red-600 hover:bg-red-500 text-white font-medium px-4 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)] flex items-center justify-center gap-2">
                 Apagar Conta Permanentemente
               </button>
             </div>

           </div>

           {/* Importar Encomendas via CSV */}
           <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl mt-6">
             <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
               <UploadCloud className="text-green-500" /> Importar Encomendas via CSV
             </h3>
             <p className="text-gray-400 text-sm mb-4">
               Suba um arquivo CSV com os pedidos em rota para este usuário. As encomendas serão adicionadas à lista dele e registradas automaticamente no 17TRACK.
             </p>

             <a
               href="/modelo_importacao.csv"
               download
               className="inline-flex items-center gap-2 text-sm text-green-400 hover:text-green-300 mb-5 transition-colors"
             >
               <Download size={14} /> Baixar planilha modelo
             </a>

             <form onSubmit={handleCsvUpload} className="flex flex-col gap-4">
               <div className="flex items-center gap-4">
                 <label className="flex-1 border-2 border-dashed border-gray-600 hover:border-green-500 rounded-xl p-4 cursor-pointer text-center transition-colors group">
                   <UploadCloud className="mx-auto mb-2 text-gray-500 group-hover:text-green-500 transition-colors" size={24} />
                   <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">
                     {csvFile ? csvFile.name : 'Clique para selecionar o arquivo .csv'}
                   </span>
                   <input
                     type="file"
                     accept=".csv"
                     className="hidden"
                     onChange={(e) => { setCsvFile(e.target.files[0]); setCsvResult(null); }}
                   />
                 </label>
               </div>

               <button
                 type="submit"
                 disabled={!csvFile || csvLoading}
                 className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-medium px-6 py-2.5 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
               >
                 {csvLoading ? 'Processando...' : 'Importar Encomendas'}
               </button>
             </form>

             {csvResult && (
               <div className="mt-4 p-4 bg-gray-900 border border-gray-700 rounded-xl text-sm space-y-1">
                 <p className="text-emerald-400 font-medium">✅ {csvResult.adicionadas} encomendas adicionadas</p>
                 {csvResult.ignoradas_duplicidade > 0 && (
                   <p className="text-amber-400">⚠️ {csvResult.ignoradas_duplicidade} ignoradas (já existiam)</p>
                 )}
                 {csvResult.ignoradas_limite > 0 && (
                   <p className="text-red-400">❌ {csvResult.ignoradas_limite} bloqueadas (limite insuficiente)</p>
                 )}
               </div>
             )}
           </div>

           {/* Gerenciar Dependentes */}
           <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl mt-6">
             <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
               <User className="text-blue-500" /> Contas Dependentes
             </h3>
             <p className="text-gray-400 text-sm mb-4">
               Estas contas consumirão a Cota Mensal desta conta principal para rastreamentos e envios. Ambas mantêm credenciais separadas.
             </p>
             
             <form onSubmit={handleAddDependent} className="flex flex-col sm:flex-row gap-3 mb-6">
                <input 
                  type="text" required
                  placeholder="Nome do dependente"
                  className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none w-1/4"
                  value={newDependentName} onChange={e => setNewDependentName(e.target.value)}
                />
                <input 
                  type="email" required
                  placeholder="E-mail (Se novo, receberá senha auto)"
                  className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none flex-1"
                  value={newDependentEmail} onChange={e => setNewDependentEmail(e.target.value)}
                />
                <button type="submit" disabled={loadingDependents} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-xl transition-all shadow-lg whitespace-nowrap">
                   {loadingDependents ? 'Adicionando...' : 'Adicionar Conta'}
                </button>
             </form>

             <div className="space-y-3">
               {dependents.length === 0 ? (
                 <div className="text-center py-4 bg-gray-900/50 rounded-xl border border-gray-700/50">
                    <p className="text-sm text-gray-500">Nenhum dependente vinculado.</p>
                 </div>
               ) : (
                 dependents.map(dep => (
                   <div key={dep.id} className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-xl p-3 px-4">
                      <div>
                        <p className="text-gray-200 font-medium text-sm">{dep.name}</p>
                        <p className="text-gray-500 text-xs">{dep.email}</p>
                      </div>
                      <button 
                        onClick={() => handleRemoveDependent(dep.id)}
                        className="text-red-400 hover:text-red-300 p-2 hover:bg-red-400/10 rounded-lg transition-colors border border-transparent hover:border-red-400/20"
                        title="Desvincular"
                      >
                        <Trash2 size={16} />
                      </button>
                   </div>
                 ))
               )}
             </div>
           </div>

        </div>
      </div>

      {showUserViewModal && (
        <AdminUserShipmentsModal userId={id} onClose={() => setShowUserViewModal(false)} />
      )}
    </div>
  )
}
