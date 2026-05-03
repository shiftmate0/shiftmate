// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import AppLayout from './components/layout/AppLayout'

import LoginPage from './pages/LoginPage'
import ChangePasswordPage from './pages/ChangePasswordPage'

import AdminDashboardPage from './pages/admin/DashboardPage'
import AdminEmployeesPage from './pages/admin/EmployeesPage'
import AdminShiftTypesPage from './pages/admin/ShiftTypesPage'
import AdminSchedulesPage from './pages/admin/SchedulesPage'
import AdminScheduleViewPage from './pages/admin/ScheduleViewPage'
import AdminRequestsPage from './pages/admin/RequestsPage'

import EmployeeDashboardPage from './pages/employee/DashboardPage'
import EmployeeSchedulesPage from './pages/employee/SchedulesPage'
import EmployeeRequestsPage from './pages/employee/RequestsPage'
import EmployeeSwapRequestsPage from './pages/employee/SwapRequestsPage'
import EmployeeSwapRequestDetailPage from './pages/employee/SwapRequestDetailPage'


function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user.is_initial_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return children
}

function RequireAdmin({ children }) {
  const { user } = useAuth()
  if (user?.role !== 'admin') return <Navigate to="/employee/dashboard" replace />
  return children
}

function RequireEmployee({ children }) {
  const { user } = useAuth()
  if (user?.role !== 'employee') return <Navigate to="/admin/dashboard" replace />
  return children
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />
  return <Navigate to="/employee/dashboard" replace />
}


export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={
            <RequireAuth><ChangePasswordPage /></RequireAuth>
          } />

          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route path="/admin/dashboard" element={
              <RequireAdmin><AdminDashboardPage /></RequireAdmin>
            } />
            <Route path="/admin/employees" element={
              <RequireAdmin><AdminEmployeesPage /></RequireAdmin>
            } />
            <Route path="/admin/shift-types" element={
              <RequireAdmin><AdminShiftTypesPage /></RequireAdmin>
            } />
            <Route path="/admin/schedules" element={
              <RequireAdmin><AdminSchedulesPage /></RequireAdmin>
            } />
            <Route path="/admin/schedule-view" element={
              <RequireAdmin><AdminScheduleViewPage /></RequireAdmin>
            } />
            <Route path="/admin/requests" element={
              <RequireAdmin><AdminRequestsPage /></RequireAdmin>
            } />

            <Route path="/employee/dashboard" element={
              <RequireEmployee><EmployeeDashboardPage /></RequireEmployee>
            } />
            <Route path="/employee/schedules" element={
              <RequireEmployee><EmployeeSchedulesPage /></RequireEmployee>
            } />
            <Route path="/employee/requests" element={
              <RequireEmployee><EmployeeRequestsPage /></RequireEmployee>
            } />
            <Route path="/employee/swap-requests" element={
              <RequireEmployee><EmployeeSwapRequestsPage /></RequireEmployee>
            } />
            <Route path="/employee/swap-requests/:id" element={
              <RequireEmployee><EmployeeSwapRequestDetailPage /></RequireEmployee>
            } />
          </Route>

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
