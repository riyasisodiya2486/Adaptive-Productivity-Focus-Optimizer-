import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import FocusMode from "./pages/FocusMode";
import Recommendations from "./pages/Recommendations";
import Analytics from "./pages/Analytics";
import Achievements from "./pages/Achievements";
import Settings from "./pages/Settings";
import { Toaster } from "react-hot-toast";

export default function App() {
  return (
    <div
      className="
        flex min-h-screen transition-all duration-500
        bg-gradient-to-b from-gray-50 to-white text-gray-900
        dark:from-[#0b0b0f] dark:to-[#151518] dark:text-gray-100
      "
    >
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main
        className="
          ml-64 flex-1 overflow-y-auto mt-5 
          bg-transparent 
          transition-all duration-500
        "
      >
        <div
          className="
            max-w-7xl mx-auto w-full
            bg-white/70 dark:bg-transparent
            backdrop-blur-md rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.05)]
            dark:shadow-none transition-all duration-500
          "
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/focus-mode" element={<FocusMode />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
         <Toaster position="bottom-right" reverseOrder={false} />
      </main>
       
    </div>
  );
}
