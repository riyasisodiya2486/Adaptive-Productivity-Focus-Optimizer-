import mongoose from "mongoose";
import { Gamification, IBadge, IAchievement, IChallenge } from "../models/gamification.model";
import { Session } from "../models/session.model";
import { Activity } from "../models/activity.model";

// Badge Definitions
export const BADGE_DEFINITIONS = {
  FOCUS_HERO: {
    badgeId: 'focus_hero',
    name: 'Focus Hero',
    tier: 'gold' as const,
    category: 'focus' as const,
    description:
      'A gleaming golden helmet with piercing blue eyes, glowing aura, and a lightning bolt motif, symbolizing mental clarity and heroic attention.',
    icon: 'zap',
    xpReward: 500,
    image: '/badges/focusHero.jpg'
  },

  STREAK_TITAN: {
    badgeId: 'streak_titan',
    name: 'Streak Titan',
    tier: 'platinum' as const,
    category: 'streak' as const,
    description:
      'A robust titan figure holding a blazing torch high atop crystal stairs, surrounded by a ring of daily calendar icons, representing unstoppable streaks.',
    icon: 'flame',
    xpReward: 1200,
    image: '/badges/streakTitan.jpg'
  },

  PRODUCTIVITY_ALCHEMIST: {
    badgeId: 'productivity_alchemist',
    name: 'Productivity Alchemist',
    tier: 'silver' as const,
    category: 'productivity' as const,
    description:
      'A mystical open book radiating sparkling purple energy, gears and clocks swirling around, with a shimmering philosopher’s stone floating above.',
    icon: 'book',
    xpReward: 600,
    image: '/badges/productivityAlchemist.png'
  },

  DISTRACTION_DESTROYER: {
    badgeId: 'distraction_destroyer',
    name: 'Distraction Destroyer',
    tier: 'gold' as const,
    category: 'focus' as const,
    description:
      'A super-heroic shield breaking through a cloud of red distractions, surrounded by digital icons being shattered and scattered away.',
    icon: 'shield',
    xpReward: 400,
    image: '/badges/distractionDestroyer.png'
  },

  TIME_MASTER: {
    badgeId: 'time_master',
    name: 'Time Master',
    tier: 'silver' as const,
    category: 'time' as const,
    description:
      'A majestic hourglass with glowing, liquid gold sand suspended mid-air, surrounded by ethereal time ribbons and ancient runes, bathed in radiant light.',
    icon: 'clock',
    xpReward: 700,
    image: '/badges/timeMaster.png'
  },

  ULTRA_CONSISTENCY: {
    badgeId: 'ultra_consistency',
    name: 'Ultra Consistency',
    tier: 'platinum' as const,
    category: 'streak' as const,
    description:
      'A platinum badge crowned with laurel wreaths, a diamond star at the center, and multiple flawless checkmarks radiating outward in a sunburst.',
    icon: 'check-circle',
    xpReward: 1500,
    image: '/badges/ultraConsistency.png'
  },

  ZEN_GRANDMASTER: {
    badgeId: 'zen_grandmaster',
    name: 'Zen Grandmaster',
    tier: 'platinum' as const,
    category: 'mastery' as const,
    description:
      'A meditating wise sage atop a floating lotus, radiating soft blue and silver light, tranquil mountains and a rising sun in the background.',
    icon: 'feather',
    xpReward: 2000,
    image: '/badges/zenGrandmaster.png'
  },

  LIGHTNING_PERFORMER: {
    badgeId: 'lightning_performer',
    name: 'Lightning Performer',
    tier: 'gold' as const,
    category: 'productivity' as const,
    description:
      'A bold, electric blue badge with a roaring lion’s head and zig-zagging lightning bolts bursting out, set against a digital circuit backdrop.',
    icon: 'activity',
    xpReward: 1000,
    image: '/badges/lightningPerformer.png'
  },

  ALL_STAR_COLLABORATOR: {
    badgeId: 'all_star_collaborator',
    name: 'All-Star Collaborator',
    tier: 'gold' as const,
    category: 'social' as const,
    description:
      'A shimmering constellation of joined hands and stardust, with vibrant colors forming a circle and a brilliant multi-pointed star at the center.',
    icon: 'users',
    xpReward: 900,
    image: '/badges/all-StarCollaborator.png'
  },

  LEGENDARY_PRODUCER: {
    badgeId: 'legendary_producer',
    name: 'Legendary Producer',
    tier: 'diamond' as const,
    category: 'mastery' as const,
    description:
      'An ornate, glowing crown studded with cosmic gems, atop a hierarchy of stacked achievement icons, surrounded by cascading ribbons of light.',
    icon: 'star',
    xpReward: 5000,
    image: '/badges/legendaryProducer.png'
  }
};



