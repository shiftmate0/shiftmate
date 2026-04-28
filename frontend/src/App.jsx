import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// 공통
import LoginPage from './pages/LoginPage'
import ChangePasswordPage from './pages/ChangePasswordPage'

// 관리자
import AdminDashboardPage from './pages/admin/DashboardPage'
import AdminEmployeesPage from './pages/admin/EmployeesPage'
import AdminShiftTypesPage from './pages/admin/ShiftTypesPage'
import AdminSchedulesPage from './pages/admin/SchedulesPage'
import AdminRequestsPage from './pages/admin/RequestsPage'

// 직원
import EmployeeDashboardPage from './pages/employee/DashboardPage'
import EmployeeSchedulesPage from './pages/employee/SchedulesPage'
import EmployeeRequestsPage from './pages/employee/RequestsPage'
import EmployeeSwapRequestsPage from './pages/employee/SwapRequestsPage'
import EmployeeSwapRequestDetailPage from './pages/employee/SwapRequestDetailPage'


// Route Guard: 로그인 여부 체크
function RequireAuth({ children }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 초기 비밀번호 강제 변경
  if (user.is_initial_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return children
}

// Route Guard: 관리자 전용
function RequireAdmin({ children }) {
  const { user } = useAuth()
  if (user?.role !== 'admin') {
    return <Navigate to="/employee/dashboard" replace />
  }
  return children
}

// Route Guard: 직원 전용
function RequireEmployee({ children }) {
  const { user } = useAuth()
  if (user?.role !== 'employee') {
    return <Navigate to="/admin/dashboard" replace />
  }
  return children
}


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 공통 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={
            <RequireAuth><ChangePasswordPage /></RequireAuth>
          } />

          {/* 관리자 */}
          <Route path="/admin/dashboard" element={
            <RequireAuth><RequireAdmin><AdminDashboardPage /></RequireAdmin></RequireAuth>
          } />
          <Route path="/admin/employees" element={
            <RequireAuth><RequireAdmin><AdminEmployeesPage /></RequireAdmin></RequireAuth>
          } />
          <Route path="/admin/shift-types" element={
            <RequireAuth><RequireAdmin><AdminShiftTypesPage /></RequireAdmin></RequireAuth>
          } />
          <Route path="/admin/schedules" element={
            <RequireAuth><RequireAdmin><AdminSchedulesPage /></RequireAdmin></RequireAuth>
          } />
          <Route path="/admin/requests" element={
            <RequireAuth><RequireAdmin><AdminRequestsPage /></RequireAdmin></RequireAuth>
          } />

          {/* 직원 */}
          <Route path="/employee/dashboard" element={
            <RequireAuth><RequireEmployee><EmployeeDashboardPage /></RequireEmployee></RequireAuth>
          } />
          <Route path="/employee/schedules" element={
            <RequireAuth><RequireEmployee><EmployeeSchedulesPage /></RequireEmployee></RequireAuth>
          } />
          <Route path="/employee/requests" element={
            <RequireAuth><RequireEmployee><EmployeeRequestsPage /></RequireEmployee></RequireAuth>
          } />
          <Route path="/employee/swap-requests" element={
            <RequireAuth><RequireEmployee><EmployeeSwapRequestsPage /></RequireEmployee></RequireAuth>
          } />
          <Route path="/employee/swap-requests/:id" element={
            <RequireAuth><RequireEmployee><EmployeeSwapRequestDetailPage /></RequireEmployee></RequireAuth>
          } />

          {/* 기본 리다이렉트 */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />
  return <Navigate to="/employee/dashboard" replace />
}
