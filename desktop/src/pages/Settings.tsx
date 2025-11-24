import React, { useState, useEffect } from "react";
import axios from "axios";
import { Eye, Bell, Plus, Trash2, CheckCircle2, Loader2, RotateCcw, AlertCircle } from "lucide-react";
import { BACKEND_URL } from "./config";

type Toast = { id: number; text: string; type?: 'success' | 'error' };

const getJwtToken = (): string =>
  (typeof window !== "undefined" && window.localStorage)
    ? (window.localStorage.getItem("token") || "")
    : "";

export default function Settings() {
  // Preferences
  const [trackingMode, setTrackingMode] = useState("workHours");
  const [eyeTracking, setEyeTracking] = useState(true);
  const [notifications, setNotifications] = useState(true);

  // Lists - now showing ALL items
  const [whitelistedApps, setWhitelistedApps] = useState<string[]>([]);
  const [whitelistedUrls, setWhitelistedUrls] = useState<string[]>([]);
  const [blacklistedApps, setBlacklistedApps] = useState<string[]>([]);
  const [blacklistedUrls, setBlacklistedUrls] = useState<string[]>([]);

  // Input states
  const [productiveInput, setProductiveInput] = useState("");
  const [distractingInput, setDistractingInput] = useState("");

  // UI states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = React.useRef(1);

  const pushToast = (text: string, type: 'success' | 'error' = 'success') => {
    const id = toastId.current++;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const jwt = getJwtToken();
        if (!jwt) {
          pushToast("Not authenticated", 'error');
          return;
        }

        const { data } = await axios.get(`${BACKEND_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${jwt}` }
        });

        const user = data.user;
        
        // Set all lists
        setWhitelistedApps(user.whitelistedApps || []);
        setWhitelistedUrls(user.whitelistedUrls || []);
        setBlacklistedApps(user.blacklistedApps || []);
        setBlacklistedUrls(user.blacklistedUrls || []);
        
        // Load preferences
        setEyeTracking(user.preferences?.eyeTrackingEnabled ?? true);
        setNotifications(user.preferences?.notificationsEnabled ?? true);
        setTrackingMode(user.preferences?.trackingMode || "workHours");

        console.log('Loaded user data:', {
          whitelistedApps: user.whitelistedApps,
          whitelistedUrls: user.whitelistedUrls,
          blacklistedApps: user.blacklistedApps,
          blacklistedUrls: user.blacklistedUrls
        });

      } catch (error: any) {
        console.error("Error loading profile:", error);
        pushToast(error?.response?.data?.msg || "Failed to load settings", 'error');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  // Add to whitelist
  const handleAddProductive = async () => {
    const input = productiveInput.trim().toLowerCase();
    if (!input) return;

    try {
      const jwt = getJwtToken();
      const type = input.includes('.') ? 'url' : 'app';
      
      const response = await axios.post(
        `${BACKEND_URL}/user/whitelist/add`,
        { type, value: input },
        { headers: { Authorization: `Bearer ${jwt}` } }
      );

      // Update local state immediately
      if (type === 'app') {
        setWhitelistedApps(prev => [...prev, input]);
      } else {
        setWhitelistedUrls(prev => [...prev, input]);
      }

      pushToast(response.data.msg || `✅ Added ${input} to productive list`, 'success');
      setProductiveInput("");
    } catch (error: any) {
      console.error('Add whitelist error:', error);
      pushToast(error?.response?.data?.msg || "Failed to add item", 'error');
    }
  };

  // Add to blacklist
  const handleAddDistracting = async () => {
    const input = distractingInput.trim().toLowerCase();
    if (!input) return;

    try {
      const jwt = getJwtToken();
      const type = input.includes('.') ? 'url' : 'app';
      
      const response = await axios.post(
        `${BACKEND_URL}/user/blacklist/add`,
        { type, value: input },
        { headers: { Authorization: `Bearer ${jwt}` } }
      );

      // Update local state immediately
      if (type === 'app') {
        setBlacklistedApps(prev => [...prev, input]);
      } else {
        setBlacklistedUrls(prev => [...prev, input]);
      }

      pushToast(response.data.msg || `✅ Added ${input} to distracting list`, 'success');
      setDistractingInput("");
    } catch (error: any) {
      console.error('Add blacklist error:', error);
      pushToast(error?.response?.data?.msg || "Failed to add item", 'error');
    }
  };

  // Remove from whitelist
  const handleRemoveProductive = async (item: string) => {
    try {
      const jwt = getJwtToken();
      const type = item.includes('.') ? 'url' : 'app';
      
      const response = await axios.delete(
        `${BACKEND_URL}/user/whitelist/remove/${encodeURIComponent(item)}`,
        {
          headers: { Authorization: `Bearer ${jwt}` },
          data: { type }
        }
      );

      // Update local state immediately
      setWhitelistedApps(prev => prev.filter(a => a !== item));
      setWhitelistedUrls(prev => prev.filter(u => u !== item));
      
      pushToast(response.data.msg || `✅ Removed ${item}`, 'success');
    } catch (error: any) {
      console.error('Remove whitelist error:', error);
      pushToast(error?.response?.data?.msg || "Failed to remove item", 'error');
    }
  };

  // Remove from blacklist
  const handleRemoveDistracting = async (item: string) => {
    try {
      const jwt = getJwtToken();
      const type = item.includes('.') ? 'url' : 'app';
      
      const response = await axios.delete(
        `${BACKEND_URL}/user/blacklist/remove/${encodeURIComponent(item)}`,
        {
          headers: { Authorization: `Bearer ${jwt}` },
          data: { type }
        }
      );

      // Update local state immediately
      setBlacklistedApps(prev => prev.filter(a => a !== item));
      setBlacklistedUrls(prev => prev.filter(u => u !== item));
      
      pushToast(response.data.msg || `✅ Removed ${item}`, 'success');
    } catch (error: any) {
      console.error('Remove blacklist error:', error);
      pushToast(error?.response?.data?.msg || "Failed to remove item", 'error');
    }
  };

  // Reset lists to defaults
  const handleResetList = async (listType: 'whitelist' | 'blacklist') => {
    try {
      const jwt = getJwtToken();
      const response = await axios.post(
        `${BACKEND_URL}/user/reset-defaults`,
        { listType },
        { headers: { Authorization: `Bearer ${jwt}` } }
      );

      // Reload profile to get defaults
      const { data } = await axios.get(`${BACKEND_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${jwt}` }
      });

      const user = data.user;
      if (listType === 'whitelist') {
        setWhitelistedApps(user.whitelistedApps || []);
        setWhitelistedUrls(user.whitelistedUrls || []);
      } else {
        setBlacklistedApps(user.blacklistedApps || []);
        setBlacklistedUrls(user.blacklistedUrls || []);
      }

      pushToast(response.data.msg || `✅ ${listType} reset to defaults`, 'success');
    } catch (error: any) {
      console.error('Reset list error:', error);
      pushToast(error?.response?.data?.msg || "Failed to reset list", 'error');
    }
  };

  // Save preferences
  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const jwt = getJwtToken();
      const response = await axios.put(
        `${BACKEND_URL}/user/preferences`,
        {
          eyeTrackingEnabled: eyeTracking,
          notificationsEnabled: notifications,
          trackingMode
        },
        { headers: { Authorization: `Bearer ${jwt}` } }
      );

      pushToast("✅ Preferences saved successfully!", 'success');
    } catch (error: any) {
      console.error('Save preferences error:', error);
      pushToast(error?.response?.data?.msg || "Failed to save preferences", 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-[#0B0B0F]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Combine apps and URLs for display
  const allProductive = [...whitelistedApps, ...whitelistedUrls];
  const allDistracting = [...blacklistedApps, ...blacklistedUrls];

  return (
    <div className="flex flex-col min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-[#0B0B0F] text-gray-900 dark:text-gray-100">
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
        {/* TRACKING MODE */}
        <section className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-purple-500 dark:text-purple-400">
            Tracking Mode
          </h2>
          <div className="space-y-5">
            <label className="flex items-start gap-4 cursor-pointer">
              <input
                type="radio"
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

        {/* FEATURES */}
        <section className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-sm">
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

        {/* PRODUCTIVE APPS/URLS */}
        <section className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-purple-500 dark:text-purple-400">
                Productive Apps & Sites
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Total: {allProductive.length} items
              </p>
            </div>
            <button
              onClick={() => handleResetList('whitelist')}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-500 transition"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Apps and domains that count as productive (e.g., "vscode" or "github.com")
          </p>
          <div className="flex gap-3 mb-4">
            <input
              value={productiveInput}
              onChange={(e) => setProductiveInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddProductive()}
              placeholder="Add app or domain..."
              className="flex-1 px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#1a1a1d] border border-gray-300 dark:border-white/10 focus:ring-2 focus:ring-purple-400 outline-none"
            />
            <button
              onClick={handleAddProductive}
              className="px-4 py-2 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-600 transition flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
            {allProductive.length === 0 ? (
              <p className="text-sm text-gray-400">No productive apps or sites added yet.</p>
            ) : (
              allProductive.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full"
                >
                  <span className="text-sm">{item}</span>
                  <Trash2
                    className="w-4 h-4 cursor-pointer hover:text-red-500 transition"
                    onClick={() => handleRemoveProductive(item)}
                  />
                </div>
              ))
            )}
          </div>
        </section>

        {/* DISTRACTING APPS/URLS */}
        <section className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-purple-500 dark:text-purple-400">
                Distracting Apps & Sites
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Total: {allDistracting.length} items
              </p>
            </div>
            <button
              onClick={() => handleResetList('blacklist')}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-500 transition"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Apps and sites considered distractions (e.g., "instagram" or "youtube.com")
          </p>
          <div className="flex gap-3 mb-4">
            <input
              value={distractingInput}
              onChange={(e) => setDistractingInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddDistracting()}
              placeholder="Add app or site..."
              className="flex-1 px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#1a1a1d] border border-gray-300 dark:border-white/10 focus:ring-2 focus:ring-purple-400 outline-none"
            />
            <button
              onClick={handleAddDistracting}
              className="px-4 py-2 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-600 transition flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
            {allDistracting.length === 0 ? (
              <p className="text-sm text-gray-400">No distracting apps or sites added yet.</p>
            ) : (
              allDistracting.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1 rounded-full"
                >
                  <span className="text-sm">{item}</span>
                  <Trash2
                    className="w-4 h-4 cursor-pointer hover:text-red-500 transition"
                    onClick={() => handleRemoveDistracting(item)}
                  />
                </div>
              ))
            )}
          </div>
        </section>

        {/* SAVE BUTTON */}
        <div className="flex justify-end">
          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-400 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </main>

      {/* TOASTS */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 backdrop-blur-md px-4 py-3 rounded-lg border shadow-lg animate-slideIn ${
              toast.type === 'error'
                ? 'bg-red-50/70 dark:bg-red-900/20 border-red-400/30'
                : 'bg-white/70 dark:bg-[#1a1a1d]/80 border-purple-400/30'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-purple-500" />
            )}
            <span className={`text-sm font-medium ${
              toast.type === 'error' 
                ? 'text-red-800 dark:text-red-200' 
                : 'text-gray-800 dark:text-gray-100'
            }`}>
              {toast.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