// Achievement Definitions
export const ACHIEVEMENT_DEFINITIONS = {
    FIRST_HOUR: {
        achievementId: 'first_hour',
        title: 'First Hour',
        description: 'Complete 1 hour of focused work',
        category: 'time' as const,
        requirement: 60,
        xpReward: 50,
        icon: 'clock'
    },
    TEN_SESSIONS: {
        achievementId: 'ten_sessions',
        title: 'Getting Started',
        description: 'Complete 10 focus sessions',
        category: 'productivity' as const,
        requirement: 10,
        xpReward: 100,
        icon: 'target'
    },
    HIGH_FOCUS: {
        achievementId: 'high_focus',
        title: 'Laser Focused',
        description: 'Achieve a focus score of 95 or higher',
        category: 'focus' as const,
        requirement: 95,
        xpReward: 200,
        icon: 'zap'
    },
    THREE_DAY_STREAK: {
        achievementId: 'three_day_streak',
        title: 'Building Momentum',
        description: 'Maintain a 3-day streak',
        category: 'streak' as const,
        requirement: 3,
        xpReward: 75,
        icon: 'flame'
    },
    HUNDRED_HOURS: {
        achievementId: 'hundred_hours',
        title: '100 Hour Club',
        description: 'Accumulate 100 hours of focus time',
        category: 'time' as const,
        requirement: 6000,
        xpReward: 1000,
        icon: 'hourglass'
    },
    FIFTY_SESSIONS: {
        achievementId: 'fifty_sessions',
        title: 'Consistency King',
        description: 'Complete 50 focus sessions',
        category: 'productivity' as const,
        requirement: 50,
        xpReward: 300,
        icon: 'repeat'
    }
};

// [1] Challenge Pools (expand anytime)
const DAILY_CHALLENGE_POOL = [
  { name: "Daily Grind", description: "Complete 3 focus sessions today", type: "daily", requirement: 3, xpReward: 100 },
  { name: "Early Riser", description: "Start your first session before 8am", type: "daily", requirement: 1, xpReward: 120, customCheck: "startBefore8am" },
  { name: "Distraction Free", description: "Finish a session with zero distractions", type: "daily", requirement: 1, xpReward: 120, customCheck: "noDistractions" },
  { name: "Average Joe", description: "Average focus score above 75 today", type: "daily", requirement: 75, xpReward: 130, customCheck: "avgFocusAbove75" }
];

const WEEKLY_CHALLENGE_POOL = [
  { name: "Weekly Warrior", description: "Complete 15 sessions this week", type: "weekly", requirement: 15, xpReward: 400 },
  { name: "Hour Hero", description: "Log 10 hours of focus this week", type: "weekly", requirement: 600, xpReward: 500 },
  { name: "No Missed Days", description: "Work every day this week", type: "weekly", requirement: 7, xpReward: 700, customCheck: "noDaysMissed" },
  { name: "High Roller", description: "Achieve a focus score of 90+ in 5 sessions", type: "weekly", requirement: 5, xpReward: 500, customCheck: "fiveHighFocusSessions" }
];

const MONTHLY_CHALLENGE_POOL = [
  { name: "Monthly Marathon", description: "Complete 40 sessions in a month", type: "monthly", requirement: 40, xpReward: 1500 },
  { name: "Streak Master", description: "Maintain a 10-day streak this month", type: "monthly", requirement: 10, xpReward: 1200, customCheck: "tenDayStreak" },
  { name: "Focus Legend", description: "Average focus above 90 this month", type: "monthly", requirement: 90, xpReward: 2000, customCheck: "avgFocusAbove90" },
  { name: "All-Star", description: "Do a session every Monday this month", type: "monthly", requirement: 4, xpReward: 1750, customCheck: "fourMondays" }
];

