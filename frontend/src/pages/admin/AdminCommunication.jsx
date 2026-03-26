import { useState, useEffect, useRef } from 'react'
import { Megaphone, Code2, Eye, Save, Power, PowerOff, RotateCcw, Users, Trash2, Calendar, FlaskConical } from 'lucide-react'
import api from '../../lib/axios'
import AnnouncementModal from '../../components/AnnouncementModal'
import { useAuth } from '../../context/AuthContext'

export default function AdminCommunication() {
  const { user } = useAuth()
  const [ann, setAnn] = useState(null)
  const [htmlContent, setHtmlContent] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [showCode, setShowCode] = useState(true)
  const [confirmations, setConfirmations] = useState([])
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('success')
  const [loading, setLoading] = useState(false)
  const [testMode, setTestMode] = useState(false)
  const [testAnnouncement, setTestAnnouncement] = useState(null)

  useEffect(() => {
    fetchAnnouncement()
    fetchConfirmations()
  }, [])

  const showMsg = (text, type = 'success') => {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(''), 5000)
  }

  const fetchAnnouncement = async () => {
    try {
      const res = await api.get('/admin/announcement')
      const data = res.data
      setAnn(data)
      setHtmlContent(data.html_content || '')
      setStartAt(data.start_at ? data.start_at.slice(0, 16) : '')
      setEndAt(data.end_at ? data.end_at.slice(0, 16) : '')
    } catch (err) { console.error(err) }
  }

  const fetchConfirmations = async () => {
    try {
      const res = await api.get('/admin/announcement/confirmations')
      setConfirmations(res.data)
    } catch { setConfirmations([]) }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await api.put('/admin/announcement', {
        html_content: htmlContent,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        end_at: endAt ? new Date(endAt).toISOString() : null,
      })
      showMsg('✅ Comunicado salvo! O conteúdo só será exibido quando você ativar.')
      await fetchAnnouncement()
      await fetchConfirmations()
    } catch { showMsg('❌ Erro ao salvar', 'error') }
    finally { setLoading(false) }
  }

  const handleToggle = async () => {
    try {
      const res = await api.post('/admin/announcement/toggle')
      setAnn(prev => ({ ...prev, is_active: res.data.is_active }))
      showMsg(res.data.is_active
        ? '🟢 Comunicado ATIVADO — modal aparecerá para todos os usuários'
        : '🔴 Comunicado desativado — modal sumiu de todas as telas'
      )
    } catch { showMsg('❌ Erro ao alterar status', 'error') }
  }

  const handleResetAll = async () => {
    if (!confirm('Resetar TODAS as confirmações? O modal reaparecerá para todos os usuários.')) return
    try {
      await api.delete('/admin/announcement/confirmations')
      showMsg('🗑️ Lista zerada. O modal reaparecerá para todos.')
      fetchConfirmations()
    } catch { showMsg('❌ Erro ao resetar', 'error') }
  }

  const handleResetUser = async (userId) => {
    try {
      await api.delete(`/admin/announcement/confirmations/${userId}`)
      showMsg('✅ Confirmação do usuário resetada.')
      fetchConfirmations()
    } catch { showMsg('❌ Erro', 'error') }
  }

  const handleTest = () => {
    if (!htmlContent.trim()) {
      showMsg('⚠️ Adicione conteúdo HTML antes de testar.', 'error')
      return
    }
    setTestAnnouncement({ id: ann?.id, html_content: htmlContent, version: ann?.version || 1 })
    setTestMode(true)
  }

  const handleTestConfirm = async () => {
    // Admin confirma o teste — salva normalmente no banco
    if (testAnnouncement?.id) {
      try {
        await api.post(`/dashboard/announcement/${testAnnouncement.id}/confirm`)
        fetchConfirmations()
      } catch { /* silencioso */ }
    }
    setTestMode(false)
    setTestAnnouncement(null)
    showMsg('✅ Teste concluído. Seu nome foi adicionado à lista de confirmações.')
  }

  const previewHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>* { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #111827; color: #f3f4f6; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }</style>
    </head><body>${htmlContent}</body></html>`

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Megaphone className="text-green-400" /> Comunicação
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Publique comunicados em HTML para todos os usuários da plataforma.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
            ann?.is_active
              ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : 'bg-gray-700 text-gray-500 border-gray-600'
          }`}>
            {ann?.is_active ? '🟢 Ativo' : '⚫ Inativo'}
          </span>
          <button
            onClick={handleToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all text-sm border ${
              ann?.is_active
                ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                : 'bg-gradient-to-r from-green-500/10 to-emerald-600/10 text-green-400 border-green-500/20 hover:from-green-500/20 hover:to-emerald-600/20'
            }`}
          >
            {ann?.is_active ? <><PowerOff size={16}/> Desativar</> : <><Power size={16}/> Ativar</>}
          </button>
        </div>
      </div>

      {/* Feedback */}
      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
          msgType === 'error'
            ? 'bg-red-500/10 text-red-400 border-red-500/20'
            : 'bg-green-500/10 text-green-400 border-green-500/20'
        }`}>
          {msg}
        </div>
      )}

      {/* Editor */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-100">Editor HTML + CSS</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCode(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                showCode
                  ? 'bg-gradient-to-r from-green-500/10 to-emerald-600/10 text-green-400 border border-green-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              <Code2 size={15}/> Código
            </button>
            <button
              onClick={() => setShowCode(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                !showCode
                  ? 'bg-gradient-to-r from-emerald-500/10 to-teal-600/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              <Eye size={15}/> Preview
            </button>
          </div>
        </div>

        {showCode ? (
          <div>
            <p className="text-xs text-gray-500 mb-2">Cole HTML e CSS. Links de imagem são renderizados automaticamente no modal.</p>
            <textarea
              className="w-full h-64 bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm text-green-400 font-mono outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500 resize-y transition-colors"
              placeholder={'<div style="text-align:center; padding:32px; font-family:sans-serif">\n  <h2 style="color:#10b981; font-size:24px; margin-bottom:12px">🚀 Novidade!</h2>\n  <p style="color:#d1d5db">Texto do comunicado aqui...</p>\n  <!-- Imagem: adicione src com URL externa -->\n  <img src="https://sua-imagem.com/img.png" style="max-width:100%; border-radius:12px; margin-top:20px" />\n</div>'}
              value={htmlContent}
              onChange={e => setHtmlContent(e.target.value)}
            />
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-500 mb-2">Prévia de como o conteúdo aparecerá dentro do modal para os usuários.</p>
            <div className="border border-gray-700 rounded-xl overflow-hidden" style={{ height: '280px' }}>
              {htmlContent ? (
                <iframe srcDoc={previewHtml} sandbox="allow-same-origin" className="w-full h-full" title="preview" />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-600 text-sm">Sem conteúdo para visualizar</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Configurações de exibição */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/60"></div>
        <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2 mb-3">
          <Calendar size={18} className="text-emerald-400"/> Período de Exibição <span className="text-xs font-normal text-gray-500">(opcional)</span>
        </h2>
        <p className="text-sm text-gray-400 mb-4">Deixe em branco para exibir durante todo o período em que o comunicado estiver ativo.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Início</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={e => setStartAt(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Fim</label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={e => setEndAt(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
            />
          </div>
        </div>
        {(startAt || endAt) && (
          <p className="text-xs text-emerald-400 mt-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2">
            📅 Exibindo para todos {startAt ? `a partir de ${new Date(startAt).toLocaleString('pt-BR')}` : ''}{startAt && endAt ? ' ' : ''}{endAt ? `até ${new Date(endAt).toLocaleString('pt-BR')}` : ''}
          </p>
        )}
      </div>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <button
          onClick={handleSave}
          disabled={loading || !htmlContent.trim()}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:from-green-400 hover:to-emerald-500 transition-all disabled:opacity-40"
        >
          <Save size={18}/> {loading ? 'Salvando...' : 'Salvar Comunicado'}
        </button>
        <button
          onClick={handleTest}
          disabled={!htmlContent.trim()}
          className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200 font-semibold rounded-xl transition-all disabled:opacity-40"
        >
          <FlaskConical size={18}/> Testar Modal
        </button>
        <p className="text-xs text-gray-500 self-center max-w-sm">
          Versão atual: <strong className="text-gray-400">v{ann?.version || 1}</strong> — Salvar com novo conteúdo incrementa a versão e zera as confirmações automaticamente.
        </p>
      </div>

      {/* Lista de confirmações */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gray-500"></div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <Users size={18} className="text-gray-400"/>
            Quem confirmou
            <span className="text-xs font-normal text-gray-500 bg-gray-700 px-2 py-0.5 rounded-full">
              {confirmations.length} usuário{confirmations.length !== 1 ? 's' : ''} · v{ann?.version || 1}
            </span>
          </h2>
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 border border-red-500/20 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all"
          >
            <RotateCcw size={14}/> Zerar lista
          </button>
        </div>

        {confirmations.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">Nenhum usuário confirmou ainda nesta versão.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
                  <th className="pb-3 font-semibold">Usuário</th>
                  <th className="pb-3 font-semibold hidden sm:table-cell">Email</th>
                  <th className="pb-3 font-semibold hidden md:table-cell">Confirmado em</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {confirmations.map(c => (
                  <tr key={c.confirmation_id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="py-3 font-medium text-gray-200">{c.user_name}</td>
                    <td className="py-3 text-gray-400 hidden sm:table-cell">{c.user_email}</td>
                    <td className="py-3 text-gray-400 hidden md:table-cell">
                      {c.confirmed_at ? new Date(c.confirmed_at).toLocaleString('pt-BR') : '—'}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleResetUser(c.user_id)}
                        className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded"
                        title="Remover da lista"
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

      {/* Modal de teste — abre quando admin clica em "Testar Modal" */}
      {testMode && testAnnouncement && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="relative w-full bg-gray-900 border border-green-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxWidth: '640px', maxHeight: '82vh' }}
          >
            {/* Badge de teste */}
            <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-center">
              <span className="text-yellow-400 text-xs font-bold">⚗️ MODO DE TESTE — Apenas você está vendo este modal</span>
            </div>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-700 bg-gray-800/80 flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                <Megaphone size={16} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-none">Comunicado Importante</p>
                <p className="text-gray-400 text-xs mt-0.5">RastroFlow</p>
              </div>
            </div>
            <div
              className="flex-1 overflow-y-auto p-6"
              dangerouslySetInnerHTML={{ __html: testAnnouncement.html_content }}
              style={{ minHeight: '100px' }}
            />
            <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/80 flex-shrink-0 flex items-center justify-center">
              <button
                onClick={handleTestConfirm}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:from-green-400 hover:to-emerald-500 transition-all text-sm"
              >
                ✅ Li e entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
