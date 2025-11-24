import mongoose from "mongoose";

interface IBadge {
    badgeId: string;
    name: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
    category: 'focus' | 'streak' | 'productivity' | 'mastery' | 'special';
    description: string;
    icon: string;
    xpReward: number;
    unlockedAt: Date;
}

interface IAchievement {
    achievementId: string;
    title: string;
    description: string;
    category: 'focus' | 'streak' | 'productivity' | 'time' | 'social';
    progress: number;
    requirement: number;
    completed: boolean;
    completedAt?: Date;
    xpReward: number;
    icon: string;
}

interface IChallenge {
    challengeId: string;
    name: string;
    description: string;
    type: 'daily' | 'weekly' | 'monthly';
    requirement: number;
    progress: number;
    completed: boolean;
    expiresAt: Date;
    xpReward: number;
}

interface IMilestone {
    level: number;
    reachedAt: Date;
    rewards: {
        badgesUnlocked: string[];
        featuresUnlocked: string[];
        title?: string;
    };
}

interface ILeaderboardStats {
    rank?: number;
    totalXp: number;
    weeklyXp: number;
    monthlyXp: number;
}

interface IGamification {
    userId: mongoose.Types.ObjectId;
    level: number;
    xp: number;
    xpToNextLevel: number;
    totalXpEarned: number;
    title: string; // Player title (e.g., "Focus Novice", "Productivity Master")
    
    streaks: {
        currentStreak: number;
        longestStreak: number;
        lastActivityDate?: Date;
        streakFreezes: number; // Can use to prevent streak break
    };
    
    badges: IBadge[];
    achievements: IAchievement[];
    challenges: IChallenge[];
    milestones: IMilestone[];
    
    statistics: {
        totalSessions: number;
        totalFocusTime: number; // in minutes
        totalBreaksTaken: number;
        recommendationsFollowed: number;
        averageFocusScore: number;
        bestFocusScore: number;
        totalDistractionTime: number; // in minutes
        sessionsThisWeek: number;
        sessionsThisMonth: number;
        perfectDays: number; // Days with >90% focus
    };
    
    leaderboard: ILeaderboardStats;
    
    preferences: {
        showRankPublicly: boolean;
        receiveAchievementNotifications: boolean;
    };
    
    createdAt: Date;
    updatedAt: Date;
}

const badgeSchema = new mongoose.Schema({
    badgeId: { type: String, required: true },
    name: { type: String, required: true },
    tier: { 
        type: String, 
        enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
        required: true 
    },
    category: {
        type: String,
        enum: ['focus', 'streak', 'productivity', 'mastery', 'special'],
        required: true
    },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    xpReward: { type: Number, required: true },
    unlockedAt: { type: Date, required: true }
});

const achievementSchema = new mongoose.Schema({
    achievementId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
        type: String,
        enum: ['focus', 'streak', 'productivity', 'time', 'social'],
        required: true
    },
    progress: { type: Number, default: 0 },
    requirement: { type: Number, required: true },
    completed: { type: Boolean, default: false },
    completedAt: Date,
    xpReward: { type: Number, required: true },
    icon: { type: String, required: true }
});

const challengeSchema = new mongoose.Schema({
    challengeId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['daily', 'weekly', 'monthly'],
        required: true 
    },
    requirement: { type: Number, required: true },
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
    xpReward: { type: Number, required: true }
});

const milestoneSchema = new mongoose.Schema({
    level: { type: Number, required: true },
    reachedAt: { type: Date, required: true },
    rewards: {
        badgesUnlocked: [String],
        featuresUnlocked: [String],
        title: String
    }
});

const gamificationSchema = new mongoose.Schema<IGamification>({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    level: {
        type: Number,
        default: 1,
        min: 1
    },
    xp: {
        type: Number,
        default: 0,
        min: 0
    },
    xpToNextLevel: {
        type: Number,
        default: 100
    },
    totalXpEarned: {
        type: Number,
        default: 0
    },
    title: {
        type: String,
        default: 'Focus Novice'
    },
    streaks: {
        currentStreak: { type: Number, default: 0 },
        longestStreak: { type: Number, default: 0 },
        lastActivityDate: Date,
        streakFreezes: { type: Number, default: 1 } // Start with 1 free freeze
    },
    badges: [badgeSchema],
    achievements: [achievementSchema],
    challenges: [challengeSchema],
    milestones: [milestoneSchema],
    statistics: {
        totalSessions: { type: Number, default: 0 },
        totalFocusTime: { type: Number, default: 0 },
        totalBreaksTaken: { type: Number, default: 0 },
        recommendationsFollowed: { type: Number, default: 0 },
        averageFocusScore: { type: Number, default: 0 },
        bestFocusScore: { type: Number, default: 0 },
        totalDistractionTime: { type: Number, default: 0 },
        sessionsThisWeek: { type: Number, default: 0 },
        sessionsThisMonth: { type: Number, default: 0 },
        perfectDays: { type: Number, default: 0 }
    },
    leaderboard: {
        rank: Number,
        totalXp: { type: Number, default: 0 },
        weeklyXp: { type: Number, default: 0 },
        monthlyXp: { type: Number, default: 0 }
    },
    preferences: {
        showRankPublicly: { type: Boolean, default: true },
        receiveAchievementNotifications: { type: Boolean, default: true }
    }
}, { timestamps: true });

// Indexes for leaderboard queries
gamificationSchema.index({ 'leaderboard.totalXp': -1 });
gamificationSchema.index({ 'leaderboard.weeklyXp': -1 });
gamificationSchema.index({ level: -1 });

export const Gamification = mongoose.model<IGamification>('Gamification', gamificationSchema);
export type { IGamification, IBadge, IAchievement, IChallenge, IMilestone };