function pickRandomChallenges(pool: any[], count: number) {
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
function getWeekNumber(date: Date) {
  const firstJan = new Date(date.getFullYear(), 0, 1);
  return Math.ceil((((date.getTime() - firstJan.getTime()) / 86400000) + firstJan.getDay()+1) / 7);
}


export class GamificationService {
    
    // Calculate XP required for next level (progressive scaling)
    static calculateXpForLevel(level: number): number {
        return Math.floor(100 * Math.pow(level, 1.5));
    }

    // Calculate player title based on level
    static calculatePlayerTitle(level: number): string {
        if (level <= 5) return 'Focus Novice';
        if (level <= 10) return 'Concentration Apprentice';
        if (level <= 20) return 'Productivity Warrior';
        if (level <= 30) return 'Focus Master';
        if (level <= 50) return 'Zen Grandmaster';
        return 'Legendary Producer';
    }

    // Get or create gamification profile
    static async getUserGamification(userId: string) {
        let gamification = await Gamification.findOne({ userId });

        if (!gamification) {
            gamification = await Gamification.create({
                userId,
                level: 1,
                xp: 0,
                xpToNextLevel: this.calculateXpForLevel(1),
                totalXpEarned: 0,
                title: 'Focus Novice',
                achievements: this.initializeAchievements(),
                challenges: await this.generateDailyChallenges()
            });
        }

        return gamification;
    }

    // Initialize all achievements with progress 0
    static initializeAchievements(): any[] {
        return Object.values(ACHIEVEMENT_DEFINITIONS).map(achievement => ({
            achievementId: achievement.achievementId,
            title: achievement.title,
            description: achievement.description,
            category: achievement.category,
            progress: 0,
            requirement: achievement.requirement,
            completed: false,
            xpReward: achievement.xpReward,
            icon: achievement.icon
        }));
    }

    // Generate daily challenges
    static async generateDailyChallenges(): Promise<any[]> {
        const today = new Date();
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        return [
            {
                challengeId: `daily_${today.toISOString().split('T')[0]}_sessions`,
                name: 'Daily Grind',
                description: 'Complete 3 focus sessions today',
                type: 'daily',
                requirement: 3,
                progress: 0,
                completed: false,
                expiresAt: endOfDay,
                xpReward: 100
            },
            {
                challengeId: `daily_${today.toISOString().split('T')[0]}_time`,
                name: 'Time Master',
                description: 'Accumulate 2 hours of focus time today',
                type: 'daily',
                requirement: 120,
                progress: 0,
                completed: false,
                expiresAt: endOfDay,
                xpReward: 150
            }
        ];
    }

    static async generateChallenges() {
        const now = new Date();
        // Daily
        const dailyChallenges = pickRandomChallenges(DAILY_CHALLENGE_POOL, 2).map(template => ({
            ...template,
            challengeId: `daily_${now.toISOString().split('T')[0]}_${template.name.replace(/\s+/g, '_')}`,
            progress: 0,
            completed: false,
            expiresAt: (() => { const d = new Date(now); d.setHours(23,59,59,999); return d; })()
        }));
        // Weekly
        const weeklyChallenges = pickRandomChallenges(WEEKLY_CHALLENGE_POOL, 2).map(template => ({
            ...template,
            challengeId: `weekly_${now.getFullYear()}W${getWeekNumber(now)}_${template.name.replace(/\s+/g, '_')}`,
            progress: 0,
            completed: false,
            expiresAt: (() => {
            const d = new Date(now);
            // End of week (Sunday)
            d.setDate(d.getDate() + (7 - d.getDay()));
            d.setHours(23,59,59,999);
            return d;
            })()
        }));
        // Monthly
        const monthlyChallenges = pickRandomChallenges(MONTHLY_CHALLENGE_POOL, 1).map(template => ({
            ...template,
            challengeId: `monthly_${now.getFullYear()}_${now.getMonth()+1}_${template.name.replace(/\s+/g, '_')}`,
            progress: 0,
            completed: false,
            expiresAt: (() => { 
            const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            d.setHours(23,59,59,999);
            return d;
            })()
        }));
        return [...dailyChallenges, ...weeklyChallenges, ...monthlyChallenges];
        }

    // Calculate focus score from activities
    static async calculateSessionFocusScore(sessionId: string): Promise<number> {
        const activities = await Activity.find({ sessionId });
        
        if (activities.length === 0) return 0;
        
        const avgFocusScore = activities.reduce((sum, activity) => {
            return sum + (activity.focusScore || 0);
        }, 0) / activities.length;
        
        return Math.round(avgFocusScore);
    }

    // Calculate and add XP from a session
    static async calculateAndAddXP(userId: string, sessionId: string) {
        const session = await Session.findById(sessionId);
        if (!session || session.userId.toString() !== userId) {
            throw new Error('Session not found or unauthorized');
        }

        const gamification = await this.getUserGamification(userId);

        // Calculate focus score from activities
        const focusScore = await this.calculateSessionFocusScore(sessionId);

        // Get session metrics with safe defaults
        const sessionDuration = session.duration || 0;
        const focusMinutes = Math.floor(sessionDuration / 60);
        
        // Count distractions from activities
        const activities = await Activity.find({ sessionId });
        const distractionsCount = activities.reduce((sum, activity) => {
            return sum + (activity.distractionDetected?.length || 0);
        }, 0);

        // Calculate XP based on session metrics
        let xpEarned = 0;

        // Base XP: 10 XP per minute of focus time
        xpEarned += focusMinutes * 10;

        // Bonus XP for high focus score
        if (focusScore >= 90) xpEarned += 100;
        else if (focusScore >= 80) xpEarned += 50;
        else if (focusScore >= 70) xpEarned += 25;

        // Bonus XP for no distractions
        if (distractionsCount === 0) xpEarned += 50;

        // Bonus XP for breaks taken (if session has breaks array)
        const breaksCount = (session as any).breaks?.length || 0;
        if (breaksCount > 0) xpEarned += breaksCount * 10;

        // Add XP
        gamification.xp += xpEarned;
        gamification.totalXpEarned += xpEarned;
        gamification.leaderboard.totalXp += xpEarned;
        gamification.leaderboard.weeklyXp += xpEarned;
        gamification.leaderboard.monthlyXp += xpEarned;

        // Update statistics
        gamification.statistics.totalSessions += 1;
        gamification.statistics.totalFocusTime += focusMinutes;
        gamification.statistics.totalBreaksTaken += breaksCount;
        gamification.statistics.sessionsThisWeek += 1;
        gamification.statistics.sessionsThisMonth += 1;

        // Update average focus score
        const totalSessions = gamification.statistics.totalSessions;
        const currentAvg = gamification.statistics.averageFocusScore;
        gamification.statistics.averageFocusScore = 
            (currentAvg * (totalSessions - 1) + focusScore) / totalSessions;

        // Update best focus score
        if (focusScore > gamification.statistics.bestFocusScore) {
            gamification.statistics.bestFocusScore = focusScore;
        }

        // Check for perfect day (>90% focus)
        if (focusScore >= 90) {
            gamification.statistics.perfectDays += 1;
        }

        // Update streak
        await this.updateStreak(gamification);

        // Check for level up
        const leveledUp = await this.checkLevelUp(gamification);

        // Check achievements and badges
        const newAchievements = await this.checkAchievements(gamification, {
            focusScore,
            duration: sessionDuration,
            distractionsCount
        });
        const newBadges = await this.checkBadges(gamification);

        // Update challenges
        await this.updateChallenges(gamification, {
            focusScore,
            duration: sessionDuration
        });

        await gamification.save();

        return {
            xpEarned,
            totalXp: gamification.xp,
            level: gamification.level,
            leveledUp,
            newAchievements,
            newBadges,
            currentStreak: gamification.streaks.currentStreak,
            focusScore
        };
    }

    // Update user streak
    static async updateStreak(gamification: any) {
        const now = new Date();
        const lastActivity = gamification.streaks.lastActivityDate;

        if (!lastActivity) {
            gamification.streaks.currentStreak = 1;
            gamification.streaks.longestStreak = 1;
        } else {
            const daysDiff = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff === 0) {
                // Same day, no change
            } else if (daysDiff === 1) {
                // Consecutive day
                gamification.streaks.currentStreak += 1;
                if (gamification.streaks.currentStreak > gamification.streaks.longestStreak) {
                    gamification.streaks.longestStreak = gamification.streaks.currentStreak;
                }
            } else {
                // Streak broken
                gamification.streaks.currentStreak = 1;
            }
        }

        gamification.streaks.lastActivityDate = now;
    }

    // Check for level up
    static async checkLevelUp(gamification: any): Promise<boolean> {
        if (gamification.xp >= gamification.xpToNextLevel) {
            gamification.level += 1;
            gamification.xp -= gamification.xpToNextLevel;
            gamification.xpToNextLevel = this.calculateXpForLevel(gamification.level);
            gamification.title = this.calculatePlayerTitle(gamification.level);

            // Check for milestone rewards
            if ([5, 10, 20, 30, 50, 75, 100].includes(gamification.level)) {
                gamification.milestones.push({
                    level: gamification.level,
                    reachedAt: new Date(),
                    rewards: {
                        badgesUnlocked: [],
                        featuresUnlocked: [`level_${gamification.level}_theme`],
                        title: this.calculatePlayerTitle(gamification.level)
                    }
                });
            }

            return true;
        }
        return false;
    }

    // Check and update achievements
    static async checkAchievements(gamification: any, sessionData: any): Promise<string[]> {
        const newAchievements: string[] = [];

        for (const achievement of gamification.achievements) {
            if (achievement.completed) continue;

            let progress = achievement.progress;

            // Update progress based on category
            switch (achievement.category) {
                case 'time':
                    progress = gamification.statistics.totalFocusTime;
                    break;
                case 'productivity':
                    progress = gamification.statistics.totalSessions;
                    break;
                case 'focus':
                    if (sessionData.focusScore >= achievement.requirement) {
                        progress = achievement.requirement;
                    }
                    break;
                case 'streak':
                    progress = gamification.streaks.currentStreak;
                    break;
            }

            achievement.progress = progress;

            // Check if completed
            if (progress >= achievement.requirement && !achievement.completed) {
                achievement.completed = true;
                achievement.completedAt = new Date();
                gamification.xp += achievement.xpReward;
                gamification.totalXpEarned += achievement.xpReward;
                newAchievements.push(achievement.title);
            }
        }

        return newAchievements;
    }

    // Check and award badges
    static async checkBadges(gamification: any): Promise<string[]> {
        const newBadges: string[] = [];
        const existingBadgeIds = gamification.badges.map((b: any) => b.badgeId);

        // Check each badge definition
        for (const [key, badge] of Object.entries(BADGE_DEFINITIONS)) {
            if (existingBadgeIds.includes(badge.badgeId)) continue;

            let shouldAward = false;

            // Check badge conditions
            switch (badge.badgeId) {
                case 'first_session':
                    shouldAward = gamification.statistics.totalSessions >= 1;
                    break;
                case 'week_warrior':
                    shouldAward = gamification.streaks.currentStreak >= 7;
                    break;
                case 'marathon_runner':
                    shouldAward = gamification.statistics.totalFocusTime >= 3000; // 50 hours
                    break;
                case 'centurion':
                    shouldAward = gamification.statistics.totalSessions >= 100;
                    break;
                case 'month_master':
                    shouldAward = gamification.streaks.currentStreak >= 30;
                    break;
                case 'legendary':
                    shouldAward = gamification.level >= 50;
                    break;
                case 'perfect_week':
                    shouldAward = gamification.statistics.perfectDays >= 7;
                    break;
            }

            if (shouldAward) {
                gamification.badges.push({
                    ...badge,
                    unlockedAt: new Date()
                });
                gamification.xp += badge.xpReward;
                gamification.totalXpEarned += badge.xpReward;
                newBadges.push(badge.name);
            }
        }

        return newBadges;
    }

    // Update challenges
    static async updateChallenges(gamification: any, sessionData: any) {
    const now = new Date();
    // Remove expired challenges
    gamification.challenges = gamification.challenges.filter((c: any) =>
      c.expiresAt > now
    );
    for (const challenge of gamification.challenges) {
      if (challenge.completed) continue;
      // Daily logic (sessions, time)
      if (challenge.type === "daily") {
        if (challenge.challengeId.includes("sessions")) challenge.progress += 1;
        if (challenge.challengeId.includes("time")) challenge.progress += Math.floor(sessionData.duration / 60);
        if (challenge.customCheck === "avgFocusAbove75" && (sessionData.dailyAverageFocus || 0) > 75) challenge.progress = challenge.requirement;
        if (challenge.customCheck === "startBefore8am" && sessionData.startedBefore8am) challenge.progress = challenge.requirement;
        if (challenge.customCheck === "noDistractions" && sessionData.distractionsCount === 0) challenge.progress = challenge.requirement;
        if (challenge.progress >= challenge.requirement) {
          challenge.completed = true;
          gamification.xp += challenge.xpReward;
          gamification.totalXpEarned += challenge.xpReward;
        }
      }
      // Weekly logic (sessions, hours, days worked, high focus streaks)
      if (challenge.type === "weekly") {
        if (challenge.challengeId.includes("sessions")) challenge.progress += 1;
        if (challenge.challengeId.includes("Hour_Hero")) challenge.progress += Math.floor(sessionData.duration / 60);
        if (challenge.customCheck === "noDaysMissed" && sessionData.workedEveryDayThisWeek) challenge.progress = challenge.requirement;
        if (challenge.customCheck === "fiveHighFocusSessions" && sessionData.weeklyHighFocusSessions >= 5) challenge.progress = challenge.requirement;
        if (challenge.progress >= challenge.requirement) {
          challenge.completed = true;
          gamification.xp += challenge.xpReward;
          gamification.totalXpEarned += challenge.xpReward;
        }
      }
      // Monthly logic
      if (challenge.type === "monthly") {
        if (challenge.challengeId.includes("sessions")) challenge.progress += 1;
        if (challenge.customCheck === "tenDayStreak" && sessionData.longestStreakThisMonth >= 10) challenge.progress = challenge.requirement;
        if (challenge.customCheck === "avgFocusAbove90" && (sessionData.monthlyAverageFocus || 0) >= 90) challenge.progress = challenge.requirement;
        if (challenge.customCheck === "fourMondays" && sessionData.mondaysWithSession >= 4) challenge.progress = challenge.requirement;
        if (challenge.progress >= challenge.requirement) {
          challenge.completed = true;
          gamification.xp += challenge.xpReward;
          gamification.totalXpEarned += challenge.xpReward;
        }
      }
    }
    if (gamification.challenges.length === 0) {
      gamification.challenges = await this.generateChallenges();
    }
  }

    // Get user badges with unlock status
    static async getUserBadges(userId: string) {
        const gamification = await this.getUserGamification(userId);
        const unlockedBadgeIds = gamification.badges.map((b: any) => b.badgeId);

        return Object.values(BADGE_DEFINITIONS).map(badge => ({
            ...badge,
            unlocked: unlockedBadgeIds.includes(badge.badgeId),
            progress: this.calculateBadgeProgress(badge.badgeId, gamification),
            requirement: this.getBadgeRequirement(badge.badgeId)
        }));
    }

    // Calculate badge progress
    static calculateBadgeProgress(badgeId: string, gamification: any): number {
        switch (badgeId) {
            case 'first_session':
                return Math.min(gamification.statistics.totalSessions, 1);
            case 'week_warrior':
                return gamification.streaks.currentStreak;
            case 'marathon_runner':
                return Math.floor(gamification.statistics.totalFocusTime / 60);
            case 'centurion':
                return gamification.statistics.totalSessions;
            case 'month_master':
                return gamification.streaks.currentStreak;
            case 'legendary':
                return gamification.level;
            case 'perfect_week':
                return gamification.statistics.perfectDays;
            default:
                return 0;
        }
    }

    // Get badge requirement
    static getBadgeRequirement(badgeId: string): number {
        switch (badgeId) {
            case 'first_session': return 1;
            case 'early_bird': return 5;
            case 'week_warrior': return 7;
            case 'focus_master': return 10;
            case 'marathon_runner': return 50;
            case 'centurion': return 100;
            case 'month_master': return 30;
            case 'legendary': return 50;
            case 'perfect_week': return 7;
            default: return 0;
        }
    }

    // Get leaderboard
    static async getLeaderboard(type: 'total' | 'weekly' | 'monthly' = 'total', limit: number = 100) {
        const sortField = type === 'weekly' ? 'leaderboard.weeklyXp' : 
                         type === 'monthly' ? 'leaderboard.monthlyXp' : 
                         'leaderboard.totalXp';

        return await Gamification.find()
            .sort({ [sortField]: -1 })
            .limit(limit)
            .populate('userId', 'name email')
            .select('userId level totalXpEarned title leaderboard');
    }
}
