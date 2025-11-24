import mongoose from "mongoose";

interface IRecommendation {
    userId: mongoose.Types.ObjectId;
    sessionId: mongoose.Types.ObjectId;
    timestamp: Date;
    prompt: string;
    recommendation: string;
    type: 'break' | 'work' | 'study';
    priority: 'low' | 'medium'| 'high';
    context: {
        focusScore: number;
        sessionDuration?: number;
        recentActivity?: string;
        distractions: string[];
    };
    feedback? :{
        followed?: boolean;
        userComment?: string;
        timestamp?:Date;
    }
}

const recommendationSchema: mongoose.Schema<IRecommendation> = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Session",
        required: true
    },
    timestamp:{
        type: Date,
        default: Date.now,
    },
    prompt: {
        type: String
    },
    recommendation: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['break', 'work', 'study'],
        default: 'work'
    },
    priority: {
        type: String, 
        enum: ['low', 'medium', 'high']
    },
    context: {
        focusScore: Number,
        sessionDuration: Number,
        recentActivity: String,
        distractions: {type: [String], default: []}
    },
    feedback: {
        followed: Boolean,
        userComment: String,
        timestamp: Date,
    },
});

export const Recommendation = mongoose.model('Recommendation', recommendationSchema);