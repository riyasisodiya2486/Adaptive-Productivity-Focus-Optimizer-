import React, { useState } from "react";
import { Eye, Bell, Plus, Trash2, CheckCircle2 } from "lucide-react";
type Toast = { id: number; text: string };

export default function Settings() {
  const [trackingMode, setTrackingMode] = useState("workHours");
  const [eyeTracking, setEyeTracking] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const [productiveApps, setProductiveApps] = useState<string[]>(["Notion", "VS Code"]);
  const [distractingSites, setDistractingSites] = useState<string[]>(["Instagram", "YouTube"]);

  const [productiveInput, setProductiveInput] = useState("");
  const [distractingInput, setDistractingInput] = useState("");

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = React.useRef(1);

  const pushToast = (text: string) => {
    const id = toastId.current++;
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const handleAddApp = (type: "productive" | "distracting") => {
    if (type === "productive" && productiveInput.trim()) {
      setProductiveApps([...productiveApps, productiveInput.trim()]);
      pushToast(`Added ${productiveInput} to productive apps`);
      setProductiveInput("");
    } else if (type === "distracting" && distractingInput.trim()) {
      setDistractingSites([...distractingSites, distractingInput.trim()]);
      pushToast(`Added ${distractingInput} to distracting sites`);
      setDistractingInput("");
    }
  };

  const handleRemove = (type: "productive" | "distracting", item: string) => {
    if (type === "productive") {
      setProductiveApps(productiveApps.filter((app) => app !== item));
      pushToast(`Removed ${item} from productive apps`);
    } else {
      setDistractingSites(distractingSites.filter((site) => site !== item));
      pushToast(`Removed ${item} from distracting sites`);
    }
  };

  const handleSave = () => {
    pushToast("✅ Settings saved successfully!");
    console.log({
      trackingMode,
      eyeTracking,
      notifications,
      productiveApps,
      distractingSites,
    });
  };

  return (
    <div className="flex flex-col min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-[#0B0B0F] text-gray-900 dark:text-gray-100 relative">
      {/* Header */}
      <header className="px-10 py-6 border-b border-gray-200 dark:border-white/10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-200 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
          Configure your productivity preferences
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-10 py-8 space-y-8 max-w-4xl">
        {/* --- TRACKING MODE --- */}
        <section className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-[0_8px_30px_rgba(168,85,247,0.1)] transition-all">
          <h2 className="text-xl font-semibold mb-4 text-purple-500 dark:text-purple-400">
            Tracking Mode
          </h2>

          <div className="space-y-5">
            <label className="flex items-start gap-4 cursor-pointer">
              <input
                type="radio"
                name="trackingMode"
                checked={trackingMode === "workHours"}
                onChange={() => setTrackingMode("workHours")}
                className="mt-1 accent-purple-500"
              />
              <div>
                <div className="font-medium">Work Hours Only</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Track productivity during work hours (9 AM – 6 PM)
                </div>
              </div>
            </label>

            <label className="flex items-start gap-4 cursor-pointer">
              <input
                type="radio"
                name="trackingMode"
                checked={trackingMode === "fullTime"}
                onChange={() => setTrackingMode("fullTime")}
                className="mt-1 accent-purple-500"
              />
              <div>
                <div className="font-medium">Full Time</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Track all computer activity throughout the day
                </div>
              </div>
            </label>
          </div>
        </section>

        {/* --- FEATURES --- */}
        <section className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-[0_8px_30px_rgba(168,85,247,0.1)] transition-all">
          <h2 className="text-xl font-semibold mb-4 text-purple-500 dark:text-purple-400">
            Features
          </h2>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 font-medium">
                  <Eye className="w-5 h-5 text-purple-400" /> Eye Tracking
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enhanced focus monitoring using eye-tracking technology.
                </p>
              </div>
              <button
                onClick={() => setEyeTracking(!eyeTracking)}
                className={`w-14 h-7 rounded-full relative transition-all ${
                  eyeTracking ? "bg-purple-500" : "bg-gray-400 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    eyeTracking ? "translate-x-7" : ""
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 font-medium">
                  <Bell className="w-5 h-5 text-purple-400" /> Notifications
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive recommendations and break reminders.
                </p>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`w-14 h-7 rounded-full relative transition-all ${
                  notifications ? "bg-purple-500" : "bg-gray-400 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    notifications ? "translate-x-7" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* --- PRODUCTIVE APPS --- */}
        <section className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-[0_8px_30px_rgba(168,85,247,0.1)] transition-all">
          <h2 className="text-xl font-semibold mb-4 text-purple-500 dark:text-purple-400">
            Productive Apps (Whitelist)
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Apps that count as productive time.
          </p>

          <div className="flex gap-3 mb-4">
            <input
              value={productiveInput}
              onChange={(e) => setProductiveInput(e.target.value)}
              placeholder="Add app name..."
              className="flex-1 px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#1a1a1d] border border-gray-300 dark:border-white/10 focus:ring-2 focus:ring-purple-400 outline-none"
            />
            <button
              onClick={() => handleAddApp("productive")}
              className="px-4 py-2 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-600 transition flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {productiveApps.map((app) => (
              <div
                key={app}
                className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full"
              >
                {app}
                <Trash2
                  className="w-4 h-4 cursor-pointer hover:text-red-500"
                  onClick={() => handleRemove("productive", app)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* --- DISTRACTING SITES --- */}
        <section className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-[0_8px_30px_rgba(168,85,247,0.1)] transition-all">
          <h2 className="text-xl font-semibold mb-4 text-purple-500 dark:text-purple-400">
            Distracting Sites (Blacklist)
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Sites that are considered distractions during work.
          </p>

          <div className="flex gap-3 mb-4">
            <input
              value={distractingInput}
              onChange={(e) => setDistractingInput(e.target.value)}
              placeholder="Add site name..."
              className="flex-1 px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#1a1a1d] border border-gray-300 dark:border-white/10 focus:ring-2 focus:ring-purple-400 outline-none"
            />
            <button
              onClick={() => handleAddApp("distracting")}
              className="px-4 py-2 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-600 transition flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {distractingSites.map((site) => (
              <div
                key={site}
                className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1 rounded-full"
              >
                {site}
                <Trash2
                  className="w-4 h-4 cursor-pointer hover:text-red-500"
                  onClick={() => handleRemove("distracting", site)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* --- SAVE BUTTON --- */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-400 text-white font-semibold shadow-md hover:shadow-lg transition-all"
          >
            Save Settings
          </button>
        </div>
      </main>

      {/* ✨ Premium Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-2 bg-white/70 dark:bg-[#1a1a1d]/80 backdrop-blur-md px-4 py-3 rounded-lg border border-purple-400/30 shadow-lg animate-slideIn"
          >
            <CheckCircle2 className="w-5 h-5 text-purple-500" />
            <span className="text-gray-800 dark:text-gray-100 text-sm font-medium">
              {toast.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
