import mongoose from "mongoose";

interface IBadge{
    name: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    description: string;
    icon?: string;
    unlocked: Date;
}

interface IAchievement {
    title: string;
    description: string;
    progress: number;
    target: number;
    completed: boolean;
    completedAt?: Date;
}

interface IGamification{
    userId: mongoose.Types.ObjectId;
    level: number;
    xp: number;
    xpToNextLevel: number;
    streaks: {
        currentStreak: number;
        longestStreak: number;
        lastActivityDate?: Date;
    };
    badges: IBadge[];
    achievements: IAchievement[];
    statistics: {
        totalSessions: number;
        totalFocusTime: number;
        totalBreaksTaken: number;
        recommendationsFollowed: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

const gamificationSchema: mongoose.Schema<IGamification> = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    level:{
        type: Number,
        default: 1
    },
    xp:{
        type: Number,
        default: 0
    },
    xpToNextLevel: {
        type: Number,
        default: 100,
    },
    streaks: {
        currentStreak: {type: Number, default: 0},
        longestStreak: {type: Number, default: 0},
        lastActivityDate: Date,
    },
    badges: [
        {
            name: String,
            description: String,
            icon: String,
            unlockedAt: Date,
        }
    ],
    achievements: [
        {
            title: String,
            description: String,
            progress: {type: Number, default: 0},
            completed:{type: Number, default: 0},
            completedAt: Date,
        },
    ],
    statistics: {
        totalSessions: {type: Number, default: 0},
        totalFocusTime: {type: Number, default:0},
        recommendationsFollowed: {type: Number, default:0}, 
    }
}, {timestamps: true})

export const Gamification = mongoose.model('Gamification', gamificationSchema)