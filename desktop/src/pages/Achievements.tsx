import React from "react";
import { Trophy, CalendarCheck, Star, Zap } from "lucide-react";

export default function Achievements() {
  return (
    <div className="flex flex-col min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-[#0B0B0F] text-gray-900 dark:text-gray-100 px-10 py-8 space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-200 bg-clip-text text-transparent">
          Achievements
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Track your progress and unlock rewards
        </p>
      </header>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Level Card */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-400 rounded-2xl p-6 shadow-md text-white">
          <div className="flex items-center gap-3 mb-4">
            <Star className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Level</h3>
          </div>
          <p className="text-3xl font-bold">12</p>
          <div className="flex justify-between text-sm mt-2">
            <span>2450 XP</span>
            <span>6000 XP</span>
          </div>
          <div className="h-3 w-full bg-white/30 rounded-full overflow-hidden mt-2">
            <div className="h-3 bg-white rounded-full" style={{ width: "40%" }} />
          </div>
        </div>

        {/* Current Streak */}
        <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-6 h-6 text-purple-500" />
            <h3 className="text-lg font-semibold text-purple-500 dark:text-purple-400">
              Current Streak
            </h3>
          </div>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">5 days</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Keep it going! Work 2 more days to reach your longest streak.
          </p>
        </div>

        {/* Achievements Progress */}
        <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-6 h-6 text-green-500" />
            <h3 className="text-lg font-semibold text-green-500">Achievements</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">2 / 4</p>
          <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
            <div className="h-3 bg-purple-500 rounded-full" style={{ width: "50%" }} />
          </div>
        </div>
      </div>

      {/* All Achievements Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-purple-500 dark:text-purple-400">
          All Achievements
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Focus Master */}
          <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-6 h-6 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Focus Master
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Maintain a focus score above 80 for 1 hour
            </p>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Progress
            </p>
            <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
              <div className="h-3 bg-purple-500 dark:bg-purple-400 rounded-full" style={{ width: "100%" }} />
            </div>
            <p className="text-sm font-medium text-green-500">✓ Unlocked • +100 XP</p>
          </div>

          {/* Weak Warrior (Locked) */}
          <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-md opacity-50">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-6 h-6 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-400">Weak Warrior</h3>
            </div>
            <p className="text-sm text-gray-400 mb-2">
              Complete 7 consecutive days of focused work
            </p>
            <p className="text-xs font-semibold text-gray-400 mb-1">Progress</p>
            <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
              <div className="h-3 bg-purple-500 dark:bg-purple-400 rounded-full" style={{ width: "70%" }} />
            </div>
            <p className="text-sm font-medium text-gray-400">Locked</p>
          </div>

          {/* Distraction Destroyer */}
          <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-6 h-6 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Distraction Destroyer</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Spend less than 10% time on distracting apps
            </p>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Progress</p>
            <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
              <div className="h-3 bg-purple-500 dark:bg-purple-400 rounded-full" style={{ width: "100%" }} />
            </div>
            <p className="text-sm font-medium text-green-500">✓ Unlocked • +100 XP</p>
          </div>

          {/* Morning Glory */}
          <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <CalendarCheck className="w-6 h-6 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Morning Glory</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Start 5 focus sessions before 9 AM
            </p>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Progress</p>
            <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
              <div className="h-3 bg-purple-500 dark:bg-purple-400 rounded-full" style={{ width: "60%" }} />
            </div>
            <p className="text-sm font-medium text-yellow-500">In Progress</p>
          </div>
        </div>
      </section>
    </div>
  );
}
