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
    
    // ✅ FIXED: Progressive XP calculation with better scaling
    static calculateXpForLevel(level: number): number {
        // Base: 100 XP, scales with level^1.5
        // Level 1: 100, Level 2: 283, Level 3: 519, Level 5: 1118, Level 10: 3162
        return Math.floor(100 * Math.pow(level, 1.5));
    }

    // ✅ NEW: Calculate player title based on level
    static calculatePlayerTitle(level: number): string {
        if (level <= 5) return 'Focus Novice';
        if (level <= 10) return 'Concentration Apprentice';
        if (level <= 20) return 'Productivity Warrior';
        if (level <= 30) return 'Focus Master';
        if (level <= 50) return 'Zen Grandmaster';
        return 'Legendary Producer';
    }

    // ✅ FIXED: Get or create gamification profile
    static async getUserGamification(userId: string) {
        try {
            console.log(`[Gamification] 🔍 Fetching gamification for user: ${userId}`);

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
                    upsert: true,
                    new: true,
                    lean: false
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

    // ✅ FIXED: Calculate and add XP from a session with proper focus score scaling
    static async calculateAndAddXP(userId: string, sessionId: string) {
        try {
            const session = await Session.findById(sessionId);
            if (!session || session.userId.toString() !== userId) {
                throw new Error('Session not found or unauthorized');
            }

            const gamification = await this.getUserGamification(userId);

            // Calculate focus score from activities (0-100)
            const focusScore = await this.calculateSessionFocusScore(sessionId);
            console.log(`[Gamification] 📊 Session Focus Score: ${focusScore}%`);

            // Get session metrics with safe defaults
            const sessionDuration = session.duration || 0;
            const focusMinutes = Math.floor(sessionDuration / 60);
            
            // Count distractions from activities
            const activities = await Activity.find({ sessionId });
            const distractionsCount = activities.reduce((sum, activity) => {
                return sum + (activity.distractionDetected?.length || 0);
            }, 0);

            // ✅ FIXED: Calculate XP with focus score as PRIMARY factor
            let xpEarned = 0;

            // ✅ BASE XP: 10 XP per minute, scaled by focus score performance
            // If focus score is 0%, earn 10 XP/min (minimum)
            // If focus score is 100%, earn 20 XP/min (maximum)
            const focusMultiplier = 1 + (focusScore / 100); // Range: 1.0 to 2.0
            const baseXp = focusMinutes * 10 * focusMultiplier;
            xpEarned += Math.round(baseXp);
            console.log(`[Gamification] 📈 Base XP: ${Math.round(baseXp)} (${focusMinutes}min × 10 × ${focusMultiplier.toFixed(2)} multiplier)`);

            // ✅ FOCUS SCORE BONUS XP (Major bonus)
            let focusBonus = 0;
            if (focusScore >= 95) {
                focusBonus = 200; // Perfect focus
                console.log(`[Gamification] ⭐ Perfect Focus Bonus: +200 XP`);
            } else if (focusScore >= 90) {
                focusBonus = 150; // Excellent
                console.log(`[Gamification] ⭐ Excellent Focus Bonus: +150 XP`);
            } else if (focusScore >= 80) {
                focusBonus = 100; // Very good
                console.log(`[Gamification] ⭐ Very Good Focus Bonus: +100 XP`);
            } else if (focusScore >= 70) {
                focusBonus = 50; // Good
                console.log(`[Gamification] ⭐ Good Focus Bonus: +50 XP`);
            } else if (focusScore >= 60) {
                focusBonus = 25; // Okay
                console.log(`[Gamification] ⭐ Okay Focus Bonus: +25 XP`);
            }
            xpEarned += focusBonus;

            // ✅ NO DISTRACTIONS BONUS
            if (distractionsCount === 0) {
                xpEarned += 75;
                console.log(`[Gamification] 🎯 No Distractions Bonus: +75 XP`);
            }

            // ✅ BREAKS BONUS (promotes healthy work habits)
            const breaksCount = (session as any).breaks?.length || 0;
            if (breaksCount > 0) {
                const breakBonus = breaksCount * 15;
                xpEarned += breakBonus;
                console.log(`[Gamification] ☕ Breaks Bonus: +${breakBonus} XP (${breaksCount} breaks)`);
            }

            // ✅ CONSISTENCY BONUS: Extra XP if session is long enough (30+ min)
            if (focusMinutes >= 30) {
                const consistencyBonus = Math.floor(focusMinutes / 10) * 10;
                xpEarned += consistencyBonus;
                console.log(`[Gamification] 💪 Consistency Bonus: +${consistencyBonus} XP`);
            }

            console.log(`[Gamification] ✅ Total XP Earned: ${xpEarned}`);

            // Add XP to gamification
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

            // ✅ FIXED: Update average focus score correctly
            const totalSessions = gamification.statistics.totalSessions;
            const currentAvg = gamification.statistics.averageFocusScore;
            gamification.statistics.averageFocusScore = 
                Math.round((currentAvg * (totalSessions - 1) + focusScore) / totalSessions);

            // Update best focus score
            if (focusScore > gamification.statistics.bestFocusScore) {
                gamification.statistics.bestFocusScore = focusScore;
                console.log(`[Gamification] 🏆 New Best Focus Score: ${focusScore}%`);
            }

            // Check for perfect day (≥90% focus)
            if (focusScore >= 90) {
                gamification.statistics.perfectDays += 1;
                console.log(`[Gamification] 🌟 Perfect Day Achieved!`);
            }

            // Update streak
            await this.updateStreak(gamification);

            // ✅ FIXED: Check for level up and handle XP overflow properly
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
                duration: sessionDuration,
                distractionsCount
            });

            await gamification.save();

            console.log(`[Gamification] ✅ Session complete - Level: ${gamification.level}, XP: ${gamification.xp}/${gamification.xpToNextLevel}`);

            return {
                xpEarned,
                totalXp: gamification.totalXpEarned,
                currentLevelXp: gamification.xp,
                xpToNextLevel: gamification.xpToNextLevel,
                level: gamification.level,
                leveledUp,
                newAchievements,
                newBadges,
                currentStreak: gamification.streaks.currentStreak,
                focusScore,
                title: gamification.title
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
            console.log(`[Gamification] 🔥 New Streak Started: 1`);
        } else {
            const daysDiff = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff === 0) {
                // Same day, no change
                console.log(`[Gamification] Same day activity, streak maintained: ${gamification.streaks.currentStreak}`);
            } else if (daysDiff === 1) {
                // Consecutive day
                gamification.streaks.currentStreak += 1;
                if (gamification.streaks.currentStreak > gamification.streaks.longestStreak) {
                    gamification.streaks.longestStreak = gamification.streaks.currentStreak;
                }
                console.log(`[Gamification] 🔥 Streak Increased: ${gamification.streaks.currentStreak}`);
            } else {
                // Streak broken
                gamification.streaks.currentStreak = 1;
                console.log(`[Gamification] ⚠️ Streak Broken after ${daysDiff} days, restarting...`);
            }
        }

        gamification.streaks.lastActivityDate = now;
    }

    // ✅ FIXED: Check for level up with proper XP handling
    static async checkLevelUp(gamification: any): Promise<boolean> {
        let leveledUp = false;
        
        // Keep checking for level ups (in case XP is enough for multiple levels)
        while (gamification.xp >= gamification.xpToNextLevel) {
            gamification.level += 1;
            gamification.xp -= gamification.xpToNextLevel;
            gamification.xpToNextLevel = this.calculateXpForLevel(gamification.level);
            gamification.title = this.calculatePlayerTitle(gamification.level);
            leveledUp = true;

            console.log(`[Gamification] ⬆️ LEVEL UP! New Level: ${gamification.level}, Remaining XP: ${gamification.xp}, Next Level Requires: ${gamification.xpToNextLevel}`);

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
                console.log(`[Gamification] 🎉 Milestone Reached: Level ${gamification.level}!`);
            }
        }
        
        return leveledUp;
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
                console.log(`[Gamification] 🏅 Achievement Unlocked: ${achievement.title} (+${achievement.xpReward} XP)`);
            }
        }

        return newAchievements;
    }

    // Check and award badges
    static async checkBadges(gamification: any): Promise<string[]> {
        const newBadges: string[] = [];
        const existingBadgeIds = new Set(gamification.badges.map((b: any) => b.badgeId));

        for (const badge of Object.values(BADGE_DEFINITIONS) as any[]) {
            if (existingBadgeIds.has(badge.badgeId)) continue;

            let shouldAward = false;
            const req = badge.unlockRequirement;
            
            let currentValue = 0;
            
            switch (req.type) {
                case 'totalSessions':
                    currentValue = gamification.statistics.totalSessions;
                    break;
                case 'totalFocusTime':
                    currentValue = gamification.statistics.totalFocusTime;
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
                    continue; 
            }

            if (currentValue >= req.value) {
                shouldAward = true;
            }

            if (shouldAward) {
                gamification.badges.push({
                    badgeId: badge.badgeId,
                    name: badge.name,
                    unlockedAt: new Date(),
                    xpReward: badge.xpReward
                });
                
                gamification.xp += badge.xpReward;
                gamification.totalXpEarned += badge.xpReward;
                
                newBadges.push(badge.name);
                console.log(`[Gamification] 🎖️ Badge Unlocked: ${badge.name} (+${badge.xpReward} XP)`);
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
            if (challenge.customCheck === "avgFocusAbove75" && (sessionData.focusScore || 0) > 75) challenge.progress = challenge.requirement;
            if (challenge.customCheck === "startBefore8am" && sessionData.startedBefore8am) challenge.progress = challenge.requirement;
            if (challenge.customCheck === "noDistractions" && sessionData.distractionsCount === 0) challenge.progress = challenge.requirement;
            if (challenge.progress >= challenge.requirement) {
              challenge.completed = true;
              gamification.xp += challenge.xpReward;
              gamification.totalXpEarned += challenge.xpReward;
              console.log(`[Gamification] ✅ Challenge Completed: ${challenge.name} (+${challenge.xpReward} XP)`);
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
              console.log(`[Gamification] ✅ Challenge Completed: ${challenge.name} (+${challenge.xpReward} XP)`);
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
              console.log(`[Gamification] ✅ Challenge Completed: ${challenge.name} (+${challenge.xpReward} XP)`);
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