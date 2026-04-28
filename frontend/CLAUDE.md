# ShiftMate 프론트엔드 CLAUDE.md

## 기술 스택
- React (Vite), JavaScript
- Tailwind CSS v3
- React Router v6
- Axios
- Context API (인증 상태 관리)
- react-big-calendar + date-fns (캘린더)

## 디렉터리 구조
```
frontend/src/
  api/
    client.js       # Axios 인스턴스 — 모든 API 호출은 반드시 여기서
    mocks/          # Mock 데이터 파일
  pages/
    admin/          # 관리자 전용 화면
    employee/       # 직원 전용 화면
  components/       # 공용 컴포넌트
  context/
    AuthContext.jsx  # 인증 상태 관리
```

## 로컬 실행
```bash
npm install
npm run dev
# → http://localhost:5173
```

## 인증 상태 사용법
```javascript
import { useAuth } from '../context/AuthContext'

const { user, token, login, logout } = useAuth()

// user 구조
// {
//   user_id, name, role, is_initial_password,
//   employee_no, years_of_experience
// }

// role 분기
if (user.role === 'admin') { /* 관리자 전용 */ }
if (user.role === 'employee') { /* 직원 전용 */ }

// 초기 비밀번호 강제 변경
if (user.is_initial_password) { navigate('/change-password') }
```

## API 호출 규칙
```javascript
// ✅ 반드시 apiClient 사용
import apiClient from '../api/client'
const res = await apiClient.get('/schedules', { params: { year, month } })

// ❌ axios 직접 호출 금지
import axios from 'axios'
axios.get(...)  // 사용 금지
```

## 전체 라우트
```
/login                        로그인
/change-password              비밀번호 변경

/admin/dashboard              관리자 대시보드
/admin/employees              직원 관리
/admin/shift-types            근무 유형 관리
/admin/schedules              근무표 작성·조회
/admin/requests               요청 관리

/employee/dashboard           직원 대시보드
/employee/schedules           근무표 캘린더
/employee/requests            휴무·휴가 신청+내역
/employee/swap-requests       교대 요청 목록
/employee/swap-requests/:id   교대 요청 상세
```

## Mock → 실제 API 교체 방법
```javascript
// 현재 (Mock)
import { getEmployees } from '../api/mocks/employees'
const data = await getEmployees()

// 교체 후 (실제 API)
import apiClient from '../api/client'
const { data } = await apiClient.get('/admin/employees')
```
