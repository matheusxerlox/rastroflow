import React, { useState, useEffect } from 'react'
import { X, Search, Filter, Trash2, Copy, AlertTriangle } from 'lucide-react'
import StatusBadge from '../StatusBadge'
import api from '../../lib/axios'

export default function AdminUserShipmentsModal({ userId, onClose }) {
  const [shipments, setShipments] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', status: '', carrier: '', sort_by: 'updated_at', sort_dir: 'desc', limit: 50 })
  
  const [selectedIds, setSelectedIds] = useState([])
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [deletePermanent, setDeletePermanent] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchShipments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page)
      params.append('limit', filters.limit)
      params.append('sort_by', filters.sort_by)
      params.append('sort_dir', filters.sort_dir)
      if (filters.search) params.append('search', filters.search)
      if (filters.status) params.append('status', filters.status)
      if (filters.carrier) params.append('carrier', filters.carrier)

      const res = await api.get(`/admin/users/${userId}/shipments?${params.toString()}`)
      setShipments(res.data.items)
      setTotal(res.data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchShipments()
    setSelectedIds([])
  }, [page, filters, userId])

  const toggleSelection = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const toggleAll = () => {
    if (selectedIds.length === shipments.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(shipments.map(s => s.id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setDeleteLoading(true)
    try {
      await api.delete(`/admin/users/${userId}/shipments/bulk`, {
        data: {
          shipment_ids: selectedIds,
          permanent: deletePermanent
        }
      })
      setShowConfirmDelete(false)
      setSelectedIds([])
      fetchShipments()
    } catch (err) {
      alert("Erro ao excluir encomendas")
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-[90vw] h-[90vh] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
             <h2 className="text-2xl font-bold text-white">Visão Analítica de Encomendas do Usuário</h2>
             <p className="text-gray-400 text-sm mt-1">Total: {total} encomendas encontradas</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-6 border-b border-gray-800 flex flex-wrap gap-4 items-center justify-between bg-gray-800/50">
          <div className="flex flex-wrap gap-4 flex-1">
            <div className="relative min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="text"
                placeholder="Buscar rastreio, cliente ou produto..."
                className="bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-green-500 outline-none w-full"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <select 
              className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
              value={filters.status}
              onChange={(e) => { setPage(1); setFilters({ ...filters, status: e.target.value }); }}
            >
              <option value="">Status</option>
              <option value="InTransit">Em Trânsito</option>
              <option value="OutForDelivery">Saiu p/ Entrega</option>
              <option value="Delivered">Entregue</option>
              <option value="Exception">Exceção / Problema</option>
            </select>
          </div>
          
          {selectedIds.length > 0 && (
             <button 
               onClick={() => setShowConfirmDelete(true)}
               className="bg-red-600 hover:bg-red-500 text-white font-medium px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-red-900/20"
             >
               <Trash2 size={18} /> Excluir {selectedIds.length} Selecionados
             </button>
          )}
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-gray-900/50 sticky top-0 z-10 shadow-sm border-b border-gray-700">
              <tr>
                <th className="px-6 py-4">
                   <input 
                      type="checkbox" 
                      onChange={toggleAll}
                      checked={shipments.length > 0 && selectedIds.length === shipments.length}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500 cursor-pointer"
                   />
                </th>
                <th className="px-6 py-4 font-semibold">Data Atualização</th>
                <th className="px-6 py-4 font-semibold">Cliente / Produto</th>
                <th className="px-6 py-4 font-semibold">Rastreio</th>
                <th className="px-6 py-4 font-semibold">Transportadora</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Valor</th>
                <th className="px-6 py-4 font-semibold text-center">Integração</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan="8" className="px-6 py-12 text-center text-lg">Carregando encomendas do usuário...</td></tr>
              ) : shipments.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-12 text-center text-lg">Nenhuma encomenda atende aos critérios.</td></tr>
              ) : (
                shipments.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                       <input 
                          type="checkbox" 
                          checked={selectedIds.includes(s.id)}
                          onChange={() => toggleSelection(s.id)}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500 cursor-pointer"
                       />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-300 text-xs">
                        {new Date(s.updated_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-200">{s.customer_name || '-'}</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]" title={s.product_name}>{s.product_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-green-400 flex items-center gap-2">
                        {s.tracking_number}
                        <button onClick={() => navigator.clipboard.writeText(s.tracking_number)} title="Copiar">
                          <Copy size={12} className="text-gray-500 hover:text-green-400 cursor-pointer" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 capitalize">{s.carrier === 'jtexpress-br' ? 'J&T' : s.carrier || '-'}</td>
                    <td className="px-6 py-4"><StatusBadge status={s.status} /></td>
                    <td className="px-6 py-4 text-green-500 whitespace-nowrap">
                       {s.amount ? `R$ ${parseFloat(s.amount).toFixed(2).replace('.', ',')}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-500 text-center">
                       {s.registered_17track ? <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Sincronizado</span> : <span className="text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">Pendente</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="p-6 border-t border-gray-800 flex justify-between items-center bg-gray-900 rounded-b-2xl">
           <div className="text-sm text-gray-400">Página {page} - Exibindo {shipments.length} itens</div>
           <div className="flex gap-2">
             <button 
                disabled={page === 1} 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 disabled:opacity-50 text-gray-300 font-medium transition-colors"
             >
               Anterior
             </button>
             <button 
                disabled={shipments.length < filters.limit}
                onClick={() => setPage(p => p + 1)}
                 className="px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 disabled:opacity-50 text-gray-300 font-medium transition-colors"
             >
               Próxima
             </button>
           </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmDelete(false)} />
            <div className="relative bg-gray-800 border border-red-500/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-fade-in">
               <div className="flex items-center gap-3 text-red-500 mb-4">
                  <AlertTriangle size={28} />
                  <h3 className="text-xl font-bold text-white">Confirmação de Exclusão</h3>
               </div>
               <p className="text-gray-300 mb-6 text-sm leading-relaxed">
                  Você está prestes a excluir <strong>{selectedIds.length} encomendas</strong> deste usuário. Escolha o comportamento desta exclusão:
               </p>

               <div className="space-y-4 mb-8">
                  <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${!deletePermanent ? 'border-amber-500 bg-amber-500/10' : 'border-gray-700 bg-gray-900 hover:border-gray-600'}`}>
                     <div className="flex items-start gap-4">
                        <input type="radio" checked={!deletePermanent} onChange={() => setDeletePermanent(false)} className="mt-1 w-5 h-5 text-amber-500 bg-gray-800 border-gray-600 focus:ring-amber-500" />
                        <div>
                           <p className="font-bold text-gray-100 flex items-center gap-2">1. Apenas da Rastroflow <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded uppercase border border-gray-700">Soft Delete</span></p>
                           <p className="text-xs text-gray-400 mt-1 leading-relaxed">Apaga as encomendas da lista visual e banco de dados, mas preserva os avisos dos webhooks passados e mantém as encomendas ativas na 17TRACK.</p>
                        </div>
                     </div>
                  </label>

                  <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${deletePermanent ? 'border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'border-gray-700 bg-gray-900 hover:border-gray-600'}`}>
                     <div className="flex items-start gap-4">
                        <input type="radio" checked={deletePermanent} onChange={() => setDeletePermanent(true)} className="mt-1 w-5 h-5 text-red-600 bg-gray-800 border-gray-600 focus:ring-red-600" />
                        <div>
                           <p className="font-bold text-red-400 flex items-center gap-2">2. Excluir Permanentemente <span className="text-[10px] bg-red-900/50 text-red-300 px-2 py-0.5 rounded uppercase border border-red-500/30">Hard Delete</span></p>
                           <p className="text-xs text-red-200/70 mt-1 leading-relaxed">Apaga completamente as encomendas, limpa todos os Webhooks Logs vinculados a esse rastreio e <strong>comanda a Deleção definitiva via API na 17TRACK</strong>.</p>
                        </div>
                     </div>
                  </label>
               </div>

               <div className="flex justify-end gap-3 border-t border-gray-700 pt-6">
                  <button onClick={() => setShowConfirmDelete(false)} disabled={deleteLoading} className="px-4 py-2.5 font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors">
                     Cancelar
                  </button>
                  <button onClick={handleBulkDelete} disabled={deleteLoading} className="px-6 py-2.5 font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 min-w-[200px]">
                     {deleteLoading ? 'Excluindo...' : <><Trash2 size={18}/> Confirmar Exclusão</>}
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  )
}
