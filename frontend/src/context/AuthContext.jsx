import { createContext, useContext } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const user = { name: "test" }; // 임시 데이터

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}

// TODO 영현: 임시 유저로 로그인 되도록 수정
// export function useAuth() {
//   const ctx = useContext(AuthContext)
//   if (!ctx) throw new Error('useAuth must be used within AuthProvider')
//   return ctx
// }

export function useAuth() {
  // return useContext(AuthContext);

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