import { useState, useEffect, useRef, useCallback } from 'react'
import { Megaphone } from 'lucide-react'
import api from '../lib/axios'

const CONFIRMED_KEY = 'rf_announcement_confirmed' // localStorage key para não-logados

export default function AnnouncementModal({ user }) {
  const [announcement, setAnnouncement] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const intervalRef = useRef(null)

  const getConfirmedList = () => {
    try { return JSON.parse(localStorage.getItem(CONFIRMED_KEY) || '[]') } catch { return [] }
  }

  const isLocallyConfirmed = (id, version) => {
    return getConfirmedList().some(c => c.id === id && c.version === version)
  }

  const saveLocalConfirmation = (id, version) => {
    const list = getConfirmedList().filter(c => c.id !== id)
    list.push({ id, version })
    localStorage.setItem(CONFIRMED_KEY, JSON.stringify(list))
  }

  const fetchAnnouncement = useCallback(async () => {
    try {
      // Busca o comunicado ativo sem autenticação (endpoint público)
      const res = await api.get('/admin/announcement/public')
      const data = res.data

      // Nenhum comunicado ativo ou desativado
      if (!data || !data.id) {
        setAnnouncement(null)
        return
      }

      // Admin nunca vê o modal
      if (user?.is_admin) {
        setAnnouncement(null)
        return
      }

      if (user) {
        // Usuário logado: verificar se já confirmou via API (que checa version + db)
        try {
          const res2 = await api.get('/dashboard/announcement/active')
          if (!res2.data || !res2.data.id) {
            setAnnouncement(null)
          } else {
            setAnnouncement(res2.data)
          }
        } catch {
          setAnnouncement(null)
        }
      } else {
        // Não logado: verificar via localStorage
        if (isLocallyConfirmed(data.id, data.version)) {
          setAnnouncement(null)
        } else {
          setAnnouncement(data)
        }
      }
    } catch {
      setAnnouncement(null)
    }
  }, [user])

  useEffect(() => {
    fetchAnnouncement()
    // Polling a cada 30 segundos — captura ativação/desativação em tempo real
    intervalRef.current = setInterval(fetchAnnouncement, 30000)
    return () => clearInterval(intervalRef.current)
  }, [fetchAnnouncement])

  const handleConfirm = async () => {
    if (!announcement) return
    setConfirming(true)
    try {
      if (user) {
        await api.post(`/dashboard/announcement/${announcement.id}/confirm`)
      } else {
        saveLocalConfirmation(announcement.id, announcement.version)
      }
      setAnnouncement(null)
    } catch {
      setAnnouncement(null)
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
      {/*
        Modal adaptativo:
        - Largura: até 70% da tela (min 320px)
        - Altura: até 80% da tela
        - O conteúdo define o tamanho dentro desses limites
      */}
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

        {/* Conteúdo HTML renderizado com scroll se necessário */}
        <div
          className="flex-1 overflow-y-auto p-6"
          dangerouslySetInnerHTML={{ __html: announcement.html_content }}
          style={{ minHeight: '80px' }}
        />

        {/* Footer — só "Li e entendi", sem opção de fechar */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/80 flex-shrink-0 flex justify-center">
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:from-green-400 hover:to-emerald-500 transition-all disabled:opacity-50 text-sm"
          >
            {confirming ? 'Aguarde...' : '✅ Li e entendi'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
