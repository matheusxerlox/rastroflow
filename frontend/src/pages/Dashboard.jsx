import { useState, useEffect } from 'react'
import { PackageSearch, CheckCircle, AlertTriangle, Truck, Award } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../lib/axios'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280']

export default function Dashboard() {
  const [kpis, setKpis] = useState({ ativas: 0, entregues: 0, problema: 0, sairam_hoje: 0 })
  const [quota, setQuota] = useState({ tem_quota: true, quota_base: 400, quota_extra: 0, quota_usada: 0, quota_disponivel: 400 })
  const [loading, setLoading] = useState(true)

  const [charts, setCharts] = useState({ line_data: [], pie_data: [] })

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [resKpi, resQuota, resCharts] = await Promise.all([
          api.get('/dashboard/overview'),
          api.get('/dashboard/quota'),
          api.get('/dashboard/charts')
        ])
        setKpis(resKpi.data)
        setQuota(resQuota.data)
        setCharts(resCharts.data)
      } catch (err) {
        console.error('Erro ao buscar dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) return <div className="text-gray-400">Carregando dashboard...</div>

  const quotaPercent = Math.min(100, (quota.quota_usada / (quota.quota_base + quota.quota_extra)) * 100) || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Visão Geral</h1>
          <p className="text-gray-400">Bem-vindo de volta ao seu painel RastroFlow</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <div className="flex justify-between items-start">
            <div>
               <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Ativas</p>
               <h3 className="text-3xl font-bold text-gray-100">{kpis.ativas}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <PackageSearch className="text-blue-500" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <div className="flex justify-between items-start">
            <div>
               <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Entregues</p>
               <h3 className="text-3xl font-bold text-gray-100">{kpis.entregues}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <CheckCircle className="text-emerald-500" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
          <div className="flex justify-between items-start">
            <div>
               <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Problema</p>
               <h3 className="text-3xl font-bold text-gray-100">{kpis.problema}</h3>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-xl">
              <AlertTriangle className="text-orange-500" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
          <div className="flex justify-between items-start">
            <div>
               <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Saíram Hoje</p>
               <h3 className="text-3xl font-bold text-gray-100">{kpis.sairam_hoje}</h3>
            </div>
            <div className="p-3 bg-blue-400/10 rounded-xl">
              <Truck className="text-blue-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Quota Progress */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <Award className="text-green-500" /> Limite Mensal
          </h2>
          <span className="text-sm font-medium text-gray-400">
            {quota.quota_usada} / {quota.quota_base + quota.quota_extra} rastreios
          </span>
        </div>
        <div className="w-full bg-gray-900 rounded-full h-3 mb-2 overflow-hidden border border-gray-700">
          <div 
            className={`h-3 rounded-full transition-all duration-1000 ${quotaPercent > 90 ? 'bg-red-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'}`} 
            style={{ width: `${quotaPercent}%` }}
          ></div>
        </div>
        {quotaPercent > 90 && (
          <p className="text-xs text-red-500 font-medium">Você está próximo de exceder seu limite. Adquira mais no checkout.</p>
        )}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-gray-100 mb-6">Volume de Entregas (Mês Atual)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.line_data}>
                <defs>
                  <linearGradient id="colorEntregas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6', borderRadius: '0.75rem' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area type="monotone" dataKey="entregas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEntregas)" activeDot={{ r: 6, fill: '#10b981', stroke: '#1f2937', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-gray-100 mb-6">Status Geral</h2>
          <div className="h-72 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.pie_data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="total"
                  stroke="none"
                >
                  {charts.pie_data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6', borderRadius: '0.5rem' }}
                />
              </PieChart>
            </ResponsiveContainer>
             <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-2xl font-bold text-gray-100">100</span>
                <span className="text-xs text-gray-400">Total</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
