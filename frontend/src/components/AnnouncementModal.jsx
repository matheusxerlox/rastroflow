import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import api from '../lib/axios'

const LS_KEY = 'rf_ann_confirmed'

function getConfirmed() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}

function isConfirmedLocally(id, version) {
  return getConfirmed().some(c => c.id === id && c.version === version)
}

function saveConfirmedLocally(id, version) {
  const list = getConfirmed().filter(c => c.id !== id)
  list.push({ id, version })
  localStorage.setItem(LS_KEY, JSON.stringify(list))
}

export default function AnnouncementModal({ user }) {
  const [announcement, setAnnouncement] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const location = useLocation()
  const timerRef = useRef(null)

  const check = useCallback(async () => {
    try {
      // Cache-bust para garantir que sempre pega o estado atual do servidor
      const { data } = await api.get(`/admin/announcement/public?_t=${Date.now()}`)

      // Sem comunicado ativo ou admin nunca vê o modal
      if (!data?.id || user?.is_admin) {
        setAnnouncement(null)
        return
      }

      // Verificação no servidor (para resetar sessão de confirmação via admin)
      if (user?.id) {
        try {
          const { data: activeData } = await api.get(`/dashboard/announcement/active?_t=${Date.now()}`)
          if (!activeData?.id) {
            // Servidor diz que usuário já confirmou (ou expirou)
            setAnnouncement(null)
            return
          }
          setAnnouncement(activeData)
          return
        } catch {
          // Se falhar verificação server-side, usa localStorage como fallback
        }
      }

      // Não logado — usa localStorage para rastrear
      if (isConfirmedLocally(data.id, data.version)) {
        setAnnouncement(null)
      } else {
        setAnnouncement(data)
      }
    } catch {
      // Nunca bloqueia o usuário por falha de rede
    }
  }, [user?.id, user?.is_admin])

  // Re-verifica a cada: mudança de rota + intervalo de 30s
  useEffect(() => {
    check()
    clearInterval(timerRef.current)
    timerRef.current = setInterval(check, 30000)
    return () => clearInterval(timerRef.current)
  }, [check, location.pathname])

  const handleConfirm = async () => {
    if (!announcement || confirming) return
    setConfirming(true)

    try {
      if (user?.id) {
        // Usuário logado: salva no banco para aparecer na lista do admin
        await api.post(`/dashboard/announcement/${announcement.id}/confirm`)
      }
      // Salva localmente para não reaparecer (funciona também como fallback offline)
      saveConfirmedLocally(announcement.id, announcement.version)
      setAnnouncement(null)
    } catch (err) {
      // Se a API falhar, ainda salva localmente e fecha
      // (o nome não aparece na lista do admin, mas o modal não fica preso)
      saveConfirmedLocally(announcement.id, announcement.version)
      setAnnouncement(null)
      console.warn('[AnnouncementModal] Falha ao registrar confirmação no servidor:', err)
    } finally {
      setConfirming(false)
    }
  }

  if (!announcement) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{
          width: '100%',
          maxWidth: 'min(70vw, 720px)',
          minWidth: '320px',
          maxHeight: '80vh',
          animation: 'fadeInScale 0.25s ease',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-700 bg-gray-800/80 flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
            <Megaphone size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">Comunicado Importante</p>
            <p className="text-gray-400 text-xs mt-0.5">RastroFlow</p>
          </div>
        </div>

        {/* Conteúdo HTML renderizado */}
        <div
          className="flex-1 overflow-y-auto p-6"
          dangerouslySetInnerHTML={{ __html: announcement.html_content }}
          style={{ minHeight: '80px' }}
        />

        {/* Botão — não tem como fechar sem clicar */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/80 flex-shrink-0 flex justify-center">
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:from-green-400 hover:to-emerald-500 transition-all disabled:opacity-50 text-sm"
          >
            {confirming ? 'Registrando...' : '✅ Li e entendi'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
