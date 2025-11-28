import { timeStamp } from "console";
import mongoose from "mongoose";

interface IActivityData {
    keystrokes: number;
    mouseClicks:  number;
    mouseMoves: number;
    scrolls: number;
    idleTime: number;
};

interface IActiveApp {
    name?: string;
    title?: string;
    category: 'productive'| 'distraction' | 'neutral';
};

interface IBrowserActivity{
    url?: string;
    title?: string;
    domain?: string;
    category: 'productive'| 'distraction' | 'neutral';
};

interface IEyeTracking {
    enabled: boolean;
    gazeY?: number;
    gazeX?: number;
    blinkRate?: number;
    focusedOnScreen?: boolean
};

interface IActivity {
    userId: mongoose.Types.ObjectId;
    sessionId: mongoose.Types.ObjectId;
    timestamp: Date;
    activityData: IActivityData;
    activeApp: IActiveApp;
    browserActivity?: IBrowserActivity;
    eyeTracking?: IEyeTracking;
    focusScore?: number;
    distractionDetected: string[];
}

const activityDataSchema = new mongoose.Schema({
    keystrokes: {
        type: Number,
        default: 0,
        min: 0
    },
    mouseClicks: {
        type: Number,
        default: 0,
        min: 0
    },
    mouseMoves: {
        type: Number,
        default: 0,
        min: 0
    },
    scrolls: {
        type: Number,
        default: 0,
        min: 0
    },
    idleTime: {
        type: Number,
        default: 0,
        min: 0
    }
}, { _id: false });

const activeAppSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true
    },
    title: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        enum: ['productive', 'distraction', 'neutral'],
        default: 'neutral'
    }
}, { _id: false });

const browserActivitySchema = new mongoose.Schema({
    url: {
        type: String,
        trim: true
    },
    title: {
        type: String,
        trim: true
    },
    domain: {
        type: String,
        trim: true,
        lowercase: true
    },
    category: {
        type: String,
        enum: ['productive', 'distraction', 'neutral'],
        default: 'neutral'
    }
}, { _id: false });

const eyeTrackingSchema = new mongoose.Schema({
    enabled: {
        type: Boolean,
        default: false
    },
    gazeX: {
        type: Number,
        min: 0
    },
    gazeY: {
        type: Number,
        min: 0
    },
    blinkRate: {
        type: Number,
        min: 0
    },
    focusedOnScreen: {
        type: Boolean
    }
}, { _id: false });

const activitySchema: mongoose.Schema<IActivity> = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now 
    },
    activityData: {
        type: activityDataSchema,
        required: true
    },
    activeApp: {
        type: activeAppSchema,
        required: true
    },
    browserActivity: {
        type: browserActivitySchema
    },
    eyeTracking: {
        type: eyeTrackingSchema,
        default: () => ({
            enabled: false
        })
    },
    focusScore: {
        type: Number,
        min: 0,
        max: 1
    },
    distractionDetected: {
        type: [String],
        default: [],
    },
}, {
    timestamps: true,
    collection: 'activities'
});

//Compound indexes for common queries
activitySchema.index({ sessionId: 1, timestamp: -1 });
activitySchema.index({ userId: 1, timestamp: -1 });
activitySchema.index({ userId: 1, sessionId: 1 });

//auto delete the data after 90 days
activitySchema.index({timeStamp: 1}, {expireAfterSeconds: 7776000})

//Pre-save hook to extract domain from URL
activitySchema.pre('save', function(next){
    if(this.browserActivity?.url && !this.browserActivity.domain) {
        try{
            const url = new URL(this.browserActivity.url);
            this.browserActivity.domain = url.hostname;
        }catch(err){
            console.log(err);
            return 
        }
    }
    next();
})

export const Activity = mongoose.model('Activity', activitySchema)