import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Trophy,
  CalendarCheck,
  Star,
  Zap,
  Loader2,
  AlertCircle,
  Flame,
  Award,
  User,
  Clock,
  Gauge,
  Book,
  CheckCircle,
  Feather,
  Activity,
  Users,
} from "lucide-react";

import { motion, Variants, Variant } from "framer-motion";
import { BACKEND_URL } from "./config";

// --- Utility Functions & Interface Definitions (FIXED) ---

const getJwtToken = (): string =>
  typeof window !== "undefined" && window.localStorage
    ? window.localStorage.getItem("token") || ""
    : "";

interface GamificationStats {
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalXpEarned: number;
  title: string;
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  totalFocusTime: number;
  averageFocusScore: number;
  bestFocusScore: number;
  perfectDays: number;
  rank?: number;
  weeklyXp: number;
  monthlyXp: number;
}

interface Badge {
  badgeId: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress: number;
  requirement: number;
  xpReward: number;
  unlocked: boolean;
  tier: string;
  category: string;
  image: string;
  unlockRequirement?: {
    type: 'totalSessions' | 'totalFocusTime' | 'bestFocusScore' | 'longestStreak' | 'perfectDays' | 'level';
    value: number;
  };
}

interface Achievement {
  achievementId: string;
  title: string;
  description: string;
  category: string;
  progress: number;
  requirement: number;
  completed: boolean;
  completedAt?: Date;
  xpReward: number;
  icon: string;
}

interface Challenge {
  challengeId: string;
  name: string;
  description: string;
  type: string;
  progress: number;
  requirement: number;
  completed: boolean;
  expiresAt: string;
  xpReward: number;
}

interface Milestone {
  level: number;
  reachedAt: string;
  rewards: {
    badgesUnlocked: string[];
    featuresUnlocked: string[];
    title?: string;
  };
}

// --- Framer Motion Variants ---

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const cardHover: Variant = {
  scale: 1.03,
  boxShadow: "0 10px 20px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(139, 92, 246, 0.5)",
  transition: { type: "spring", stiffness: 300 },
};

const badgeHover: Variant = {
  scale: 1.05,
  y: -5,
  boxShadow: "0 8px 15px rgba(139, 92, 246, 0.3)",
};

const challengePulse: Variant = {
  scale: [1, 1.01, 1],
  boxShadow: [
    "0 4px 6px rgba(0, 0, 0, 0.1)",
    "0 4px 10px rgba(251, 146, 60, 0.3)",
    "0 4px 6px rgba(0, 0, 0, 0.1)",
  ],
  transition: {
    duration: 3,
    repeat: Infinity,
  },
};

// --- Main Component ---

