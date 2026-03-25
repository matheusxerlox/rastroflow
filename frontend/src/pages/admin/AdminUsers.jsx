import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserPlus, ShieldBan, ShieldCheck, ChevronRight } from 'lucide-react'
import api from '../../lib/axios'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Modal State for create user
  const [showCreateDrawer, setShowCreateDrawer] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', quota_base: 300, plano_expira_em: '' })
  const [createLoading, setCreateLoading] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      p.append('page', page)
      p.append('limit', 15)
      if (search) p.append('search', search)
      
      const res = await api.get(`/admin/users?${p.toString()}`)
      setUsers(res.data.items)
      setTotal(res.data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, search])

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setCreateLoading(true)
    try {
      const payload = { ...newUser }
      payload.quota_base = Number(payload.quota_base) || 300
      if (!payload.plano_expira_em) {
         payload.plano_expira_em = null
      } else {
         payload.plano_expira_em = `${payload.plano_expira_em}T23:59:59Z`
      }
      
      await api.post('/admin/users', payload)
      alert("Usuário criado. Email com senha enviado com sucesso.")
      setShowCreateDrawer(false)
      setNewUser({ name: '', email: '', quota_base: 300, plano_expira_em: '' })
      fetchUsers()
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao criar")
    } finally {
      setCreateLoading(false)
    }
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Gestão de Usuários</h1>
        </div>
        <button 
          onClick={() => setShowCreateDrawer(true)}
          className="bg-red-600 hover:bg-red-500 text-white font-medium px-4 py-2 rounded-xl transition-all shadow-lg shadow-red-900/20 flex items-center gap-2 text-sm"
        >
          <UserPlus size={18} /> Novo Usuário
        </button>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
        <div className="mb-6 relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
           <input 
             type="text"
             placeholder="Buscar por nome ou e-mail..."
             className="bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-red-500 outline-none w-full max-w-md"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-700/50">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-gray-900/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Usuário</th>
                <th className="px-6 py-4 font-semibold">Conta / Plano</th>
                <th className="px-6 py-4 font-semibold">Expira</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center">Carregando...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center">Nenhum encontrado.</td></tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-red-400 font-bold shrink-0">
                           {u.name.charAt(0).toUpperCase()}
                         </div>
                         <div>
                            <div className="font-medium text-gray-200">{u.name} {u.is_admin && <span className="ml-2 text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20">ADMIN</span>}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{u.email}</div>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="capitalize text-gray-300 font-medium">{u.plano}</span>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-gray-300 font-medium whitespace-nowrap">
                         {u.plano_expira_em ? new Date(u.plano_expira_em).toLocaleDateString('pt-BR') : '-'}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full text-xs font-semibold border border-emerald-500/20 whitespace-nowrap">
                          <ShieldCheck size={12}/> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400 bg-red-400/10 px-2 py-1 rounded-full text-xs font-semibold border border-red-500/20 whitespace-nowrap">
                          <ShieldBan size={12}/> Bloqueado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <Link to={`/admin/users/${u.id}`} className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-white bg-gray-900 border border-gray-700 hover:border-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                         <ChevronRight size={18} />
                       </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
           <div className="w-full max-w-md bg-gray-800 h-full border-l border-gray-700 p-6 flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                 <h2 className="text-xl font-bold text-gray-100">Novo Usuário Manual</h2>
                 <button onClick={() => setShowCreateDrawer(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleCreateUser} className="flex-1 overflow-y-auto space-y-6">
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2">Nome Completo</label>
                   <input 
                     type="text" required
                     placeholder="João da Silva"
                     className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500 outline-none w-full"
                     value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2">E-mail</label>
                   <input 
                     type="email" required
                     placeholder="joao@example.com"
                     className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500 outline-none w-full"
                     value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                   />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-300 mb-2">Limite Mensal</label>
                     <input 
                       type="number" required min="1"
                       className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500 outline-none w-full"
                       value={newUser.quota_base} onChange={e => setNewUser({...newUser, quota_base: e.target.value})}
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-300 mb-2">Data Expiração (Opc.)</label>
                     <input 
                       type="date"
                       className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500 outline-none w-full"
                       value={newUser.plano_expira_em} onChange={e => setNewUser({...newUser, plano_expira_em: e.target.value})}
                     />
                   </div>
                 </div>

                 <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl">
                   <p className="text-xs text-orange-400 font-medium leading-relaxed">
                     Uma senha forte aleatória será gerada e enviada para o e-mail cadastrado usando o template de Boas-vindas (Welcome Email).
                   </p>
                 </div>

                 <button 
                  type="submit" 
                  disabled={createLoading}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg flex justify-center items-center mt-auto disabled:opacity-50"
                >
                  {createLoading ? 'Criando...' : 'Criar Conta'}
                </button>
              </form>
           </div>
        </div>
      )}
    </div>
  )
}
