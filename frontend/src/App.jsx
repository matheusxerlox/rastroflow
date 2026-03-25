import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Public Pages
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Blocked from './pages/Blocked'

// User Pages
import Dashboard from './pages/Dashboard'
import Shipments from './pages/Shipments'
import Settings from './pages/Settings'

// Admin Pages
import AdminOverview from './pages/admin/AdminOverview'
import AdminUsers from './pages/admin/AdminUsers'
import AdminUserDetail from './pages/admin/AdminUserDetail'
import AdminLogs from './pages/admin/AdminLogs'
import AdminWebhookLogs from './pages/admin/AdminWebhookLogs'
import AdminLayout from './pages/admin/AdminLayout'
import Layout from './components/Layout'

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth()

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-green-500">Carregando...</div>
  if (!user) return <Navigate to="/login" />
  if (requireAdmin && !user.is_admin) return <Navigate to="/dashboard" />

  return children
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/blocked" element={<Blocked />} />
        
        {/* User Routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/encomendas" element={<Shipments />} />
          <Route path="/arquivadas" element={<Shipments />} />
          <Route path="/configuracoes" element={<Settings />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:id" element={<AdminUserDetail />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="logs/webhooks" element={<AdminWebhookLogs />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  )
}

export default App