export default function Gamification() {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllGamificationData();
  }, []);

  // ✅ ADD THIS DEBUG VERSION to see what's coming from backend
  const loadAllGamificationData = async () => {
    setLoading(true);
    setError(null);
    try {
      const jwt = getJwtToken();
      if (!jwt) {
        setError("Not authenticated");
        return;
      }

      console.log("[Gamification] 🔄 Fetching all data...");

      const [statsRes, badgesRes, achievementsRes, challengesRes, milestonesRes] =
        await Promise.all([
          axios.get(`${BACKEND_URL}/gamification/user`, {
            headers: { Authorization: `Bearer ${jwt}` },
          }),
          axios.get(`${BACKEND_URL}/gamification/badges`, {
            headers: { Authorization: `Bearer ${jwt}` },
          }),
          axios.get(`${BACKEND_URL}/gamification/achievements`, {
            headers: { Authorization: `Bearer ${jwt}` },
          }),
          axios.get(`${BACKEND_URL}/gamification/challenges`, {
            headers: { Authorization: `Bearer ${jwt}` },
          }),
          axios.get(`${BACKEND_URL}/gamification/milestones`, {
            headers: { Authorization: `Bearer ${jwt}` },
          }),
        ]);

      // ✅ DEBUG: Log all responses
      console.log("[Gamification] 📊 Stats Response:", statsRes.data);
      console.log("[Gamification] 🏆 Badges Response:", badgesRes.data);
      console.log("[Gamification] 🌟 Achievements Response:", achievementsRes.data);
      console.log("[Gamification] ⚡ Challenges Response:", challengesRes.data);
      console.log("[Gamification] 💎 Milestones Response:", milestonesRes.data);

      // ✅ FIX: Handle different response formats from backend
      const statsData = statsRes.data?.stats || statsRes.data;
      const badgesData = Array.isArray(badgesRes.data) ? badgesRes.data : badgesRes.data?.badges || [];
      const achievementsData = achievementsRes.data?.achievements || achievementsRes.data || [];
      const challengesData = challengesRes.data?.challenges || challengesRes.data || [];
      const milestonesData = milestonesRes.data?.milestones || milestonesRes.data || [];

      console.log("[Gamification] ✅ Parsed Stats:", statsData);
      console.log("[Gamification] ✅ Parsed Badges:", badgesData);
      console.log("[Gamification] ✅ Parsed Achievements:", achievementsData);
      console.log("[Gamification] ✅ Parsed Challenges:", challengesData);
      console.log("[Gamification] ✅ Parsed Milestones:", milestonesData);

      // ✅ Validate stats object
      if (!statsData || typeof statsData !== "object") {
        console.error("[Gamification] ❌ Invalid stats format:", statsData);
        setError("Invalid stats data format from backend");
        return;
      }

      setStats(statsData);
      setBadges(Array.isArray(badgesData) ? badgesData : []);
      setAchievements(Array.isArray(achievementsData) ? achievementsData : []);
      setChallenges(Array.isArray(challengesData) ? challengesData : []);
      setMilestones(Array.isArray(milestonesData) ? milestonesData : []);

      console.log("[Gamification] 🎉 All data loaded successfully");
    } catch (error: any) {
      console.error("[Gamification] ❌ Error:", error);
      console.error("[Gamification] ❌ Error Response:", error?.response?.data);
      setError(error?.response?.data?.msg || error?.message || "Failed to load gamification");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-[#0B0B0F]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-[#0B0B0F] px-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg text-gray-600 dark:text-gray-400">{error}</p>
        <button
          onClick={loadAllGamificationData}
          className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition shadow-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-[#0B0B0F]">
        <p className="text-gray-600 dark:text-gray-400">
          No gamification data available
        </p>
      </div>
    );
  }

  const xpProgress = (stats.xp / stats.xpToNextLevel) * 100;
  const unlockedBadges = badges.filter((b) => b.unlocked).length;
  const totalBadges = badges.length;
  const badgeProgress = (unlockedBadges / totalBadges) * 100;

  const unlockedAchievements = achievements.filter((a) => a.completed).length;
  const totalAchievements = achievements.length;
  const achievementProgress =
    (unlockedAchievements / totalAchievements) * 100;

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "zap": return Zap;
      case "trophy": return Trophy;
      case "star": return Star;
      case "calendar": return CalendarCheck;
      case "flame": return Flame;
      case "award": return Award;
      case "user": return User;
      case "clock": return Clock;
      case "gauge": return Gauge;
      case "book": return Book;
      case "check-circle": return CheckCircle;
      case "feather": return Feather;
      case "activity": return Activity;
      case "users": return Users;
      default: return Star;
    }
  };

  const formatFocusTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <motion.div
      className="flex flex-col min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-[#0B0B0F] text-gray-900 dark:text-gray-100 px-4 sm:px-10 py-8 space-y-10"
      initial="hidden"
      animate="show"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.header className="space-y-3" variants={itemVariants}>
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-purple-600 to-purple-300 bg-clip-text text-transparent tracking-tight">
          🚀 Your Productivity HQ
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 font-light">
          Level up, unlock badges, conquer challenges, and rise on the
          leaderboard!
        </p>
      </motion.header>

      {/* Top Summary Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={itemVariants}
      >
        {/* Level Card */}
        <motion.div
          className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-3xl p-8 shadow-2xl text-white col-span-1 border-4 border-yellow-300/50 relative overflow-hidden"
          whileHover={{ scale: 1.05, rotate: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="absolute inset-0 bg-black/10 backdrop-blur-sm z-0" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-8 h-8 drop-shadow-lg" />
              <h3 className="text-2xl font-black drop-shadow-lg">
                Level {stats.level}
              </h3>
            </div>
            <p className="text-3xl font-extrabold mb-1 drop-shadow-lg">
              {stats.title}
            </p>
            <div className="flex justify-between text-sm mt-4 font-semibold">
              <span>{stats.xp} XP</span>
              <span>{stats.xpToNextLevel} XP to next</span>
            </div>
            <div className="h-4 w-full bg-white/30 rounded-full overflow-hidden mt-2">
              <motion.div
                className="h-4 bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1.5 }}
              />
            </div>
          </div>
        </motion.div>

        {/* Streak Card */}
        <motion.div
          className="bg-white dark:bg-[#121214] rounded-3xl p-8 border border-gray-200 dark:border-white/10 shadow-lg col-span-1"
          whileHover={cardHover}
        >
          <div className="flex items-center gap-3 mb-4">
            <Flame className="w-6 h-6 text-orange-500" />
            <h3 className="text-lg font-semibold text-orange-500">
              Current Streak
            </h3>
          </div>
          <p className="text-4xl font-extrabold text-orange-500">
            {stats.currentStreak}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Longest: {stats.longestStreak} days
          </p>
        </motion.div>

        {/* Badges Progress */}
        <motion.div
          className="bg-white dark:bg-[#121214] rounded-3xl p-8 border border-gray-200 dark:border-white/10 shadow-lg col-span-1"
          whileHover={cardHover}
        >
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-6 h-6 text-green-500" />
            <h3 className="text-lg font-semibold text-green-500">Badges</h3>
          </div>
          <p className="text-4xl font-extrabold text-gray-900 dark:text-white">
            {unlockedBadges} / {totalBadges}
          </p>
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-3">
            <motion.div
              className="h-4 bg-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${badgeProgress}%` }}
              transition={{ duration: 1.5, delay: 0.2 }}
            />
          </div>
        </motion.div>

        {/* Achievements Progress */}
        <motion.div
          className="bg-white dark:bg-[#121214] rounded-3xl p-8 border border-gray-200 dark:border-white/10 shadow-lg col-span-1"
          whileHover={cardHover}
        >
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-6 h-6 text-purple-500" />
            <h3 className="text-lg font-semibold text-purple-500">
              Achievements
            </h3>
          </div>
          <p className="text-4xl font-extrabold text-gray-900 dark:text-white">
            {unlockedAchievements} / {totalAchievements}
          </p>
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-3">
            <motion.div
              className="h-4 bg-purple-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${achievementProgress}%` }}
              transition={{ duration: 1.5, delay: 0.4 }}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Stats Overview - ✅ FIXED WITH DEBUG */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4"
        variants={itemVariants}
      >
        {/* Debug: Show if stats exist */}
        {!stats && (
          <div className="col-span-5 p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <p className="text-red-600 dark:text-red-400">⚠️ Stats is null</p>
          </div>
        )}

        {stats && (
          <>
            {/* Debug: Show actual values */}
            <div className="col-span-5 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-xs">
              <p className="text-blue-600 dark:text-blue-400">
                ✅ Debug: totalSessions={stats.totalSessions}, 
                totalFocusTime={stats.totalFocusTime}, 
                avgFocusScore={stats.averageFocusScore}
              </p>
            </div>

            <StatCard
              label="Total Sessions"
              value={stats.totalSessions?.toString() || "0"}
              icon={CalendarCheck}
              color="purple"
            />
            <StatCard
              label="Total Focus Time"
              value={formatFocusTime(stats.totalFocusTime || 0)}
              icon={Clock}
              color="blue"
            />
            <StatCard
              label="Avg Focus Score"
              value={Math.round(stats.averageFocusScore || 0).toString()}
              icon={Gauge}
              color="green"
            />
            <StatCard
              label="Best Focus Score"
              value={(stats.bestFocusScore || 0).toString()}
              icon={Star}
              color="orange"
            />
            <StatCard
              label="Perfect Days"
              value={(stats.perfectDays || 0).toString()}
              icon={CalendarCheck}
              color="red"
            />
          </>
        )}
      </motion.div>

      {/* Daily/Weekly Challenges Section */}
      <motion.section className="space-y-6" variants={itemVariants}>
        <h2 className="text-3xl font-bold text-orange-500 border-b-2 border-orange-500/50 pb-2">
          ⚡ Daily Challenges
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {challenges.length === 0 ? (
            <p className="text-gray-500">No challenges available</p>
          ) : (
            challenges.map((ch, index) => {
              const now = Date.now();
              const expiresAt = new Date(ch.expiresAt).getTime();
              const timeLeftMs = expiresAt - now;
              const hoursLeft = Math.max(
                0,
                Math.floor(timeLeftMs / (1000 * 60 * 60))
              );
              const progressPercentage = Math.min(
                (ch.progress / ch.requirement) * 100,
                100
              );
              return (
                <motion.div
                  key={ch.challengeId}
                  className={`bg-white dark:bg-[#121214] rounded-2xl p-6 border-l-8 ${
                    ch.completed
                      ? "border-green-500 opacity-90"
                      : "border-orange-500"
                  } shadow-xl cursor-pointer`}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={ch.completed ? cardHover : challengePulse}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Zap
                      className={`w-7 h-7 flex-shrink-0 ${
                        ch.completed ? "text-green-500" : "text-orange-500"
                      }`}
                    />
                    <h3
                      className={`text-xl font-bold ${
                        ch.completed ? "text-green-500" : "text-orange-500"
                      }`}
                    >
                      {ch.name}
                    </h3>
                  </div>
                  <p className="text-sm mb-3 text-gray-500 dark:text-gray-400">
                    {ch.description}
                  </p>

                  <ProgressBar
                    progressPercentage={progressPercentage}
                    unlocked={ch.completed}
                    progress={ch.progress}
                    requirement={ch.requirement}
                    color={ch.completed ? "green" : "orange"}
                  />

                  {ch.completed ? (
                    <p className="text-xs font-medium text-green-500 mt-2">
                      ✓ Completed • +{ch.xpReward} XP
                    </p>
                  ) : (
                    <p className="text-xs text-orange-600 mt-2 font-semibold">
                      Time Left: {hoursLeft}h • Reward: +{ch.xpReward} XP
                    </p>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </motion.section>

      {/* Badges Section */}
      <motion.section className="space-y-6" variants={itemVariants}>
        <h2 className="text-3xl font-bold text-green-500 border-b-2 border-green-500/50 pb-2">
          🏆 Badges Collection
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {badges.length === 0 ? (
            <p className="text-gray-500">No badges available</p>
          ) : (
            badges.map((badge, index) => {
              const IconComponent = getIconComponent(badge.icon);
              const progressPercentage = Math.min(
                (badge.progress / badge.requirement) * 100,
                100
              );
              return (
                <motion.div
                  key={badge.badgeId}
                  className={`bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-lg cursor-pointer ${
                    !badge.unlocked ? "opacity-70 grayscale" : "opacity-100"
                  }`}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.05 }}
                  whileHover={badgeHover}
                >
                  {/* Badge Image/Icon */}
                  <motion.div className="flex items-center justify-center mb-4">
                    {badge.image ? (
                      <motion.img
                        src={badge.image}
                        alt={badge.name}
                        className="w-20 h-20 rounded-xl shadow-xl object-contain mx-auto border-4 border-purple-500/50 bg-gray-50 dark:bg-[#0B0B12]"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      />
                    ) : (
                      <IconComponent
                        className={`w-14 h-14 ${
                          badge.unlocked ? "text-purple-500" : "text-gray-400"
                        }`}
                      />
                    )}
                  </motion.div>

                  <div className="flex justify-between items-center mb-2">
                    <h3
                      className={`text-xl font-bold ${
                        badge.unlocked ? "text-gray-900 dark:text-white" : "text-gray-400"
                      }`}
                    >
                      {badge.name || "Unknown Badge"}
                    </h3>
                    {badge.tier && <BadgeTierTag tier={badge.tier} />}
                  </div>

                  <p
                    className={`text-sm mb-3 ${
                      badge.unlocked
                        ? "text-gray-500 dark:text-gray-400"
                        : "text-gray-400"
                    }`}
                  >
                    {badge.description || "No description"}
                  </p>

                  <ProgressBar
                    progressPercentage={progressPercentage}
                    unlocked={badge.unlocked}
                    progress={badge.progress || 0}
                    requirement={badge.requirement || 1}
                  />

                  <BadgeFooter
                    unlocked={badge.unlocked}
                    unlockedAt={badge.unlockedAt}
                    xpReward={badge.xpReward || 0}
                    progressPercentage={progressPercentage}
                    unlockRequirement={badge.unlockRequirement || null}
                  />
                </motion.div>
              );
            })
          )}
        </div>
      </motion.section>

      {/* Achievements Section */}
      <motion.section className="space-y-6" variants={itemVariants}>
        <h2 className="text-3xl font-bold text-purple-500 border-b-2 border-purple-500/50 pb-2">
          🌟 Core Achievements
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {achievements.length === 0 ? (
            <p className="text-gray-500">No achievements available</p>
          ) : (
            achievements.map((ach, index) => {
              const IconComponent = getIconComponent(ach.icon);
              const progressPercentage = Math.min(
                (ach.progress / ach.requirement) * 100,
                100
              );
              return (
                <motion.div
                  key={ach.achievementId}
                  className={`bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-md cursor-pointer ${
                    !ach.completed ? "opacity-70" : "opacity-100"
                  }`}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.08 }}
                  whileHover={cardHover}
                >
                  <div className="flex items-start gap-4 mb-3">
                    <IconComponent
                      className={`w-8 h-8 flex-shrink-0 ${
                        ach.completed ? "text-purple-500" : "text-gray-400"
                      }`}
                    />
                    <div>
                      <h3
                        className={`text-xl font-bold mb-1 ${
                          ach.completed
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-400"
                        }`}
                      >
                        {ach.title || "Unknown Achievement"}
                      </h3>
                      <p
                        className={`text-sm ${
                          ach.completed
                            ? "text-gray-500 dark:text-gray-400"
                            : "text-gray-400"
                        }`}
                      >
                        {ach.description || "No description"}
                      </p>
                    </div>
                  </div>

                  <ProgressBar
                    progressPercentage={progressPercentage}
                    unlocked={ach.completed}
                    progress={ach.progress || 0}
                    requirement={ach.requirement || 1}
                    color="purple"
                  />

                  <BadgeFooter
                    unlocked={ach.completed}
                    unlockedAt={ach.completedAt}
                    xpReward={ach.xpReward || 0}
                    progressPercentage={progressPercentage}
                    unlockRequirement={null}
                  />
                </motion.div>
              );
            })
          )}
        </div>
      </motion.section>

      {/* Milestones */}
      <motion.section className="space-y-6" variants={itemVariants}>
        <h2 className="text-3xl font-bold text-blue-500 border-b-2 border-blue-500/50 pb-2">
          💎 Level Milestones
        </h2>
        <div className="space-y-4">
          {milestones.length === 0 && (
            <p className="text-md text-gray-500">
              No milestones reached yet. Keep leveling up!
            </p>
          )}
          {milestones.map((milestone, index) => (
            <motion.div
              key={milestone.level}
              className="bg-white dark:bg-[#0E0E13] border border-blue-500/30 rounded-xl p-5 flex flex-col md:flex-row items-center gap-4 shadow-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{
                backgroundColor: "rgba(37, 99, 235, 0.05)",
              }}
            >
              <div className="text-2xl font-extrabold text-blue-500 w-full md:w-auto flex-shrink-0">
                Lvl {milestone.level}
              </div>
              <div className="text-gray-700 dark:text-gray-200 flex-1 w-full">
                {milestone.rewards.title && (
                  <p className="font-bold text-lg mb-1">
                    🎉 Title Unlocked: {milestone.rewards.title}
                  </p>
                )}
                {milestone.rewards.badgesUnlocked.length > 0 && (
                  <p className="text-sm">
                    Badges: {milestone.rewards.badgesUnlocked.join(", ")}
                  </p>
                )}
                {milestone.rewards.featuresUnlocked.length > 0 && (
                  <p className="text-sm">
                    New Features:{" "}
                    {milestone.rewards.featuresUnlocked.join(", ")}
                  </p>
                )}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                Reached on: {new Date(milestone.reachedAt).toLocaleDateString()}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}

// --- Helper Components (FIXED) ---

// ✅ FIX: Replace dynamic color classes with a proper color map
const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) => {
  // ✅ FIX: Map colors to actual Tailwind classes
  const colorClasses: { [key: string]: string } = {
    purple: "text-purple-500",
    orange: "text-orange-500",
    green: "text-green-500",
    blue: "text-blue-500",
    red: "text-red-500",
    yellow: "text-yellow-500",
  };

  const iconClass = colorClasses[color] || colorClasses.purple;
  const textClass = colorClasses[color] || colorClasses.purple;

  return (
    <motion.div
      className="bg-white dark:bg-[#121214] rounded-xl p-4 border border-gray-200 dark:border-white/10 shadow-sm flex flex-col items-start"
      whileHover={{ scale: 1.02, backgroundColor: "rgba(139, 92, 246, 0.05)" }}
    >
      <Icon className={`w-5 h-5 mb-1 ${iconClass}`} />
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
        {label}
      </p>
      <p className={`text-2xl font-extrabold ${textClass} mt-0.5`}>
        {value}
      </p>
    </motion.div>
  );
};

const BadgeTierTag = ({ tier }: { tier: string }) => {
  const tierClasses: { [key: string]: string } = {
    gold: "bg-yellow-200 text-yellow-800",
    silver: "bg-gray-200 text-gray-800",
    bronze: "bg-orange-200 text-orange-700",
    platinum: "bg-gray-100 dark:bg-gray-700 dark:text-gray-200 text-gray-700 border border-gray-300",
    diamond: "bg-cyan-100 text-blue-900 border border-cyan-300",
    default: "bg-purple-200 text-purple-800",
  };
  const className = tierClasses[tier.toLowerCase()] || tierClasses.default;
  return (
    <span
      className={`uppercase text-xs font-bold rounded-full px-3 py-1 ${className}`}
    >
      {tier}
    </span>
  );
};

const ProgressBar = ({
  progressPercentage,
  unlocked,
  progress,
  requirement,
  color = "purple",
}: {
  progressPercentage: number;
  unlocked: boolean;
  progress: number;
  requirement: number;
  color?: string;
}) => {
  const colorMap: { [key: string]: string } = {
    purple: "bg-purple-500 dark:bg-purple-400",
    orange: "bg-orange-500 dark:bg-orange-400",
    green: "bg-green-500 dark:bg-green-400",
    blue: "bg-blue-500 dark:bg-blue-400",
    red: "bg-red-500 dark:bg-red-400",
  };

  const barColor = colorMap[color] || colorMap.purple;

  return (
    <>
      <p className="text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
        Progress: {progress} / {requirement}
      </p>
      <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-2 rounded-full ${
            unlocked ? barColor : "bg-gray-400 dark:bg-gray-500"
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 1 }}
        />
      </div>
    </>
  );
};

const UnlockRequirementDisplay = ({
  type,
  value,
}: {
  type?: string;
  value?: number;
}) => {
  if (!type || !value) {
    return null;
  }

  let displayValue = value.toString();
  let metric = "";

  switch (type) {
    case "totalSessions":
      metric = "Total Sessions";
      break;
    case "totalFocusTime":
      if (value >= 60) {
        displayValue = `${Math.floor(value / 60)} hours`;
      } else {
        displayValue = `${value} minutes`;
      }
      metric = "Focus Time";
      break;
    case "bestFocusScore":
      metric = "Best Focus Score";
      break;
    case "longestStreak":
      metric = "Longest Streak";
      displayValue = `${value} days`;
      break;
    case "perfectDays":
      metric = "Perfect Days (>90% Focus)";
      break;
    case "level":
      metric = "Player Level";
      break;
    default:
      metric = "Specific Requirement";
  }

  return (
    <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-2">
      Unlock Requirement: <strong>{displayValue}</strong> {metric}
    </p>
  );
};

const BadgeFooter = ({
  unlocked,
  unlockedAt,
  xpReward,
  unlockRequirement,
  progressPercentage,
}: {
  unlocked: boolean;
  unlockedAt?: Date;
  xpReward: number;
  progressPercentage: number;
  unlockRequirement?: {
    type?: string;
    value?: number;
  } | null;
}) => {
  if (!xpReward && xpReward !== 0) {
    console.warn("[BadgeFooter] xpReward is undefined");
    return null;
  }

  if (unlocked) {
    return (
      <p className="text-xs font-medium text-green-500 mt-2">
        ✓ Unlocked
        {unlockedAt &&
          ` • ${new Date(unlockedAt).toLocaleDateString()}`}{" "}
        • <strong>+{xpReward} XP</strong>
      </p>
    );
  }

  return (
    <>
      {unlockRequirement && unlockRequirement.type ? (
        <UnlockRequirementDisplay
          type={unlockRequirement.type}
          value={unlockRequirement.value}
        />
      ) : (
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-2">
          Keep working to unlock this!
        </p>
      )}
      <p className="text-xs font-medium text-yellow-500 mt-1">
        Reward: <strong>+{xpReward} XP</strong>
      </p>
    </>
  );
};