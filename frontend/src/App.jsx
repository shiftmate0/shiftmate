import { useState } from "react";
import SchedulePage from "./pages/employee/SchedulePage";
import DashboardPage from "./pages/employee/DashboardPage";
import { AuthProvider } from "./context/AuthContext";

function App() {
  const [page, setPage] = useState("dashboard");

  return (
    <AuthProvider>
      <div>
        <button onClick={() => setPage("dashboard")}>대시보드</button>
        <button onClick={() => setPage("schedule")}>스케줄</button>

        {page === "dashboard" && <DashboardPage />}
        {page === "schedule" && <SchedulePage />}
      </div>
    </AuthProvider>
  );
}

export default App;