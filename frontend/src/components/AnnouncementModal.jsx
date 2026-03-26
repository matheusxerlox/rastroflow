import { useState, useEffect } from 'react'
import { Megaphone } from 'lucide-react'
import api from '../lib/axios'

export default function AnnouncementModal() {
  const [announcement, setAnnouncement] = useState(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    checkAnnouncement()
  }, [])

  const checkAnnouncement = async () => {
    try {
      const res = await api.get('/dashboard/announcement/active')
      if (res.data && res.data.id) {
        setAnnouncement(res.data)
      }
    } catch (err) {
      // Silencioso — não bloqueamos o usuário por falha de comunicado
    }
  }

  const handleConfirm = async () => {
    if (!announcement) return
    setConfirming(true)
    try {
      await api.post(`/dashboard/announcement/${announcement.id}/confirm`)
      setAnnouncement(null)
    } catch (err) {
      // Fecha mesmo assim para não travar o usuário
      setAnnouncement(null)
    } finally {
      setConfirming(false)
    }
  }

  if (!announcement) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div
        className="relative w-full bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in"
        style={{ maxWidth: '640px', maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-700 bg-gray-800/60 flex-shrink-0">
          <Megaphone className="text-orange-400 flex-shrink-0" size={20} />
          <span className="text-white font-semibold text-sm">Comunicado da RastroFlow</span>
        </div>

        {/* Conteúdo HTML renderizado */}
        <div
          className="flex-1 overflow-y-auto p-6 custom-scrollbar"
          dangerouslySetInnerHTML={{ __html: announcement.html_content }}
          style={{ minHeight: '120px' }}
        />

        {/* Footer com botão */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/60 flex-shrink-0 flex justify-center">
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:from-green-400 hover:to-emerald-500 transition-all disabled:opacity-50 text-sm"
          >
            {confirming ? 'Aguarde...' : '✅ Li e entendi'}
          </button>
        </div>
      </div>
    </div>
  )
}
