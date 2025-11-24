import { Request, Response } from "express";
import { Gamification } from "../models/gamification.model";
import { GamificationService } from "../services/gamification.service";

// Get user gamification stats
export const getGamificationStats = async(req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const stats = await GamificationService.getUserGamification(userId);
        
        return res.json({
            stats: {
                level: stats.level,
                xp: stats.xp,
                xpToNextLevel: stats.xpToNextLevel,
                totalXpEarned: stats.totalXpEarned,
                title: stats.title,
                currentStreak: stats.streaks.currentStreak,
                longestStreak: stats.streaks.longestStreak,
                totalSessions: stats.statistics.totalSessions,
                totalFocusTime: stats.statistics.totalFocusTime,
                averageFocusScore: stats.statistics.averageFocusScore,
                bestFocusScore: stats.statistics.bestFocusScore,
                perfectDays: stats.statistics.perfectDays,
                rank: stats.leaderboard.rank,
                weeklyXp: stats.leaderboard.weeklyXp,
                monthlyXp: stats.leaderboard.monthlyXp
            }
        });
    } catch(err) {
        console.error("Error getting gamification stats:", err);
        return res.status(500).json({
            msg: "server error"
        });
    }
};

// Update gamification after session (calculate XP)
export const updateGamification = async(req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                msg: "missing sessionId in request body"
            });
        }

        const xpResult = await GamificationService.calculateAndAddXP(userId, sessionId);
        
        return res.json({
            success: true,
            xpEarned: xpResult.xpEarned,
            totalXp: xpResult.totalXp,
            level: xpResult.level,
            leveledUp: xpResult.leveledUp,
            newAchievements: xpResult.newAchievements,
            newBadges: xpResult.newBadges,
            currentStreak: xpResult.currentStreak,
            focusScore: xpResult.focusScore
        });
    } catch (err: any) {
        console.error("Error updating gamification:", err);
        return res.status(500).json({
            msg: err.message || "server error"
        });
    }
};

// Get all badges (unlocked and locked)
export const getBadges = async(req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const badges = await GamificationService.getUserBadges(userId);
        
        return res.json(badges);
    } catch(err) {
        console.error("Error getting badges:", err);
        return res.status(500).json({
            msg: "server error"
        });
    }
};

// Get user achievements
export const getAchievements = async(req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const gamification = await GamificationService.getUserGamification(userId);
        
        return res.json({
            achievements: gamification.achievements
        });
    } catch(err) {
        console.error("Error getting achievements:", err);
        return res.status(500).json({
            msg: "server error"
        });
    }
};

// Get active challenges 
export const getChallenges = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const gamification = await GamificationService.getUserGamification(userId);

    const now = new Date();

    // Remove expired if found
    gamification.challenges = gamification.challenges.filter((c: any) => new Date(c.expiresAt) > now);

    // If NO challenges left after removing expired, generate and assign new ones
    if (gamification.challenges.length === 0) {
      gamification.challenges = await GamificationService.generateChallenges();
      await gamification.save(); // Persist
    }

    return res.json({
      challenges: gamification.challenges
    });
  } catch (err) {
    console.error("Error getting challenges:", err);
    return res.status(500).json({
      msg: "server error"
    });
  }
};

// Get leaderboard
export const getLeaderboard = async(req: Request, res: Response) => {
    try {
        const { type = 'total', limit = 100 } = req.query;
        const leaderboard = await GamificationService.getLeaderboard(
            type as 'total' | 'weekly' | 'monthly',
            Number(limit)
        );
        
        return res.json({
            leaderboard
        });
    } catch(err) {
        console.error("Error getting leaderboard:", err);
        return res.status(500).json({
            msg: "server error"
        });
    }
};

// Get user rank
export const getUserRank = async(req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { type = 'total' } = req.query;
        
        const sortField = type === 'weekly' ? 'leaderboard.weeklyXp' : 
                         type === 'monthly' ? 'leaderboard.monthlyXp' : 
                         'leaderboard.totalXp';
        
        const allUsers = await Gamification.find()
            .sort({ [sortField]: -1 })
            .select('userId');
        
        const userRank = allUsers.findIndex(
            (g: any) => g.userId.toString() === userId
        ) + 1;
        
        return res.json({
            rank: userRank,
            totalUsers: allUsers.length
        });
    } catch(err) {
        console.error("Error getting user rank:", err);
        return res.status(500).json({
            msg: "server error"
        });
    }
};

// Get milestones
export const getMilestones = async(req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const gamification = await GamificationService.getUserGamification(userId);
        
        return res.json({
            milestones: gamification.milestones
        });
    } catch(err) {
        console.error("Error getting milestones:", err);
        return res.status(500).json({
            msg: "server error"
        });
    }
};

// Update preferences (notification settings, public rank)
export const updateGamificationPreferences = async(req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { showRankPublicly, receiveAchievementNotifications } = req.body;
        
        const gamification = await Gamification.findOne({ userId });
        if (!gamification) {
            return res.status(404).json({
                msg: "gamification profile not found"
            });
        }
        
        if (showRankPublicly !== undefined) {
            gamification.preferences.showRankPublicly = showRankPublicly;
        }
        if (receiveAchievementNotifications !== undefined) {
            gamification.preferences.receiveAchievementNotifications = receiveAchievementNotifications;
        }
        
        await gamification.save();
        
        return res.json({
            msg: "preferences updated",
            preferences: gamification.preferences
        });
    } catch(err) {
        console.error("Error updating preferences:", err);
        return res.status(500).json({
            msg: "server error"
        });
    }
};
