
interface BadgeUnlockCondition {
    type: 'totalSessions' | 'totalFocusTime' | 'bestFocusScore' | 'longestStreak' | 'perfectDays' | 'level';
    value: number; // The target value
}

export interface IBadgeDefinition {
    badgeId: string;
    name: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
    category: 'focus' | 'streak' | 'productivity' | 'mastery' | 'social' | 'time';
    description: string;
    unlockRequirement: BadgeUnlockCondition; // NOW POPULATED BELOW
    icon: string;
    xpReward: number;
    image: string;
}

// Badge Definitions
export const BADGE_DEFINITIONS: Record<string, IBadgeDefinition> = {
  FOCUS_HERO: {
    badgeId: 'focus_hero',
    name: 'Focus Hero',
    tier: 'gold' as const,
    category: 'focus' as const,
    description:
      'A golden helmet with a glowing aura and lightning bolt, symbolizing **heroic attention** and mental clarity.',
    unlockRequirement: { type: 'bestFocusScore', value: 98 }, // Must achieve an ultra-high focus score once
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
      'A robust titan holding a blazing torch high atop crystal stairs, representing **unstoppable, long-term streaks**.',
    unlockRequirement: { type: 'longestStreak', value: 60 }, // Longest streak reaches 60 days
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
      'A mystical open book radiating purple energy, gears, and clocks, representing the **mastery of productivity sessions**.',
    unlockRequirement: { type: 'totalSessions', value: 150 }, // Complete 150 sessions
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
      'A superhero shield breaking through a cloud of red distractions, earned by achieving **multiple perfect focus days**.',
    unlockRequirement: { type: 'perfectDays', value: 10 }, // Complete 10 days with >90% focus score (perfect days)
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
      'A majestic hourglass with glowing liquid gold sand, symbolizing the **accumulation of significant focus time**.',
    unlockRequirement: { type: 'totalFocusTime', value: 9000 }, // Accumulate 150 hours (9000 minutes)
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
      'A platinum badge crowned with laurel wreaths and a diamond star, awarded for achieving an **ultra-long activity streak**.',
    unlockRequirement: { type: 'longestStreak', value: 180 }, // Longest streak reaches 180 days (6 months)
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
      'A wise sage meditating on a floating lotus, radiating tranquility, earned by reaching a **high level of mastery**.',
    unlockRequirement: { type: 'level', value: 30 }, // Reach Player Level 30
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
      'An electric blue badge with a roaring lion and lightning bolts, earned for **completing a very high number of sessions**.',
    unlockRequirement: { type: 'totalSessions', value: 300 }, // Complete 300 sessions
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
      'A shimmering constellation of joined hands and stardust, representing **excellence in collaboration** (or equivalent social metric).',
    unlockRequirement: { type: 'perfectDays', value: 50 }, // Complete 50 "perfect days" (placeholder for social/perfect session metric)
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
      'An ornate, glowing crown studded with cosmic gems, reserved for **the highest echelon of player level and achievement**.',
    unlockRequirement: { type: 'level', value: 50 }, // Reach Player Level 50
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


// Challenge Pools
export const DAILY_CHALLENGE_POOL = [
  { name: "Daily Grind", description: "Complete 3 focus sessions today", type: "daily", requirement: 3, xpReward: 100 },
  { name: "Early Riser", description: "Start your first session before 8am", type: "daily", requirement: 1, xpReward: 120, customCheck: "startBefore8am" },
  { name: "Distraction Free", description: "Finish a session with zero distractions", type: "daily", requirement: 1, xpReward: 120, customCheck: "noDistractions" },
  { name: "Average Joe", description: "Average focus score above 75 today", type: "daily", requirement: 75, xpReward: 130, customCheck: "avgFocusAbove75" }
];

export const WEEKLY_CHALLENGE_POOL = [
  { name: "Weekly Warrior", description: "Complete 15 sessions this week", type: "weekly", requirement: 15, xpReward: 400 },
  { name: "Hour Hero", description: "Log 10 hours of focus this week", type: "weekly", requirement: 600, xpReward: 500 },
  { name: "No Missed Days", description: "Work every day this week", type: "weekly", requirement: 7, xpReward: 700, customCheck: "noDaysMissed" },
  { name: "High Roller", description: "Achieve a focus score of 90+ in 5 sessions", type: "weekly", requirement: 5, xpReward: 500, customCheck: "fiveHighFocusSessions" }
];

export const MONTHLY_CHALLENGE_POOL = [
  { name: "Monthly Marathon", description: "Complete 40 sessions in a month", type: "monthly", requirement: 40, xpReward: 1500 },
  { name: "Streak Master", description: "Maintain a 10-day streak this month", type: "monthly", requirement: 10, xpReward: 1200, customCheck: "tenDayStreak" },
  { name: "Focus Legend", description: "Average focus above 90 this month", type: "monthly", requirement: 90, xpReward: 2000, customCheck: "avgFocusAbove90" },
  { name: "All-Star", description: "Do a session every Monday this month", type: "monthly", requirement: 4, xpReward: 1750, customCheck: "fourMondays" }
];