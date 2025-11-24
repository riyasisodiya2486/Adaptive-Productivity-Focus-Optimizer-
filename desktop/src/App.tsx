import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import FocusMode from "./pages/FocusMode";
import Recommendations from "./pages/Recommendations";
import Analytics from "./pages/Analytics";
import Achievements from "./pages/Achievements";
import Settings from "./pages/Settings";
import Register from "./pages/Register";
import Login from "./pages/Login";
import { Toaster } from "react-hot-toast";

// A wrapper for pages that should show sidebar
const ProtectedLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen transition-all duration-500
                  bg-gradient-to-b from-gray-50 to-white text-gray-900
                  dark:from-[#0b0b0f] dark:to-[#151518] dark:text-gray-100">
    <Sidebar />
    <main className="ml-64 flex-1 overflow-y-auto mt-5
                     bg-transparent transition-all duration-500">
      <div className="max-w-7xl mx-auto w-full
                      bg-white/70 dark:bg-transparent
                      backdrop-blur-md rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.05)]
                      dark:shadow-none transition-all duration-500 p-5">
        {children}
      </div>
    </main>
    <Toaster position="bottom-right" reverseOrder={false} />
  </div>
);

export default function App() {
  return (
    <Routes>
      {/* Default route → login page */}
      <Route path="/" element={<Login />} />

      {/* Register page */}
      <Route path="/register" element={<Register />} />

      {/* Protected routes with sidebar */}
      <Route
        path="/dashboard"
        element={<ProtectedLayout><Dashboard /></ProtectedLayout>}
      />
      <Route
        path="/focus-mode"
        element={<ProtectedLayout><FocusMode /></ProtectedLayout>}
      />
      <Route
        path="/recommendations"
        element={<ProtectedLayout><Recommendations /></ProtectedLayout>}
      />
      <Route
        path="/analytics"
        element={<ProtectedLayout><Analytics /></ProtectedLayout>}
      />
      <Route
        path="/achievements"
        element={<ProtectedLayout><Achievements /></ProtectedLayout>}
      />
      <Route
        path="/settings"
        element={<ProtectedLayout><Settings /></ProtectedLayout>}
      />

      {/* Catch-all → redirect to login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

