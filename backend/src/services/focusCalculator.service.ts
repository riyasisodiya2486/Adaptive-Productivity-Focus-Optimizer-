import mongoose from "mongoose";
import { Activity } from "../models/activity.model";
import { User } from "../models/user.model";
import { Session } from "../models/session.model";


interface FocusScoreResult {
    focusScore: number;
    activityLevel: 'high' | 'low' | 'medium';
    distractionDetected: boolean;
    distractionReasons: string[];
}

export class FocusCalculator {
    static async calculateFocusScore(
        sessionId: string,
        userId: string,
        timeWindowMinutes: number = 5
    ): Promise<FocusScoreResult> {
        const user = await User.findById(userId);
        if(!user) throw new Error('user not found');

        const startTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

        //get recent activites for this session 
        const activites = await Activity.find({
            sessionId: new mongoose.Types.ObjectId(sessionId),
            timestamp: {$gte: startTime}
        }).sort('timestamp')

        if(activites.length === 0){
            return{
                focusScore:0,
                activityLevel: 'low',
                distractionDetected: true,
                distractionReasons: ['No activity detected in the time window']
            };
        }

        let totalKeystrokes = 0;
        let totalMouseClicks = 0;
        let totalMouseMoves = 0;
        let totalScrolls = 0;
        let totalIdleTime = 0 ;
        let distractionAppCount = 0;
        let productiveAppsCount = 0;
        let neutralAppCount = 0;
        let appSwitchCount = 0;
        let avgBlinkrate = 0;
        let focusedOnScreenCount = 0;
        let eyeTrackingEnabledCount = 0;
        let previousApp = '';
        let distractionEventsCount = 0;
        let productiveSilentReadingCount = 0;

        //aggregate the activity data
        activites.forEach((activity) =>{
            totalKeystrokes += activity.activityData.keyStrokes || 0;
            totalMouseClicks += activity.activityData.mouseClicks || 0;
            totalMouseMoves += activity.activityData.mouseMoves || 0;
            totalIdleTime += activity.activityData.idleTime || 0;
            totalScrolls += activity.activityData.scrolls || 0;

            const appName = activity.activeApp?.name || '';
            const url = activity.browserActivity?.url || '';
            const domain = activity.browserActivity?.domain || '';

            let isProductive = false, isDistraction = false, isReadingMode = false;

            //App
            if(user.whitelistedApps.includes(appName)) isProductive = true;
            if(user.blacklistedApps.includes(appName)) isDistraction = true;

            //domain/Url
            if(user.whitelistedUrls.some(wl => url.includes(wl) || domain === wl)) isProductive = true;
            if(user.blacklistedUrls.some(bl => url.includes(bl) || domain === bl)) isDistraction = true;

            //special case: youtube 
            if(domain === 'youtube.com' || domain === 'www.youtube.com'){
                const youtubeUrl = url.toLowerCase();
                const isVideoPage = youtubeUrl.includes('/watch?v=');
                const isPlaylistPage = youtubeUrl.includes('playlist?list=');

                const studyKeywords = ['study', 'tutorial', 'lecture', 'focus', 'music for study', 'coding', 'programming', 'learn'];
                const containsStudyKeywords = studyKeywords.some(keyword => youtubeUrl.includes(keyword));

                const isWhitelistedYoutube = isVideoPage && (containsStudyKeywords || user.whitelistedUrls.some(wl => youtubeUrl.includes(wl)));
                if(isWhitelistedYoutube || isPlaylistPage){
                    isProductive = true;
                    isDistraction = false;
                }else{
                    isProductive = false;
                    isDistraction = true;
                }
            }

            //Reading mode: no penalty for low activity on reading site/apps
            const isWhitelistedReadingApp = isProductive && (user.whitelistedApps.includes(appName)) || user.whitelistedUrls.some(wl => url.includes(wl) || domain === wl)
            const researchKeywords = [
                'how to', 'tutorials', 'learn', 'guide', 'documentation', 'wiki', 'study',
                'course', 'syllabus', 'project', 'problem solving', 'explanation', 'what is', 'example', 'notes'
            ];
            
            const pageTitle = (activity.browserActivity?.title || '').toLowerCase();
            const fullPageText = `${url.toLowerCase()} ${pageTitle}`;
            const isResearchIntent = researchKeywords.some(keyword => fullPageText.includes(keyword));

            const isNewResearchSite = !user.whitelistedUrls.some(wl => domain.includes(wl)) &&
                                       isResearchIntent &&
                                       !user.blacklistedUrls.some(bl => domain.includes(bl));

            const keystrokesPM = activity.activityData.keyStrokes || 0;
            const mousePM = (activity.activityData.mouseClicks || 0) + ((activity.activityData.mouseMoves || 0)/ 10);
            const lowActivityButEngaged = keystrokesPM < 5 && totalIdleTime < (timeWindowMinutes * 60 * 0.7);

            //final reading mode check
            const readingModeDetected = (isWhitelistedReadingApp || isNewResearchSite ||isResearchIntent) && lowActivityButEngaged;
            if(readingModeDetected) {
                isReadingMode = true;
                productiveSilentReadingCount++;
                isProductive = true;
                isDistraction = false
            }

            if(isProductive) productiveAppsCount++;
            else if (isDistraction) distractionAppCount++;
            else neutralAppCount++;

            //App switching 
            if(activity.activeApp?.name && previousApp && activity.activeApp.name !== previousApp){
                if(
                    user.whitelistedApps.includes(activity.activeApp.name) &&
                    user.whitelistedApps.includes(previousApp)
                ){
                    appSwitchCount +=0.5
                }else{
                    appSwitchCount++;
                }
            }
            previousApp = activity.activeApp?.name || '';

            //eye tracking data
            if(activity.eyeTracking?.enabled){
                eyeTrackingEnabledCount++;
                avgBlinkrate += activity.eyeTracking.blinkRate || 0;
                if(activity.eyeTracking.focusedOnScreen){
                    focusedOnScreenCount++;
                }
            }

            //distraction events
            if(activity.distractionDetected && activity.distractionDetected.length > 0){
                const serverity = activity.distractionDetected.reduce((acc: number, d: string)=>{
                    const lower = d.toLowerCase();
                    if(lower.includes('popup')|| lower.includes('notification')) return acc + 1;
                    if(lower.includes('social')|| lower.includes('entertainment')) return acc + 3;
                    return acc + 2;
                }, 0);
                distractionEventsCount += serverity;
            }
        });

        const activityCount = activites.length;
        if(eyeTrackingEnabledCount > 0){
            avgBlinkrate = avgBlinkrate / eyeTrackingEnabledCount;
        }

        // ----FOCUS SCORE CALCULATION(0-100)---
        let focusScore = 50;
        let distractionReasons: string[] = [];
        
        //1. keyboard activity(0-25 points)
        const keystrokesPerMinute = totalKeystrokes/ timeWindowMinutes;
        const mouseActivityPerMinute = (totalMouseClicks + (totalMouseMoves / 10)) / timeWindowMinutes;

        //Reading mode
        if(productiveSilentReadingCount > 0){
            focusScore += 15;
        }else{
            // Keyboard
            if(keystrokesPerMinute > 100){
                focusScore += 25;
            } else if(keystrokesPerMinute > 50){
                focusScore += 15;
            } else if(keystrokesPerMinute > 20) {
                focusScore += 10;
            } else if(keystrokesPerMinute > 10){
                focusScore +=5;
            } else{
                distractionReasons.push('low keyboard activity');
            }
            
            //Mouse
            if(mouseActivityPerMinute > 30){
                focusScore += 10;
            } else if(mouseActivityPerMinute > 15){
                focusScore += 5
            } else if( mouseActivityPerMinute < 3) {
                distractionReasons.push('very low mouse activity');
            }
        }

                
        // idle time penalty(0  to -20 points)
        const totalTimeSeconds = timeWindowMinutes * 60;
        const isActiveReading = productiveSilentReadingCount > 0;
        const isVisuallyFocused = eyeTrackingEnabledCount > 0 && (focusedOnScreenCount/eyeTrackingEnabledCount) > 0.7;

        if(isActiveReading || isVisuallyFocused){
            totalIdleTime *= 0.5;
        }

        const idlePercentage = (totalIdleTime/totalTimeSeconds) * 100;
        if(!productiveSilentReadingCount){
            if(idlePercentage > 60){
                focusScore -= 20;
                distractionReasons.push('excessive idle time (>60%)');
            } else if(idlePercentage > 40){
                focusScore -= 15;
                distractionReasons.push('high idle time')
            } else if(idlePercentage > 25) {
                focusScore -= 8;
            }
        }

        // app switching penalty (0 to -15 points)
        const swtichesPerMinute = appSwitchCount /  timeWindowMinutes;
        if(swtichesPerMinute > 3){
            focusScore -= 15;
            distractionReasons.push('Frequent app switching');
        } else if(swtichesPerMinute > 2) {
            focusScore -= 10;
            distractionReasons.push('moderate app switching')
        } else if(swtichesPerMinute > 1){
            focusScore -= 5;
        }

        // distraction apps Penalty(0 to -25 points)
        const distractionPercentage = (distractionAppCount/activityCount) * 100;
        if(distractionPercentage > 40) {
            focusScore -= 25;
            distractionReasons.push('High usage of distracting app/sites');
        }
        else if(distractionPercentage > 10){
            focusScore -= 8;
        }

        const productivePercentage = (productiveAppsCount/ activityCount) *100;
        if(productivePercentage > 70) focusScore += 15;
        else if(productivePercentage > 50) focusScore += 10;
        else if(productivePercentage > 30) focusScore +=5;

        //Eye tracking
        if(eyeTrackingEnabledCount > 0){
            const focusedPercentage = (focusedOnScreenCount/ eyeTrackingEnabledCount) * 100;
            if(focusedPercentage > 80) focusScore +=10;
            else if(focusedPercentage > 60) focusScore +=5;
            else if(focusedPercentage < 40) {
                focusScore -=5;
                distractionReasons.push('low screen focus detected');
            }

            if(avgBlinkrate<10 && avgBlinkrate > 0) distractionReasons.push('low blink rate - possible eye strain');
            else if(avgBlinkrate > 30) distractionReasons.push('high blink rate - possible fatigue');
        }

        // Detected distraction events
        if(distractionEventsCount>0){
            const distractionEventPercentage = (distractionEventsCount/activityCount) * 100;
            if(distractionEventPercentage > 20) focusScore -= 10;
            else if(distractionEventPercentage>10) focusScore -=5;
        }

        focusScore = Math.max(0, Math.min(100, focusScore));
        let activityLevel: 'high' | 'medium' | 'low';
        if (focusScore>=70) activityLevel = 'high';
        else if (focusScore>=40) activityLevel = 'medium';
        else activityLevel = 'low';

        // Remove interaction distraction reasons for reading mode
        if(productiveSilentReadingCount > 0){
            distractionReasons = distractionReasons.filter(r =>
                !/low keyboard activity/i.test(r) &&
                !/very low mouse activity/i.test(r)
            )
        }

        return{
            focusScore: Math.round(focusScore),
            activityLevel,
            distractionDetected: distractionReasons.length > 0,
            distractionReasons
        }
    }

