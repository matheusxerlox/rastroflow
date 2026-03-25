import { useState, useEffect } from 'react'
import { FileText } from 'lucide-react'
import api from '../../lib/axios'

export default function AdminLogs() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/logs?page=${page}&limit=20`)
      setLogs(res.data.items)
      setTotal(res.data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Logs do Sistema</h1>
          <p className="text-gray-400">Trilha de auditoria das ações administrativas</p>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
        <div className="overflow-x-auto rounded-xl border border-gray-700/50">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-gray-900/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Data/Hora</th>
                <th className="px-6 py-4 font-semibold">Admin (ID)</th>
                <th className="px-6 py-4 font-semibold">Ação</th>
                <th className="px-6 py-4 font-semibold">Alvo / Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="px-6 py-8 text-center">Carregando...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-8 text-center">Nenhum log encontrado.</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-300">
                      {new Date(log.feito_em).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {log.admin_id}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 bg-gray-900 text-gray-300 px-2 py-1 rounded border border-gray-700">
                         <FileText size={12}/> {log.acao}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <div className="text-xs text-gray-500 break-all">
                          {log.user_alvo_id && <div className="mb-1"><span className="text-gray-400">Target:</span> {log.user_alvo_id}</div>}
                          {log.detalhes && <div>{JSON.stringify(log.detalhes)}</div>}
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 flex justify-between items-center text-sm text-gray-400">
           <span>Mostrando {logs.length} de {total} logs</span>
           <div className="flex gap-2">
             <button 
                disabled={page === 1} 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 rounded bg-gray-900 border border-gray-700 hover:bg-gray-700 disabled:opacity-50"
             >
               Anterior
             </button>
             <button 
                disabled={logs.length < 20}
                onClick={() => setPage(p => p + 1)}
                 className="px-3 py-1 rounded bg-gray-900 border border-gray-700 hover:bg-gray-700 disabled:opacity-50"
             >
               Próxima
             </button>
           </div>
        </div>
      </div>
    </div>
  )
}
