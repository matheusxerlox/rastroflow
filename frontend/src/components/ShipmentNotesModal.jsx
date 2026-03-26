import React, { useState } from 'react'
import { X, Save, Trash2, StickyNote } from 'lucide-react'
import api from '../lib/axios'

export default function ShipmentNotesModal({ shipment, onClose, onSave }) {
  const [notes, setNotes] = useState(shipment?.notes || '')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const val = e.target.value
    if (val.length <= 300) {
      setNotes(val)
    }
  }

  const handleSave = async (isDelete = false) => {
    setLoading(true)
    try {
      const payload = isDelete ? { notes: null } : { notes: notes.trim() === '' ? null : notes.trim() }
      await api.put(`/dashboard/shipments/${shipment.id}/notes`, payload)
      onSave() // recarregar
    } catch (err) {
      alert("Erro ao salvar anotação")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
           <div className="flex items-center gap-2">
              <StickyNote className="text-yellow-500" size={20} />
              <h2 className="text-xl font-bold text-white">Anotações da Encomenda</h2>
           </div>
           <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
             <X size={20} />
           </button>
        </div>

        <div className="mb-4">
           <p className="text-sm text-gray-400 mb-2">Escreva observações sobre esta encomenda (máximo 300 caracteres).</p>
           <textarea 
             className="w-full h-32 bg-gray-800 border-2 border-gray-700 rounded-xl p-3 text-sm text-gray-200 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500 custom-scrollbar resize-none transition-colors"
             placeholder="Digite sua anotação aqui..."
             value={notes}
             onChange={handleChange}
           />
           <div className="text-right text-xs text-gray-500 mt-1">
              {notes.length} / 300
           </div>
        </div>

        <div className="flex items-center justify-between pt-2">
           <button 
             onClick={() => handleSave(true)}
             disabled={loading}
             className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
           >
             <Trash2 size={16} /> Excluir
           </button>

           <button 
             onClick={() => handleSave(false)}
             disabled={loading}
             className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:from-green-400 hover:to-emerald-500 transition-all disabled:opacity-50"
           >
             <Save size={16} /> {loading ? 'Salvando...' : 'Salvar Anotação'}
           </button>
        </div>
      </div>
    </div>
  )
}
