import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Filter, MoreHorizontal, Copy, RefreshCw, Check, FileText, StickyNote, Archive } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import ShipmentDetailModal from '../components/ShipmentDetailModal'
import ShipmentNotesModal from '../components/ShipmentNotesModal'
import api from '../lib/axios'

export default function Shipments() {
  const [shipments, setShipments] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', status: '', carrier: '', sort_by: 'updated_at', sort_dir: 'desc', limit: 50 })
  const [dateFilterType, setDateFilterType] = useState('all') // 'all', 'today', '7days', 'custom'
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  
  const [selectedShipment, setSelectedShipment] = useState(null)
  const [notesShipment, setNotesShipment] = useState(null)
  const location = useLocation()
  const isArchivedView = location.pathname === '/arquivadas'
  
  // Para controlar UI do botão de dropdown
  const [openDropdown, setOpenDropdown] = useState(null)

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
      params.append('arquivada', isArchivedView)

      if (dateFilterType === 'today') {
        const today = new Date();
        today.setHours(0,0,0,0);
        params.append('date_from', new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString());
      } else if (dateFilterType === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        d.setHours(0,0,0,0);
        params.append('date_from', new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString());
      } else if (dateFilterType === 'custom') {
        if (dateFrom) {
          const dFrom = new Date(dateFrom);
          dFrom.setHours(0,0,0,0);
          params.append('date_from', new Date(dFrom.getTime() - (dFrom.getTimezoneOffset() * 60000)).toISOString());
        }
        if (dateTo) {
          const dTo = new Date(dateTo);
          dTo.setHours(23,59,59,999);
          params.append('date_to', new Date(dTo.getTime() - (dTo.getTimezoneOffset() * 60000)).toISOString());
        }
      }

      const res = await api.get(`/dashboard/shipments?${params.toString()}`)
      setShipments(res.data.items)
      setTotal(res.data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [isArchivedView])

  useEffect(() => {
    fetchShipments()
  }, [page, filters, isArchivedView, dateFilterType, dateFrom, dateTo])

  const handleCobrar = async (id, isCobrado) => {
    if (isCobrado) return
    try {
      await api.post(`/dashboard/shipments/${id}/cobrar`)
      fetchShipments()
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao cobrar')
    }
  }

  const handleReset = async (id) => {
    try {
      await api.post(`/dashboard/shipments/${id}/resetar-cobranca`)
      setOpenDropdown(null)
      fetchShipments()
    } catch (err) {
      alert('Erro ao resetar cobrança')
    }
  }

  const handleToggleArchive = async (id) => {
    try {
      await api.put(`/dashboard/shipments/${id}/archive`)
      setOpenDropdown(null)
      fetchShipments()
    } catch (err) {
      alert('Erro ao arquivar encomenda')
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">{isArchivedView ? 'Encomendas Arquivadas' : 'Gestão de Encomendas'}</h1>
        <p className="text-gray-400">{isArchivedView ? 'Guarde seu histórico de operações limpas aqui.' : 'Gerencie todos os rastreios de seus clientes'}</p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text"
              placeholder="Buscar por nome ou código..."
              className="bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-green-500 outline-none w-full"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <select 
            className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:ring-2 focus:ring-green-500 outline-none min-w-[150px]"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Status</option>
            <option value="InTransit">Em Trânsito</option>
            <option value="OutForDelivery">Saiu p/ Entrega</option>
            <option value="Delivered">Entregue</option>
            <option value="Exception">Exceção / Problema</option>
          </select>
          <select 
            className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:ring-2 focus:ring-green-500 outline-none min-w-[120px]"
            value={filters.carrier}
            onChange={(e) => setFilters({ ...filters, carrier: e.target.value })}
          >
            <option value="">Transp.</option>
            <option value="correios">Correios</option>
            <option value="jadlog">JadLog</option>
            <option value="jtexpress-br">J&T Express</option>
          </select>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <select 
            className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
            value={filters.sort_by}
            onChange={(e) => { setPage(1); setFilters({ ...filters, sort_by: e.target.value }); }}
          >
            <option value="updated_at">Data de Atualização</option>
            <option value="created_at">Data de Cadastro</option>
            <option value="delivered_at">Data de Entrega</option>
          </select>
          <select 
            className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
            value={filters.sort_dir}
            onChange={(e) => { setPage(1); setFilters({ ...filters, sort_dir: e.target.value }); }}
          >
            <option value="desc">Decrescente (Recentes primeiro)</option>
            <option value="asc">Crescente (Antigos primeiro)</option>
          </select>
          
          {/* DIVISOR DA OPÇÃO DE DATAS */}
          <div className="h-6 w-px bg-gray-700 mx-2 self-center hidden md:block"></div>
          
          <select 
            className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
            value={dateFilterType}
            onChange={(e) => { setPage(1); setDateFilterType(e.target.value); }}
          >
            <option value="all">Qualquer Data de Atualização</option>
            <option value="today">Hoje</option>
            <option value="7days">Últimos 7 dias</option>
            <option value="custom">Intervalo Personalizado</option>
          </select>

          {dateFilterType === 'custom' && (
             <div className="flex items-center gap-2">
                <input 
                  type="date"
                  className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
                  value={dateFrom}
                  onChange={(e) => { setPage(1); setDateFrom(e.target.value); }}
                  title="Data Inicial"
                />
                <span className="text-gray-500 text-sm">até</span>
                <input 
                  type="date"
                  className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
                  value={dateTo}
                  onChange={(e) => { setPage(1); setDateTo(e.target.value); }}
                  title="Data Final"
                />
             </div>
          )}
          
          <div className="flex-1"></div>
          <select 
            className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
            value={filters.limit}
            onChange={(e) => { setPage(1); setFilters({ ...filters, limit: Number(e.target.value) }); }}
          >
            <option value="10">10 por pág</option>
            <option value="20">20 por pág</option>
            <option value="50">50 por pág</option>
            <option value="100">100 por pág</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full max-w-full rounded-xl border border-gray-700/50 pb-32 min-h-[400px]">
          <table className="w-full text-sm text-left text-gray-400 min-w-[900px]">
            <thead className="text-xs text-gray-500 uppercase bg-gray-900/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Data Atualização</th>
                <th className="px-6 py-4 font-semibold">Cliente / Produto</th>
                <th className="px-6 py-4 font-semibold">Rastreio / Id</th>
                <th className="px-6 py-4 font-semibold hidden md:table-cell">Transportadora</th>
                <th className="px-6 py-4 font-semibold">Valor</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center">Carregando...</td></tr>
              ) : shipments.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center">Nenhuma encomenda encontrada.</td></tr>
              ) : (
                shipments.map((s) => (
                  <tr key={s.id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-300 text-xs">
                        {new Date(s.updated_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-200">{s.customer_name || '-'}</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{s.product_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-green-400 flex items-center gap-2">
                        {s.tracking_number}
                        <button onClick={() => navigator.clipboard.writeText(s.tracking_number)} title="Copiar rastreio">
                          <Copy size={12} className="text-gray-500 hover:text-green-400 cursor-pointer" />
                        </button>
                      </div>
                      {s.transaction_id && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs text-gray-500 font-mono truncate max-w-[160px]" title={s.transaction_id}>
                            ID: {s.transaction_id}
                          </span>
                          <button
                            onClick={() => navigator.clipboard.writeText(s.transaction_id)}
                            title="Copiar ID Transação"
                            className="flex-shrink-0"
                          >
                            <Copy size={11} className="text-gray-600 hover:text-gray-300 cursor-pointer" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell capitalize">
                      {s.carrier === 'jtexpress-br' ? 'J&T' : s.carrier}
                    </td>
                    <td className="px-6 py-4 text-green-500 font-medium whitespace-nowrap">
                      {s.amount ? `R$ ${parseFloat(s.amount).toFixed(2).replace('.', ',')}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 relative">
                        {/* Tooltip & Icon Anotação */}
                        {s.notes && (
                            <div className="relative group flex items-center justify-center mr-1">
                               <StickyNote size={18} className="text-yellow-500 cursor-pointer drop-shadow-md" />
                               <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 w-max max-w-xs bg-gray-800 border border-yellow-500/30 text-gray-200 text-xs p-3 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 break-words whitespace-pre-wrap">
                                  {s.notes}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                               </div>
                            </div>
                        )}

                        <button 
                          onClick={() => {
                            if (s.status === 'Delivered' && !s.cobrado) {
                              handleCobrar(s.id, s.cobrado)
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1 ${
                            (s.cobrado || s.status !== 'Delivered')
                              ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                              : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-400 hover:to-emerald-500 shadow-green-900/20'
                          }`}
                        >
                          {s.cobrado ? <><Check size={14}/> Cobrado</> : 'Cobrar'}
                        </button>
                        
                        <div className="relative">
                          <button 
                            onClick={() => setOpenDropdown(openDropdown === s.id ? null : s.id)}
                            className="p-1.5 rounded bg-gray-900 border border-gray-700 text-gray-400 hover:text-white transition-colors"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          
                          {openDropdown === s.id && (
                            <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-20 py-1" onMouseLeave={() => setOpenDropdown(null)}>
                              <button 
                                onClick={() => { setSelectedShipment(s); setOpenDropdown(null); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-700/50 flex items-center gap-2 transition-colors"
                              >
                                <FileText size={16} className="text-gray-400" /> Ver Detalhes
                              </button>
                              <button 
                                onClick={() => { setNotesShipment(s); setOpenDropdown(null); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-700/50 flex items-center gap-2 transition-colors"
                              >
                                <StickyNote size={16} className="text-yellow-500" /> Anotações
                              </button>
                              
                              {s.status === 'Delivered' && (
                                <button 
                                  onClick={() => handleToggleArchive(s.id)}
                                  className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-700/50 flex items-center gap-2 transition-colors"
                                >
                                  <Archive size={16} className="text-gray-400" /> {isArchivedView ? 'Desarquivar' : 'Arquivar'}
                                </button>
                              )}
                              
                              <div className="h-px bg-gray-700 my-1"></div>
                              <button 
                                onClick={() => handleReset(s.id)}
                                className="w-full text-left px-4 py-2.5 text-sm text-orange-400 hover:bg-gray-700/50 flex items-center gap-2 transition-colors"
                              >
                                <RefreshCw size={16} /> Resetar e Cobrar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
           <span>Mostrando {shipments.length} de {total} resultados</span>
           <div className="flex gap-2 mt-4 md:mt-0">
             <button 
                disabled={page === 1} 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 rounded bg-gray-900 border border-gray-700 hover:bg-gray-700 disabled:opacity-50"
             >
               Anterior
             </button>
             <button 
                disabled={shipments.length < 10}
                onClick={() => setPage(p => p + 1)}
                 className="px-3 py-1 rounded bg-gray-900 border border-gray-700 hover:bg-gray-700 disabled:opacity-50"
             >
               Próxima
             </button>
           </div>
        </div>
      </div>

      {selectedShipment && (
        <ShipmentDetailModal 
          shipment={selectedShipment} 
          onClose={() => setSelectedShipment(null)} 
        />
      )}

      {notesShipment && (
        <ShipmentNotesModal 
          shipment={notesShipment} 
          onClose={() => setNotesShipment(null)} 
          onSave={() => { setNotesShipment(null); fetchShipments(); }}
        />
      )}
    </div>
  )
}
