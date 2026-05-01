import { createContext, useContext, useState, useEffect } from 'react'
import apiClient from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    if (!savedToken) {
      setLoading(false)
      return
    }
    setToken(savedToken)
    apiClient.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(employeeNo, password) {
    const { data } = await apiClient.post('/auth/login', {
      employee_no: employeeNo,
      password,
    })
    const userInfo = {
      user_id: data.user_id,
      name: data.name,
      role: data.role,
      is_initial_password: data.is_initial_password,
      employee_no: data.employee_no,
      years_of_experience: data.years_of_experience,
    }
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(userInfo))
    setToken(data.access_token)
    setUser(userInfo)
    return userInfo
  }

  function updateUser(partial) {
    setUser(prev => {
      const next = { ...prev, ...partial }
      localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }

  function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
