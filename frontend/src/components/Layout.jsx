import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import { Menu } from 'lucide-react'

const Layout = () => {
  const { user } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-900 flex text-gray-100 relative">
      <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 md:ml-64 relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between bg-gray-800 border-b border-gray-700 p-4 sticky top-0 z-30">
           <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
             RastroFlow
           </h1>
           <button 
             onClick={() => setIsMobileMenuOpen(true)}
             className="p-2 text-gray-400 hover:text-white bg-gray-900 border border-gray-700 rounded-xl transition-colors"
           >
             <Menu size={24} />
           </button>
        </div>

        {/* Cuidado redobrado com o min-w-0 no flex items para n estourar childs overflow */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden min-w-0 w-full">
          <main className="max-w-7xl mx-auto w-full min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export default Layout
