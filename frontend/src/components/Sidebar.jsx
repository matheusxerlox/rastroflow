import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, PackageSearch, Settings, LogOut, Users, ShieldAlert, Network, X, Archive } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { pathname } = useLocation()
  const { logout, user } = useAuth()

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Encomendas', path: '/encomendas', icon: PackageSearch },
    { name: 'Arquivadas', path: '/arquivadas', icon: Archive },
    { name: 'Configurações', path: '/configuracoes', icon: Settings },
  ]

  const adminItems = [
    { name: 'Visão Geral', path: '/admin', icon: ShieldAlert },
    { name: 'Usuários', path: '/admin/users', icon: Users },
    { name: 'Logs do Sistema', path: '/admin/logs', icon: Settings },
    { name: 'Logs de Webhooks', path: '/admin/logs/webhooks', icon: Network },
  ]

  return (
    <>
      {/* Overlay Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <div className={`w-64 bg-gray-800 border-r border-gray-700 h-screen flex flex-col fixed left-0 top-0 z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
            RastroFlow
          </h1>
          <button 
            className="md:hidden p-2 text-gray-400 hover:text-white"
            onClick={() => setIsOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.path) && (item.path !== '/admin' || pathname === '/admin')
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? 'bg-gradient-to-r from-green-500/10 to-emerald-600/10 text-green-400 border border-green-500/20' 
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-700/50'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}

        {user?.is_admin && (
          <div className="mt-8">
            <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Admin</h3>
            <div className="space-y-2">
              {adminItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path))
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-gradient-to-r from-red-500/10 to-orange-600/10 text-red-400 border border-red-500/20' 
                        : 'text-gray-400 hover:text-gray-100 hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-green-400 font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded-xl transition-all"
        >
          <LogOut size={20} />
          <span className="font-medium">Sair</span>
        </button>
      </div>
      </div>
    </>
  )
}

export default Sidebar
