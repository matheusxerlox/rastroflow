import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { Search, ChevronLeft, ChevronRight, Activity, X } from 'lucide-react';

export default function AdminWebhookLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState("");

  const [selectedPayload, setSelectedPayload] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, [page, search, provider, status]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      if (provider) params.provider = provider;
      if (status) params.status = status;

      const res = await api.get('/admin/webhook-logs', { params });
      setLogs(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-white">Logs de Webhooks</h1>
        <p className="text-gray-400 text-sm mt-1">Total: {total}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código de rastreio ou conteúdo do json..."
            value={search}
            onChange={handleSearch}
            className="w-full bg-[#111] border border-gray-800 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-brand-500"
          />
        </div>
        
        <select
          value={provider}
          onChange={(e) => { setProvider(e.target.value); setPage(1); }}
          className="bg-[#111] border border-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-brand-500 sm:w-48"
        >
          <option value="">Todos os Provedores</option>
          <option value="17track">17TRACK</option>
          <option value="keedpay">Keedpay</option>
          <option value="cakto">Cakto</option>
        </select>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="bg-[#111] border border-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-brand-500 sm:w-48"
        >
          <option value="">Status de Processamento</option>
          <option value="processed">Aplicado (Sim)</option>
          <option value="unprocessed">Não Aplicado</option>
        </select>
      </div>

      <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-[#1a1a1a] text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium">Provider</th>
                <th className="px-6 py-4 font-medium">Tracking</th>
                <th className="px-6 py-4 font-medium">Usuário</th>
                <th className="px-6 py-4 font-medium">Disponibilizado</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Nenhum webhook encontrado
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(log.received_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs">
                        {log.provider}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.tracking_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.user_email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.processed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-500">
                          Sim
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-500/10 text-gray-500">
                          Não
                        </span>
                      )}
                      {log.error_message && (
                        <p className="text-red-400 text-xs mt-1 truncate max-w-[150px]" title={log.error_message}>{log.error_message}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedPayload(log.payload)}
                        className="text-brand-500 hover:text-brand-400 transition-colors bg-brand-500/10 hover:bg-brand-500/20 px-3 py-1 rounded"
                      >
                        Ver JSON
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
            <span className="text-sm text-gray-400">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded bg-[#1a1a1a] text-gray-400 hover:text-white disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded bg-[#1a1a1a] text-gray-400 hover:text-white disabled:opacity-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPayload(null)} />
          <div className="relative w-full max-w-4xl bg-[#111] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-brand-500" />
                Payload do Webhook
              </h2>
              <button onClick={() => setSelectedPayload(null)} className="text-gray-400 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#0a0a0a]">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap break-all">
                {JSON.stringify(selectedPayload, null, 2)}
              </pre>
            </div>
            <div className="p-4 border-t border-gray-800 flex justify-end bg-[#111]">
               <button onClick={() => setSelectedPayload(null)} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition">
                 Fechar
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