    // Update session statistics at the end of the session
    static async updateSessionStatistics(sessionId: string): Promise<void> {
        const session = await Session.findById(sessionId);
        if(!session){
            console.error(`session ${sessionId} not found`);
            return;
        }

        const activities = await Activity.find({sessionId});

        if (activities.length === 0){
            console.log(`No activities found for session ${sessionId}`);
        }

        //Intialize aggregation variables
        let totalKeystrokes = 0;
        let totalMouseActivity = 0;
        let totalIdleTime = 0;
        let distractionsCount = 0;
        const productiveApps = new Set<string>();
        const distractingApps = new Set<string>();

        //aggregate data from activities
        activities.forEach(activity => {
            totalKeystrokes += activity.activityData.keyStrokes || 0;
            totalMouseActivity += (activity.activityData.mouseClicks || 0) + (activity.activityData.mouseMoves || 0);
            totalIdleTime += activity.activityData.idleTime || 0;

            if(activity.distractionDetected && activity.distractionDetected.length > 0){
                distractionsCount++;
            }

            if(activity.activeApp?.name) {
                if(activity.activeApp.category === 'productive'){
                    productiveApps.add(activity.activeApp.name)
                } else if (activity.activeApp.category === 'distraction'){
                    distractingApps.add(activity.activeApp.name);
                }
            }
        });

        // Calculate focus statistics from timeline
        if(session.focusTimeline.length > 0){
            const focusScores = session.focusTimeline.map(entry => entry.focusScore);
            const avgFocusScore = focusScores.reduce((a,b) => a+b, 0);
            const peakFocusScore = Math.max(...focusScores);
            const lowestFocusScore = Math.min(...focusScores);

            //calculate focus time vs distraction time
            let totalFocusTime = 0;
            let totalDistractionTime = 0;
            const intervalMinutes = 5;

            session.focusTimeline.forEach(entry => {
                if(entry.activityLevel === 'high'){
                    totalFocusTime += intervalMinutes * 60;
                } else if (entry.activityLevel === 'low'){
                    totalDistractionTime += intervalMinutes * 60
                }
            });

            //convert to minutes
            totalFocusTime = Math.round(totalFocusTime / 60);
            totalDistractionTime = Math.round(totalDistractionTime / 60);
            totalIdleTime = Math.round(totalIdleTime / 60);

            //update session statistics
            session.statistics = {
                averageFocusScore: Math.round(avgFocusScore),
                peakFocusScore: peakFocusScore,
                lowestFocusScore: lowestFocusScore,
                totalKeystrokes,
                totalMouseActivity,
                totalIdleTime,
                distractionsCount,
                productiveAppsUsed: Array.from(productiveApps),
                distractingAppsUsed: Array.from(distractingApps),
                totalFocusTime,
                totalDistractionTime
            };

            await session.save();
            console.log(`updated stats for session ${sessionId}`)
        }
    }

    static async getFocusTrend(sessionId: string){
        const session = await Session.findById(sessionId);
        if(!session){
            throw new Error('session not found')
        }

        return session.focusTimeline.map(entry => ({
            timestamp: entry.timestamp,
            focusScore: entry.focusScore,
            activityLevel: entry.activityLevel
        }))
    }

}
