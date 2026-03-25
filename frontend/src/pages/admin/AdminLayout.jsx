import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { useState } from 'react'
import { Menu } from 'lucide-react'

const AdminLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-900 flex text-gray-100 relative">
      <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 md:ml-64 relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between bg-gray-800 border-b border-gray-700 p-4 sticky top-0 z-30">
           <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500">
             Admin RastroFlow
           </h1>
           <button 
             onClick={() => setIsMobileMenuOpen(true)}
             className="p-2 text-gray-400 hover:text-white bg-gray-900 border border-gray-700 rounded-xl transition-colors"
           >
             <Menu size={24} />
           </button>
        </div>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden min-w-0 w-full">
          <main className="max-w-7xl mx-auto w-full min-w-0">
             <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-2 rounded-xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="font-semibold flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse"></span>
                   Área Administrativa - Ações aqui afetam o sistema global.
                </span>
             </div>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export default AdminLayout
