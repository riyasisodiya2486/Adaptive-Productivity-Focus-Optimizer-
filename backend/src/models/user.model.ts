import mongoose from "mongoose";

interface IUser {
    name: string;
    email: string;
    password: string;
    preferences: {
        trackingMode: 'work-only' | 'always';
        eyeTrackingEnabled: boolean;
        notificationEnabled: boolean;
        focusThreshold: number;
        breakDuration:  number;
        workHours: {
            start: string;
            end: string;
        }
    };
    whitelistedApps: string[],
    blacklistedApps: string[],
    whitelistedUrls: string[];
    blacklistedUrls: string[],
    createdAt: Date;
    updatedAt: Date;
}

const userSchema: mongoose.Schema<IUser> = new mongoose.Schema({
    name: {
        type: String,
        trim: true
    },
    email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    preferences: {
        trackingMode: {
            type: String,
            enum: ['work-only', 'always'],
            default: 'work-only'
        },
        eyeTrackingEnabled: {
            type: Boolean,
            default: false
        },
        notificationEnabled: {
            type: Boolean,
            default: true
        },
        focusThreshold: {
            type: Number,
            default: 0.5,
            min: 0,
            max: 1
        },
        breakDuration: {
            type: Number,
            default: 5,
        },
        workHours: {
            start: {
                type: String,
                default: '09:00',
            },
            end: {
                type: String,
                default: '17:00',
            }
        }
    },
    whitelistedApps: {
        type: [String],
        default: [
            'VS Code',
            'Visual Studio',
            'IntelliJ IDEA',
            'PyCharm',
            'Sublime Text',
            'Google Docs',
            'Microsoft Word',
            'Microsoft Excel',
            'Notion',
            'Slack',
            'Microsoft Teams',
            'Zoom',
            'GitHub Desktop',
            'Postman',
            'Terminal',
            'Command Prompt',
        ],
    },
    blacklistedApps: {
        type: [String],
        default: [
            'Instagram',
            'Facebook',
            'Twitter',
            'TikTok',
            'Snapchat',
            'WhatsApp Desktop',
            'Telegram Desktop',
            'Discord',
            'YouTube',
            'Netflix',
            'Spotify',
            'Steam',
            'Epic Games',
            'Reddit',
      ],
    },
    whitelistedUrls: {
        type: [String],
        default: [
            'github.com',
            'stackoverflow.com',
            'docs.google.com',
            'medium.com',
            'dev.to',
            'wikipedia.org',
            'coursera.org',
            'udemy.com',
            'leetcode.com',
            'hackerrank.com',
            'notion.so',
            'trello.com',
            'jira.atlassian.com',
            'docs.microsoft.com',
            'developer.mozilla.org',
        ]
    },
    blacklistedUrls: {
        type: [String],
        default: [
            'facebook.com',
            'instagram.com',
            'twitter.com',
            'tiktok.com',
            'youtube.com',
            'netflix.com',
            'reddit.com',
            'twitch.tv',
            'pinterest.com',
            'imgur.com',
            '9gag.com',
            'buzzfeed.com',
      ],
    }
}, {timestamps: true})

export const User = mongoose.model("User", userSchema);