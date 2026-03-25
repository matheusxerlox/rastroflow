import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import StatusBadge from './StatusBadge'

const ShipmentDetailModal = ({ shipment, onClose }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  if (!shipment) return null

  // Ensure events is an array or object safely parseable
  const events = shipment.events?.track_info?.tracking?.providers?.[0]?.events || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-100">Detalhes da Encomenda</h2>
            <p className="text-sm text-gray-400 mt-1">{shipment.tracking_number}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
              <span className="text-xs text-gray-500 uppercase font-semibold">Status Atual</span>
              <div className="mt-2 text-lg">
                <StatusBadge status={shipment.status} />
              </div>
            </div>
            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
              <span className="text-xs text-gray-500 uppercase font-semibold">Transportadora</span>
              <div className="mt-2 text-gray-200 capitalize font-medium">{shipment.carrier}</div>
            </div>
          </div>

          {/* Dados do Cliente */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Dados do Cliente</h3>
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div>
                <span className="text-gray-500 block">Nome</span>
                <span className="text-gray-200">{shipment.customer_name || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">E-mail</span>
                <span className="text-gray-200">{shipment.customer_email || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Telefone</span>
                <span className="text-gray-200">{shipment.customer_phone || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Documento (CPF)</span>
                <span className="text-gray-200">{shipment.customer_document || '-'}</span>
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Endereço de Entrega</h3>
            <div className="text-sm text-gray-300 bg-gray-900/30 p-4 rounded-xl border border-gray-700/30">
              {shipment.customer_address ? (
                <>
                  <p>{shipment.customer_address.street}, {shipment.customer_address.number} {shipment.customer_address.complement && `- ${shipment.customer_address.complement}`}</p>
                  <p>{shipment.customer_address.district}</p>
                  <p>{shipment.customer_address.city} - {shipment.customer_address.state}</p>
                  <p>CEP: {shipment.customer_address.zip_code}</p>
                </>
              ) : (
                <p className="text-gray-500">Endereço não disponível</p>
              )}
            </div>
          </div>

          {/* Dados Pagmento */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Dados do Pedido</h3>
            <div className="grid grid-cols-2 gap-y-4 text-sm">
               <div>
                <span className="text-gray-500 block">Produto</span>
                <span className="text-gray-200">{shipment.product_name || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Valor</span>
                <span className="text-green-400 font-medium">
                  {shipment.amount ? `R$ ${parseFloat(shipment.amount).toFixed(2).replace('.', ',')}` : '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">ID Transação</span>
                <span className="text-gray-200 font-mono text-xs">{shipment.transaction_id || '-'}</span>
              </div>
            </div>
          </div>

          {/* Histórico 17TRACK */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Histórico de Rastreio</h3>
            
            {events.length > 0 ? (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-700 before:to-transparent">
                {events.map((evt, idx) => (
                  <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-gray-800 bg-green-500 text-gray-800 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow drop-shadow-md z-10"></div>
                    <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] bg-gray-900/50 p-4 rounded-xl border border-gray-700/50 shadow-sm">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-green-400 mb-1">{new Date(evt.time_utc).toLocaleString('pt-BR')}</span>
                        <span className="text-sm text-gray-100 font-medium">{evt.description}</span>
                        {evt.location && <span className="text-xs text-gray-500 mt-1">{evt.location}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
                <div className="text-center p-6 bg-gray-900/30 rounded-xl border border-gray-700/30">
                  <p className="text-gray-500 text-sm">Nenhum evento registrado ainda.</p>
                </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

export default ShipmentDetailModal
