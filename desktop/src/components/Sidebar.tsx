import { NavLink } from "react-router-dom";
import { Home, Brain, BarChart2, Trophy, Settings, Activity } from "lucide-react";

export default function Sidebar() {
  const links = [
    { name: "Dashboard", icon: Home, to: "/dashboard" },
    { name: "Focus Mode", icon: Activity, to: "/focus-mode" },
    { name: "Recommendations", icon: Brain, to: "/recommendations" },
    { name: "Analytics", icon: BarChart2, to: "/analytics" },
    { name: "Achievements", icon: Trophy, to: "/achievements" },
    { name: "Settings", icon: Settings, to: "/settings" },
  ];

  return (
    <aside
      className="
        fixed top-0 left-0 h-screen w-64 p-6 flex flex-col justify-between
        bg-gradient-to-b from-gray-50 to-white 
        dark:from-[#121212] dark:to-[#1a1a1a]
        border-r border-gray-200 dark:border-gray-800
        transition-all duration-500 shadow-[inset_-1px_0_5px_rgba(0,0,0,0.02)]
        dark:shadow-none
      "
    >
      {/* Logo Section */}
      <div>
        <div className="flex items-center mb-10">
          <div
            className="
              w-10 h-10 flex items-center justify-center text-lg font-bold rounded-xl
              bg-gradient-to-tr from-purple-600 to-purple-400 text-white
              shadow-[0_4px_10px_rgba(168,85,247,0.4)]
            "
          >
            F
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              FlowState
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Focus Optimizer
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-2">
          {links.map(({ name, icon: Icon, to }) => (
            <NavLink
              key={name}
              to={to}
              end
              className={({ isActive }) =>
                `
                  flex items-center gap-3 px-4 py-3 rounded-lg font-medium
                  transition-all duration-300
                  ${
                    isActive
                      ? // Active state (Light & Dark)
                        `bg-gradient-to-r from-purple-600 to-purple-500 text-white 
                         shadow-md shadow-purple-400/30 
                         dark:shadow-purple-800/30`
                      : // Inactive state (Light & Dark)
                        `text-gray-600 dark:text-gray-400 
                         hover:text-purple-600 dark:hover:text-white 
                         hover:bg-purple-50 dark:hover:bg-[#1f1f1f]`
                  }
                `
              }
            >
              <Icon size={18} />
              <span>{name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Version Info */}
      <div className="text-xs text-gray-500 dark:text-gray-600 mt-8">
        <span className="bg-gradient-to-r from-purple-500 to-purple-400 bg-clip-text text-transparent font-semibold">
          v0.1
        </span>{" "}
        • Dev
      </div>
    </aside>
  );
}
