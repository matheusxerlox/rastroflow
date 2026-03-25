import React from 'react'

const statusConfig = {
  NotFound: { label: 'Não Encontrado', classes: 'bg-gray-800 text-gray-200 border-gray-600' },
  InfoReceived: { label: 'Info Recebida', classes: 'bg-gray-800 text-gray-200 border-gray-600' },
  InTransit: { label: 'Em Trânsito', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  OutForDelivery: { label: 'Saiu p/ Entrega', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  Delivered: { label: 'Entregue', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  DeliveryFailure: { label: 'Falha na Entrega', classes: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  Exception: { label: 'Exceção', classes: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  Expired: { label: 'Expirado', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  AvailableForPickup: { label: 'Retirada Disponível', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
}

const StatusBadge = ({ status }) => {
  const config = statusConfig[status] || statusConfig['NotFound']
  
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border shadow-sm whitespace-nowrap ${config.classes}`}>
      {config.label}
    </span>
  )
}

export default StatusBadge
