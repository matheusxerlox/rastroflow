import { useState, useEffect, useRef } from 'react'
import { Megaphone, Code2, Eye, Save, Power, PowerOff, RotateCcw, Users, Trash2, Calendar } from 'lucide-react'
import api from '../../lib/axios'

export default function AdminCommunication() {
  const [ann, setAnn] = useState(null)
  const [htmlContent, setHtmlContent] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [showCode, setShowCode] = useState(true)
  const [confirmations, setConfirmations] = useState([])
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('success')
  const [loading, setLoading] = useState(false)
  const previewRef = useRef(null)

  useEffect(() => {
    fetchAnnouncement()
    fetchConfirmations()
  }, [])

  const showMsg = (text, type = 'success') => {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  const fetchAnnouncement = async () => {
    try {
      const res = await api.get('/admin/announcement')
      const data = res.data
      setAnn(data)
      setHtmlContent(data.html_content || '')
      setStartAt(data.start_at ? data.start_at.slice(0, 16) : '')
      setEndAt(data.end_at ? data.end_at.slice(0, 16) : '')
    } catch (err) {
      console.error(err)
    }
  }

  const fetchConfirmations = async () => {
    try {
      const res = await api.get('/admin/announcement/confirmations')
      setConfirmations(res.data)
    } catch (err) {
      setConfirmations([])
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await api.put('/admin/announcement', {
        html_content: htmlContent,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        end_at: endAt ? new Date(endAt).toISOString() : null,
      })
      showMsg('✅ Comunicado salvo! (continua desativado até você ativar)')
      await fetchAnnouncement()
      await fetchConfirmations()
    } catch (err) {
      showMsg('❌ Erro ao salvar', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async () => {
    try {
      const res = await api.post('/admin/announcement/toggle')
      setAnn(prev => ({ ...prev, is_active: res.data.is_active }))
      showMsg(res.data.is_active ? '🟢 Comunicado ATIVADO — usuários verão o modal' : '🔴 Comunicado DESATIVADO')
    } catch (err) {
      showMsg('❌ Erro ao alterar status', 'error')
    }
  }

  const handleResetAll = async () => {
    if (!confirm('Resetar todas as confirmações? O modal reaparecerá para todos os usuários.')) return
    try {
      await api.delete('/admin/announcement/confirmations')
      showMsg('🗑️ Todas as confirmações resetadas.')
      fetchConfirmations()
    } catch (err) {
      showMsg('❌ Erro ao resetar', 'error')
    }
  }

  const handleResetUser = async (userId) => {
    try {
      await api.delete(`/admin/announcement/confirmations/${userId}`)
      showMsg('✅ Confirmação do usuário resetada.')
      fetchConfirmations()
    } catch (err) {
      showMsg('❌ Erro', 'error')
    }
  }

  const previewHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: system-ui, sans-serif; background: #1f2937; color: #f3f4f6; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        </style>
      </head>
      <body>${htmlContent}</body>
    </html>
  `

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Megaphone className="text-orange-400" /> Comunicação
          </h1>
          <p className="text-gray-400 text-sm mt-1">Publique comunicados em HTML para todos os usuários da plataforma.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
            ann?.is_active
              ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : 'bg-gray-700 text-gray-400 border-gray-600'
          }`}>
            {ann?.is_active ? '🟢 Ativo' : '⚫ Inativo'}
          </span>
          <button
            onClick={handleToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all text-sm ${
              ann?.is_active
                ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                : 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
            }`}
          >
            {ann?.is_active ? <><PowerOff size={16}/> Desativar</> : <><Power size={16}/> Ativar</>}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          msgType === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
        }`}>
          {msg}
        </div>
      )}

      {/* Editor */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-100">Editor HTML + CSS</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCode(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                showCode ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              <Code2 size={15}/> Código
            </button>
            <button
              onClick={() => setShowCode(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                !showCode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              <Eye size={15}/> Preview
            </button>
          </div>
        </div>

        {showCode ? (
          <div>
            <p className="text-xs text-gray-500 mb-2">Cole seu HTML e CSS abaixo. Links de imagem são renderizados automaticamente.</p>
            <textarea
              className="w-full h-64 bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm text-green-400 font-mono outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500 custom-scrollbar resize-y transition-colors"
              placeholder={'<div style="text-align:center; padding:24px">\n  <h2 style="color:#f97316">🚀 Novidade!</h2>\n  <p>Texto do comunicado aqui...</p>\n  <img src="https://url-da-imagem.com/img.png" style="max-width:100%; border-radius:12px; margin-top:16px" />\n</div>'}
              value={htmlContent}
              onChange={e => setHtmlContent(e.target.value)}
            />
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-500 mb-2">Visualização de como o comunicado aparecerá para os usuários dentro do modal.</p>
            <div className="border border-gray-700 rounded-xl overflow-hidden" style={{ height: '300px' }}>
              {htmlContent ? (
                <iframe
                  srcDoc={previewHtml}
                  sandbox="allow-same-origin"
                  className="w-full h-full"
                  title="preview"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-600 text-sm">
                  Nenhum conteúdo para visualizar
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Configurações de exibição */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-blue-400"/> Período de Exibição
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Define a janela de tempo em que o modal será exibido. Deixe em branco para exibir sempre que estiver ativo.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Início (opcional)</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={e => setStartAt(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Fim (opcional)</label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={e => setEndAt(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            />
          </div>
        </div>
        {startAt || endAt ? (
          <p className="text-xs text-orange-400 mt-3">
            📅 Exibindo para todos os usuários {startAt ? `a partir de ${new Date(startAt).toLocaleString('pt-BR')}` : ''}{startAt && endAt ? ' ' : ''}{endAt ? `até ${new Date(endAt).toLocaleString('pt-BR')}` : ''}
          </p>
        ) : null}
      </div>

      {/* Botão Salvar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <button
          onClick={handleSave}
          disabled={loading || !htmlContent.trim()}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl shadow-lg hover:from-orange-400 hover:to-amber-500 transition-all disabled:opacity-50"
        >
          <Save size={18}/> {loading ? 'Salvando...' : 'Salvar Comunicado'}
        </button>
        <p className="text-xs text-gray-500 self-center">
          {ann?.version ? `Versão atual: v${ann.version}` : ''} — Ao salvar com novo conteúdo, a versão é incrementada e as confirmações são zeradas automaticamente.
        </p>
      </div>

      {/* Lista de confirmações */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <Users size={18} className="text-purple-400"/> Confirmações — v{ann?.version}
            <span className="text-sm font-normal text-gray-400">({confirmations.length} usuário{confirmations.length !== 1 ? 's' : ''})</span>
          </h2>
          {confirmations.length > 0 && (
            <button
              onClick={handleResetAll}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 border border-red-500/20 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all"
            >
              <RotateCcw size={14}/> Resetar todos
            </button>
          )}
        </div>

        {confirmations.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">Nenhum usuário confirmou ainda nesta versão.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
                  <th className="pb-3 font-semibold">Usuário</th>
                  <th className="pb-3 font-semibold">Email</th>
                  <th className="pb-3 font-semibold">Confirmado em</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {confirmations.map(c => (
                  <tr key={c.confirmation_id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="py-3 font-medium text-gray-200">{c.user_name}</td>
                    <td className="py-3 text-gray-400">{c.user_email}</td>
                    <td className="py-3 text-gray-400">
                      {c.confirmed_at ? new Date(c.confirmed_at).toLocaleString('pt-BR') : '—'}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleResetUser(c.user_id)}
                        className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded"
                        title="Resetar confirmação"
                      >
                        <Trash2 size={14}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
