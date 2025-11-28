import mongoose from "mongoose";
import { Gamification, IBadge, IAchievement, IChallenge } from "../models/gamification.model";
import { Session } from "../models/session.model";
import { Activity } from "../models/activity.model";
import {BADGE_DEFINITIONS, ACHIEVEMENT_DEFINITIONS, DAILY_CHALLENGE_POOL, WEEKLY_CHALLENGE_POOL, MONTHLY_CHALLENGE_POOL} from "./badge.defination";


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

    // Get or create gamification profile - ✅ FIX: Use upsert instead of create
    static async getUserGamification(userId: string) {
        try {
            console.log(`[Gamification] 🔍 Fetching gamification for user: ${userId}`);

            // ✅ FIX: Use findOneAndUpdate with upsert to prevent E11000 errors
            const gamification = await Gamification.findOneAndUpdate(
                { userId },
                {
                    $setOnInsert: {
                        userId,
                        level: 1,
                        xp: 0,
                        xpToNextLevel: this.calculateXpForLevel(1),
                        totalXpEarned: 0,
                        title: 'Focus Novice',
                        badges: [],
                        achievements: this.initializeAchievements(),
                        challenges: [],
                        statistics: {
                            totalSessions: 0,
                            totalFocusTime: 0,
                            totalBreaksTaken: 0,
                            sessionsThisWeek: 0,
                            sessionsThisMonth: 0,
                            averageFocusScore: 0,
                            bestFocusScore: 0,
                            perfectDays: 0
                        },
                        streaks: {
                            currentStreak: 0,
                            longestStreak: 0,
                            lastActivityDate: null
                        },
                        leaderboard: {
                            totalXp: 0,
                            weeklyXp: 0,
                            monthlyXp: 0,
                            rank: 0
                        },
                        milestones: [],
                        createdAt: new Date()
                    }
                },
                { 
                    upsert: true,        // ✅ Create if doesn't exist
                    new: true,           // ✅ Return updated document
                    lean: false          // ✅ Return full document
                }
            );

            console.log(`[Gamification] ✅ User gamification retrieved/initialized`);
            return gamification;
        } catch (err: any) {
            console.error('[Gamification] ❌ Error in getUserGamification:', err);
            throw err;
        }
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
        try {
            const session = await Session.findById(sessionId);
            if (!session || session.userId.toString() !== userId) {
                throw new Error('Session not found or unauthorized');
            }

            // ✅ FIX: Use getUserGamification instead of direct findOne
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

            console.log(`[Gamification] ✅ XP calculated and added: ${xpEarned}`);

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
        } catch (err: any) {
            console.error('[Gamification] ❌ Error calculating XP:', err);
            throw err;
        }
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
        // Convert existing badges to a Set for fast lookup
        const existingBadgeIds = new Set(gamification.badges.map((b: any) => b.badgeId));

        // Iterate through all badge definitions (using the type assertion to match the definition structure)
        for (const badge of Object.values(BADGE_DEFINITIONS) as any[]) {
            if (existingBadgeIds.has(badge.badgeId)) continue;

            let shouldAward = false;
            const req = badge.unlockRequirement;
            
            // 1. Get the current user value for the required type
            let currentValue = 0;
            
            switch (req.type) {
                case 'totalSessions':
                    currentValue = gamification.statistics.totalSessions;
                    break;
                case 'totalFocusTime':
                    currentValue = gamification.statistics.totalFocusTime; // in minutes
                    break;
                case 'bestFocusScore':
                    currentValue = gamification.statistics.bestFocusScore;
                    break;
                case 'longestStreak':
                    currentValue = gamification.streaks.longestStreak;
                    break;
                case 'perfectDays':
                    currentValue = gamification.statistics.perfectDays;
                    break;
                case 'level':
                    currentValue = gamification.level;
                    break;
                default:
                    // Handle unknown types if necessary
                    continue; 
            }

            // 2. Check if the current value meets or exceeds the required value
            if (currentValue >= req.value) {
                shouldAward = true;
            }

            // 3. Award the badge and update XP if requirements are met
            if (shouldAward) {
                // Push the new badge to the gamification document's badges array
                gamification.badges.push({
                    badgeId: badge.badgeId,
                    name: badge.name,
                    unlockedAt: new Date(),
                    xpReward: badge.xpReward
                });
                
                // Add XP reward
                gamification.xp += badge.xpReward;
                gamification.totalXpEarned += badge.xpReward;
                
                // Log the newly unlocked badge name
                newBadges.push(badge.name);
            }
        }

        // The document is saved later in calculateAndAddXP, so we just return the new badges.
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
        try {
            // ✅ FIX: Use getUserGamification to ensure user exists
            const gamification = await this.getUserGamification(userId);
            const unlockedBadgeIds = gamification.badges.map((b: any) => b.badgeId);

            return Object.values(BADGE_DEFINITIONS).map(badge => ({
                ...badge,
                unlocked: unlockedBadgeIds.includes(badge.badgeId),
                progress: this.calculateBadgeProgress(badge.badgeId, gamification),
                requirement: this.getBadgeRequirement(badge.badgeId)
            }));
        } catch (err: any) {
            console.error('[Gamification] ❌ Error getting badges:', err);
            throw err;
        }
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
        try {
            const sortField = type === 'weekly' ? 'leaderboard.weeklyXp' : 
                             type === 'monthly' ? 'leaderboard.monthlyXp' : 
                             'leaderboard.totalXp';

            return await Gamification.find()
                .sort({ [sortField]: -1 })
                .limit(limit)
                .populate('userId', 'name email')
                .select('userId level totalXpEarned title leaderboard');
        } catch (err: any) {
            console.error('[Gamification] ❌ Error getting leaderboard:', err);
            throw err;
        }
    }
}