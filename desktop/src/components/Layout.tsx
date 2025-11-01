import React, { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Home, Activity, Lightbulb, BarChart3, Trophy, Settings, Moon, Sun } from "lucide-react";

export default function Layout() {
  // theme toggle
  const [dark, setDark] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem("fs-theme");
      if (val) return val === "dark";
    } catch {}
    return true;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("fs-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("fs-theme", "light");
    }
  }, [dark]);

  const links = [
    { to: "/", label: "Dashboard", icon: <Home size={18}/> },
    { to: "/focus", label: "Focus Mode", icon: <Activity size={18}/> },
    { to: "/recommendations", label: "Recommendations", icon: <Lightbulb size={18}/> },
    { to: "/analytics", label: "Analytics", icon: <BarChart3 size={18}/> },
    { to: "/achievements", label: "Achievements", icon: <Trophy size={18}/> },
    { to: "/settings", label: "Settings", icon: <Settings size={18}/> },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 p-5 sidebar-bg border-r border-gray-200 dark:border-gray-800 z-40">
        <div className="flex flex-col h-full justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-300 flex items-center justify-center text-white font-semibold">F</div>
              <div>
                <div className="text-lg font-semibold">FlowState</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Focus Optimizer</div>
              </div>
            </div>

            <nav className="flex flex-col gap-2">
              {links.map((l) => (
                <NavLink
                  to={l.to}
                  key={l.to}
                  end={l.to === "/"}
                  className={({isActive}) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition ${
                      isActive ? "bg-gradient-to-r from-brand-500/20 to-brand-300/10 text-brand-500 dark:text-brand-300 border-l-4 border-brand-500 pl-2"
                               : "text-gray-600 hover:bg-gray-100/50 dark:text-gray-300 dark:hover:bg-gray-800/60"
                    }`
                  }
                >
                  <span className="text-[18px]">{l.icon}</span>
                  <span>{l.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">v0.1 • Dev</div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 ml-64 min-h-screen">
        {/* topbar */}
        <div className="flex items-center justify-end p-6 pr-10">
          <button
            onClick={() => setDark(d => !d)}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:shadow-sm transition"
            aria-label="Toggle theme"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* page content */}
        <main className="px-12 pb-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
