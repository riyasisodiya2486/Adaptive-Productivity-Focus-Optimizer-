import mongoose from "mongoose";

interface IFocusTimelineEnter{
    timestamp: Date;
    focusScore: number;
    activityLevel: 'high' | 'medium' | 'low';
    distractionDetected: boolean;
};

interface IStats {
    averageFocusScore?: number;
    peakFocusScore?: number;
    lowestFocusScore?: number;
    totalKeystrokes?: number;
    totalMouseActivity?: number;
    totalIdleTime?: number;
    distractionsCount: number;
    productiveAppsUsed: string[];
    distractingAppsUsed: string[];
    totalFocusTime?: number;
    totalDistractionTime?: number;
    totalBreaksTaken?: number;
    recommendationsFollowed?: number;
}

interface ISession {
    userId: mongoose.Types.ObjectId;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    type: 'work' | 'study' | 'break';
    status: 'active' | 'paused' | 'ended';
    focusTimeline: IFocusTimelineEnter[];
    statistics: IStats;
    recommendations: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}   

const focusTimelineSchema: mongoose.Schema<IFocusTimelineEnter> = new mongoose.Schema({
    timestamp: {
        type: Date,
        required: true,
        default: Date.now 
    },
    focusScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100 
    },
    activityLevel: {
        type: String,
        enum: ['high', 'medium', 'low'],
        required:true 
    },
    distractionDetected: {
        type: Boolean, 
        default: false
    }
}, {_id: false});

const statisticsSchema = new mongoose.Schema({
    averageFocusScore: {
        type: Number,
        min: 0,
        max: 100
    },
    peakFocusScore: {
        type: Number,
        min: 0,
        max: 100
    },
    lowestFocusScore: {
        type: Number,
        min: 0,
        max: 100
    },
    totalKeystrokes: {
        type: Number,
        default: 0
    },
    totalMouseActivity: {
        type: Number,
        default: 0
    },
    totalIdleTime: {
        type: Number,
        default: 0
    },
    distractionsCount: {
        type: Number,
        default: 0
    },
    productiveAppsUsed: {
        type: [String],
        default: []
    },
    distractingAppsUsed: {
        type: [String],
        default: []
    },
    totalFocusTime: {
        type: Number,
        default: 0
    },
    totalDistractionTime: {
        type: Number,
        default: 0
    },
    totalBreaksTaken: {
        type: Number,
        default: 0 
    }
}, { _id: false });

const sessionSchema: mongoose.Schema<ISession> = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    startTime: {
        type: Date,
        required: true,
        default: Date.now
    },
    endTime:{
        type: Date
    },
    duration: {
        type: Number
    },
    type: {
        type: String,
        enum: ['work' , 'break' , 'study' ],
        default: 'work',
    },
    status: {
        type:String,
        enum: ['active', 'paused', 'ended'],
        default: 'active',
        index: true
    },
    focusTimeline:{
        type: [focusTimelineSchema],
        default: []
    },
    statistics: {
        type:statisticsSchema,
        default: () => ({
            totalKeystrokes: 0,
            totalMouseActivity: 0,
            totalIdleTime: 0,
            distractionsCount: 0,
            productiveAppsUsed: [],
            distractingAppsUsed: [],
            totalFocusTime: 0,
            totalDistractionTime: 0,
            totalBreaksTaken: 0,
            recommendationsFollowed: 0
        })
    },
    recommendations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recommendation'
    }]
}, {
    timestamps: true,
    collection: 'sessions' 
});

// Indexes for common queries
sessionSchema.index({ userId: 1, startTime: -1 });
sessionSchema.index({ userId: 1, status: 1 });
sessionSchema.index({ createdAt: -1 });

//Virtual for session duration in minutes
sessionSchema.virtual('durationMinutes').get(function(){
    return this.duration ? Math.round(this.duration/60) : 0;
})

export const Session = mongoose.model('Session', sessionSchema) 