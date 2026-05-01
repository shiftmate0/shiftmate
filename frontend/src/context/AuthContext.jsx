import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem('token'))

  function login(userData, accessToken) {
    setUser(userData)
    setToken(accessToken)
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('token', accessToken)
  }

  function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// TODO 영현: 임시 유저로 로그인 되도록 수정
// export function useAuth() {
//   const ctx = useContext(AuthContext)
//   if (!ctx) throw new Error('useAuth must be used within AuthProvider')
//   return ctx
// }

export function useAuth() {
  return {
    user: {
      id: 'test-user-123',
      name: '개발용계정',
      role: 'admin', // 또는 'employee'
      // 이 값이 true면 무조건 /change-password로 튕겨 나갑니다.
      // 컴포넌트 화면만 보고 싶다면 false로 설정하세요!
      is_initial_password: false 
    },
    isAuthenticated: true
  };
}