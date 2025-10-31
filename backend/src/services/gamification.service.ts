import { Gamification } from "../models/gamification.model";
import { Session } from "../models/session.model";


export class GamificationService{

    // Calculate and add xp based on session's focused time and achievemnts
    static async calculateAndAddXP(userId: string, sessionId: string){
        const session = await Session.findById(sessionId);
        if(!session) throw new Error('session not found');

        let gamification = await Gamification.findOne({userId});

        if(!gamification){
            gamification = new Gamification({
                userId,
                level: 1, 
                xp: 0, 
                xpToNextLevel: 100, 
                streaks:{currentStreak: 0, longestStreak: 0, }, 
                badges: [], 
                achievements: [], 
                statistics: {totalSessions: 0, totalBreaksTaken: 0, totalFocusTime: 0, recommendationsFollowed:0}})
        }

        const avgFocus = session.statistics.averageFocusScore || 0;
        const totalFocusSeconds = session.statistics.totalFocusTime || 0;
        const sessionDurationSeconds = session.duration || 0;
        const totalBreaksTaken = session.statistics.totalBreaksTaken || 0;

        let earnedXP = 0;

        // 1 Base XP on average focus score
        if(avgFocus >= 90) earnedXP += 50;
        else if (avgFocus >= 75) earnedXP += 30;
        else if (avgFocus >= 50) earnedXP += 15;
        else earnedXP += 5;

        
        // 2. total XP for total focus 
        earnedXP += Math.floor(totalFocusSeconds / 300);

        // 3. penalise for too many breaks
        const breakPenalty = Math.max(0, totalBreaksTaken - 2) * 2;
        earnedXP = Math.max(0, earnedXP - breakPenalty);

        // 4. bouse XP for long session
        if(sessionDurationSeconds >= 3600) earnedXP += 10;

        // 4. adjust streaks
        const streakThreshold = 70;
        if(avgFocus >= streakThreshold) {
            gamification.streaks.currentStreak++;
            if(gamification.streaks.currentStreak > gamification.streaks.longestStreak) {
                gamification.streaks.longestStreak = gamification.streaks.currentStreak;
            }
            earnedXP += gamification.streaks.currentStreak * 2;
        } else {
            gamification.streaks.currentStreak = 0
        }

        // update XP, handle level ups
        gamification.xp += earnedXP;
        while(gamification.xp >= gamification.xpToNextLevel) {
            gamification.xp -= gamification.xpToNextLevel;
            gamification.level++;
            gamification.xpToNextLevel = Math.floor(gamification.xpToNextLevel * 1.2);
            this.checkAndUnlockBadge(gamification, gamification.level);
        }

        //update stats
        gamification.statistics.totalSessions++;
        gamification.statistics.totalFocusTime += totalFocusSeconds;
        gamification.statistics.totalBreaksTaken = (gamification.statistics.totalBreaksTaken || 0) + totalBreaksTaken;
        gamification.statistics.recommendationsFollowed += session.statistics.recommendationsFollowed || 0;

        await gamification.save();
        
        return{
            earnedXP,
            totalXP: gamification.xp,
            currentStreak: gamification.streaks.currentStreak,
            longestStreak: gamification.streaks.longestStreak,
            badges: gamification.badges 
        };      
    }

    static async getUserBadges(userId: string) {
        const gamification = await Gamification.findOne({ userId });
        if (!gamification) {
            return {
                msg: "no badges earned"
            };
        }
        return gamification.badges;
    }


    static async getUserGamification(userId: string) {
        let gamification = await Gamification.findOne({userId});
        const sessions = await Session.find({userId});

        const totalFocusTime = sessions.reduce((acc, sess)=> acc + (sess.statistics?.totalFocusTime || 0), 0);
        const totalBreaksTaken = sessions.reduce((acc, sess)=> acc + (sess.statistics?.totalBreaksTaken || 0), 0)
        const totalSessions = sessions.length;
        const totalRecommendationsFollowed = sessions.reduce((acc, sess)=> acc + (sess.statistics.recommendationsFollowed || 0), 0);
        

        if(!gamification) {
            if(!sessions){
                return {
                    msg: "user do not exist"
                } 
            }

            gamification = new Gamification({
                userId,
                level:1,
                xp: 0,
                xpToNextLevel: 100,
                streaks: {currentStreak: 0, longestStreak: 0},
                achievements: [],
                statistics: {
                    totalBreaksTaken,
                    totalFocusTime, 
                    totalSessions,
                    totalRecommendationsFollowed
                } 
            })
            await gamification.save();
        }

        return gamification;
    }

    static checkAndUnlockBadge(gamification: any, level: number) {
            const badgesMap = [
                {level: 5, name: 'Bronze Achiever', tier: 'bronze', description: 'Reached level 5'},
                { level: 10, name: 'Silver Achiever', tier: 'silver', description: 'Reached level 10!' },
                { level: 20, name: 'Gold Achiever', tier: 'gold', description: 'Reached level 20!' },
                { level: 30, name: 'Platinum Achiever', tier: 'platinum', description: 'Reached level 30!' }
            ];

            const badgeToUnlock = badgesMap.find(badge => badge.level === level);
            if(badgeToUnlock && !gamification.badges.find((b: any) => b.name === badgeToUnlock.name)){
                gamification.badges.push({
                    name: badgeToUnlock.name,
                    tier: badgeToUnlock.tier,
                    description: badgeToUnlock.description,
                    unlocked: new Date()
                })
            }
        }
}