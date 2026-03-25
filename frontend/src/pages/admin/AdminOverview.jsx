import { useState, useEffect } from 'react'
import { Users, ShieldBan, PackageSearch, CheckCircle, Clock } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../../lib/axios'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280']

export default function AdminOverview() {
  const [data, setData] = useState({
    usuarios_ativos: 0,
    usuarios_bloqueados: 0,
    rastreados_hoje: 0,
    entregues_hoje: 0,
    expirando_semana: 0,
    quota_17track_disponivel: 0
  })
  const [charts, setCharts] = useState({ line_data: [], pie_data: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const [resOverview, resCharts] = await Promise.all([
           api.get('/admin/overview'),
           api.get('/admin/charts')
        ])
        setData(resOverview.data)
        setCharts(resCharts.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchOverview()
  }, [])

  if (loading) return <div className="text-gray-400">Carregando admin overview...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Admin Overview</h1>
          <p className="text-gray-400">Visão global da plataforma</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
               <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Usuários Ativos</p>
               <h3 className="text-3xl font-bold text-gray-100">{data.usuarios_ativos}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Users className="text-blue-500" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
               <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Bloqueados</p>
               <h3 className="text-3xl font-bold text-red-400">{data.usuarios_bloqueados}</h3>
            </div>
            <div className="p-3 bg-red-500/10 rounded-xl">
              <ShieldBan className="text-red-500" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
               <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Rastreados Hoje</p>
               <h3 className="text-3xl font-bold text-gray-100">{data.rastreados_hoje}</h3>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl">
              <PackageSearch className="text-indigo-500" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
               <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Expirando em 7 dias</p>
               <h3 className={`text-3xl font-bold ${data.expirando_semana > 0 ? 'text-amber-400' : 'text-gray-100'}`}>
                 {data.expirando_semana}
               </h3>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Clock className="text-amber-500" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border-gray-700 border-2 rounded-2xl p-6 shadow-xl relative overflow-hidden group border-orange-500/30">
           <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-bl-full -z-10 blur-xl"></div>
          <div className="flex justify-between items-start">
            <div>
               <p className="text-sm font-medium text-orange-400 uppercase tracking-wider mb-1">Limite 17TRACK (Global)</p>
               <h3 className="text-2xl font-bold text-orange-400">{data.quota_17track_disponivel?.toLocaleString('pt-BR')}</h3>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-xl">
              <PackageSearch className="text-orange-500" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-gray-100 mb-6">Cadastros de Encomendas (Mês Atual)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.line_data}>
                <defs>
                  <linearGradient id="colorAdminLine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6', borderRadius: '0.75rem' }} />
                <Area type="monotone" dataKey="rastreios" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAdminLine)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-gray-100 mb-6">Status Global</h2>
          <div className="h-72 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={charts.pie_data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="total" stroke="none">
                  {charts.pie_data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6', borderRadius: '0.5rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
