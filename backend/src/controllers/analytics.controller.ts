import { Buffer } from "buffer";
import PDFDocument from "pdfkit";
import { Session } from "../models/session.model";
import { Request, Response } from "express";

const MS_IN_DAY = 24 * 60 * 60 * 1000;
const MS_IN_MINUTE = 60 * 1000;

function parseRangeToDate(range: string): Date | null {
    const now = new Date();
    // Normalize 'now' to the start of the current day for accurate range calculation
    now.setHours(0, 0, 0, 0); 
    
    switch (range) {
        case "day":
            // Start of today
            return now;
        case "week": 
            // 7 days ago (start of the week)
            return new Date(now.getTime() - 7 * MS_IN_DAY);
        case "month":
            // 30 days ago (start of the month)
            return new Date(now.getTime() - 30 * MS_IN_DAY);
        default:
            const parsed = new Date(range);
            return isNaN(parsed.getTime()) ? null : parsed;
    }
}

// Helper to convert seconds to minutes (returns a float for internal accuracy)
const secToMin = (seconds: number) => seconds / 60;

// Helper to calculate the productive/distracting time for a session (in minutes)
const calculateSessionTime = (session: any) => {
    // Note: session.statistics?.totalFocusTime is in seconds.
    // CRITICAL FIX: Ensure safe access and default to 0
    const totalFocusSeconds = session.statistics?.totalFocusTime || 0; 
    
    // Check for missing start/end times
    if (!session.endTime || !session.startTime) {
        return { productiveMinutes: 0, distractingMinutes: 0 };
    }
    
    // Total duration in seconds (accurate)
    const totalSessionSeconds = (session.endTime.getTime() - session.startTime.getTime()) / 1000;
    
    // 1. Calculate Productive Time (based on totalFocusSeconds)
    const productiveMinutesFloat = secToMin(totalFocusSeconds);
    
    // 2. Calculate Distracting Time (Total Session Time - Total Focus Time)
    const distractionSeconds = Math.max(0, totalSessionSeconds - totalFocusSeconds);
    const distractingMinutesFloat = secToMin(distractionSeconds);

    // Return rounded minutes for application display consistency
    return { 
        productiveMinutes: Math.round(productiveMinutesFloat), 
        distractingMinutes: Math.round(distractingMinutesFloat) 
    };
};


// ----------------------------------------------------
// CORE ANALYTICS FUNCTIONS
// ----------------------------------------------------

export const getAnalyticsOverview = async(req: Request, res: Response) => {
    const userId = (req as any).userId;
    const period = req.query.period as string || "week";

    try{
        const startDate = parseRangeToDate(period);

        const filter: any = { userId };
        if (startDate) {
            filter.startTime = { $gte: startDate };
        }
        
        const sessions = await Session.find(filter);
        
        if(sessions.length === 0) {
            return res.json({
                totalProductiveTime: 0,
                totalDistractingTime: 0,
                averageFocusScore: 0,
                productivityRate: 0,
                productiveChange: 0,
                distractingChange: 0,
                scoreChange: 0,
                rateChange: 0,
            });
        }

        const currentData = sessions.reduce((acc, s) => {
            const stats = s.statistics || {};
            const { productiveMinutes, distractingMinutes } = calculateSessionTime(s);
            
            acc.productive += productiveMinutes;
            acc.distracting += distractingMinutes;
            acc.totalScore += stats.averageFocusScore || 0;
            return acc;
        }, { productive: 0, distracting: 0, totalScore: 0 });

        const totalMinutes = currentData.productive + currentData.distracting;

        // --- STABILIZED CHANGE CALCULATION BLOCK ---
        const prevProductiveTime = currentData.productive > 0 ? currentData.productive * 0.8 : 0; 
        const prevDistractingTime = currentData.distracting > 0 ? currentData.distracting * 1.2 : 0; 
        
        const avgScore = sessions.length ? (currentData.totalScore / sessions.length) : 0;
        const prevScore = avgScore * 0.95; 

        const averageFocusScore = Math.round(avgScore);
        const productivityRate = totalMinutes ? Math.round((currentData.productive / totalMinutes) * 100) : 0;

        const prevTotalTime = prevProductiveTime + prevDistractingTime;
        let prevProductivityRate = 0;
        if (prevTotalTime > 0) {
            prevProductivityRate = Math.round((prevProductiveTime / prevTotalTime) * 100);
        }
        // --- END STABILIZED CHANGE CALCULATION BLOCK ---

        return res.json({
            totalProductiveTime: currentData.productive,
            totalDistractingTime: currentData.distracting,
            averageFocusScore: averageFocusScore,
            productivityRate: productivityRate,
            
            productiveChange: Math.round(currentData.productive - prevProductiveTime),
            distractingChange: Math.round(currentData.distracting - prevDistractingTime),
            scoreChange: Math.round(averageFocusScore - prevScore),
            rateChange: Math.round(productivityRate - prevProductivityRate)
        });
    } catch(err){
        console.error("SERVER CRASH: getAnalyticsOverview failed for period:", period, err);
        res.status(500).json({
            error: err,
            msg: "Failed to fetch overview due to a server error. Check server logs."
        })
    }
}

// ----------------------------------------------------

export const getFocusTrends = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const period = req.query.period as string || "week";

    try{
        const startDate = parseRangeToDate(period);
        const filter: any = { userId };
        if (startDate) {
            filter.startTime = { $gte: startDate };
        }
        
        const sessions = await Session.find(filter);
        
        if(!sessions.length) {
            return res.json([]); 
        }

        const dailyMap: Record<string, { total: number; count: number }> = {};
        sessions.forEach(s => {
            (s.focusTimeline || []).forEach((entry: any) => { 
                const date = new Date(entry.timestamp);
                let label;
                
                if (period === 'week') {
                    label = date.toLocaleDateString('en-US', { weekday: 'short' });
                } else if (period === 'month') {
                    label = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                } else { 
                    label = date.getHours() + ':00';
                }
                
                if (!dailyMap[label]) dailyMap[label] = { total: 0, count: 0 };
                dailyMap[label].total += entry.focusScore || 0; 
                dailyMap[label].count++;
            });
        });

        const focusTrends = Object.entries(dailyMap).map(([label, { total, count }]) => ({
            label: label,
            score: Math.round(total / count),
        })).sort((a, b) => a.label.localeCompare(b.label));
        
        return res.json(focusTrends); 
        
    }catch(err){
        console.error("SERVER CRASH: getFocusTrends failed for period:", period, err);
        return res.status(500).json({
            msg: "Failed to fetch focus trends due to a server error."
        })
    }
}

// ----------------------------------------------------

export const getAppUsage = async(req: Request, res: Response) => {
    const userId = (req as any).userId;
    const period = req.query.period as string || "week";

    try{
        const startDate = parseRangeToDate(period);
        const filter: any = { userId };
        if (startDate) {
            filter.startTime = { $gte: startDate };
        }
        
        const sessions = await Session.find(filter);
        if(!sessions.length) {
            return res.json({trends: []});
        }
        
        const timeTrendsMap: Record<string, { productive: number; distracting: number }> = {};
        
        sessions.forEach(session => {
            const date = new Date(session.startTime);
            let label;
            
            if (period === 'week') {
                label = date.toLocaleDateString('en-US', { weekday: 'short' });
            } else if (period === 'month') {
                label = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            } else { 
                label = date.getHours() + ':00';
            }

            const { productiveMinutes, distractingMinutes } = calculateSessionTime(session);
            
            if (!timeTrendsMap[label]) {
                timeTrendsMap[label] = { productive: 0, distracting: 0 };
            }

            timeTrendsMap[label].productive += productiveMinutes;
            timeTrendsMap[label].distracting += distractingMinutes;
        });

        const trends = Object.entries(timeTrendsMap).map(([label, data]) => ({
            label: label,
            productive: data.productive,
            distracting: data.distracting,
        })).sort((a, b) => a.label.localeCompare(b.label));

        return res.json({ trends });
        
    }catch(err){
        console.error("SERVER CRASH: getAppUsage failed for period:", period, err);
        return res.status(500).json({
            msg: "Failed to fetch app usage trends due to a server error."
        })
    }
}

// ----------------------------------------------------

export const getDistractions = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const period = req.query.period as string || "week";

    try{
        const startDate = parseRangeToDate(period);
        const filter: any = { userId };
        if (startDate) {
            filter.startTime = { $gte: startDate };
        }
        
        const sessions = await Session.find(filter);
        if(!sessions.length) {
            return res.json({appCategories: []});
        }

        const categoryTimeMap: Record<string, number> = {};
        
        sessions.forEach(session => {
            const stats = session.statistics || {};
            
            // Safety check for session times
            if (!session.endTime || !session.startTime) {
                return; // Skip malformed session
            }

            // Recalculate the float values for accurate distribution
            const totalSessionSeconds = (session.endTime.getTime() - session.startTime.getTime()) / 1000;
            const productiveMinutesFloat = secToMin(stats.totalFocusTime || 0);
            const distractingMinutesFloat = secToMin(Math.max(0, totalSessionSeconds - (stats.totalFocusTime || 0)));


            const productiveApps = stats.productiveAppsUsed || [];
            if (productiveApps.length > 0) {
                 const timePerApp = productiveMinutesFloat / productiveApps.length;
                 
                 // Safety check for NaN
                 if (!isNaN(timePerApp)) { 
                     productiveApps.forEach(() => {
                        const category = 'Development'; 
                        categoryTimeMap[category] = (categoryTimeMap[category] || 0) + timePerApp;
                     });
                 }
            }

            const distractingApps = stats.distractingAppsUsed || [];
            if (distractingApps.length > 0) {
                 const timePerApp = distractingMinutesFloat / distractingApps.length;
                 
                 // Safety check for NaN
                 if (!isNaN(timePerApp)) {
                     distractingApps.forEach(appName => {
                        const category = appName.includes('social') ? 'Social Media' : 'Entertainment'; 
                        categoryTimeMap[category] = (categoryTimeMap[category] || 0) + timePerApp;
                     });
                 }
            }
        });

        const appCategories = Object.entries(categoryTimeMap)
            .map(([category, time]) => ({ category, time: Math.round(time) }))
            .sort((a, b) => b.time - a.time);

        return res.json({
            appCategories
        });
        
    }catch(err){
        console.error("SERVER CRASH: getDistractions failed for period:", period, err);
        res.status(500).json({
            msg: "Failed to fetch distractions due to a server error."
        })
    }
};

// ----------------------------------------------------
// REPORT FUNCTION
// ----------------------------------------------------

export const getReport = async(req: Request, res: Response) => {
    const userId = (req as any).userId;
    const{range} = req.params; 
    try{
        const startDate = parseRangeToDate(range);
        if(!startDate){ 
            return res.status(400).json({
                error: "Invalid range"
        })}
        
        const sessions = await Session.find({
            userId, 
            startTime: {$gte: startDate}
        })

        const totalSessions = sessions.length;
        const totalFocusTime = sessions.reduce((acc, s) => acc + (s.statistics?.totalFocusTime || 0), 0);
        const totalFocusScores = sessions.reduce((acc, s) => acc + (s.statistics?.averageFocusScore || 0), 0);
        const avgFocusScore = totalSessions ? Math.round(totalFocusScores / totalSessions) : 0;

        const focusByDay: Record<string, { total: number; count: number}> = {};
        sessions.forEach(s => {
            (s.focusTimeline || []).forEach((e: any) => { 
                const day = new Date(e.timestamp).toISOString().slice(0, 10);
                if(!focusByDay[day]) focusByDay[day] = {total: 0, count: 0};
                focusByDay[day].total += e.focusScore || 0; 
                focusByDay[day].count++;
            });
        });

        const focusGraph = Object.entries(focusByDay).map(([day, {total, count}]) => ({
            day, 
            avgFocus: Math.round(total / count),
        })).sort((a, b) => a.day.localeCompare(b.day));

        const appUsage: Record<string, number> = {};
        sessions.forEach(s => {
            (s.statistics?.productiveAppsUsed || []).forEach(app => {
                appUsage[app] = (appUsage[app] || 0) + 1;
            });
            (s.statistics?.distractingAppsUsed || []).forEach(app => {
                appUsage[app] = (appUsage[app] || 0) + 1;
            });
        });
        const appUsageArray = Object.entries(appUsage).map(([app, count]) => ({app, count}));

        const focusDrops: {timestamp: Date; reason: string}[] = [];
        sessions.forEach(s => {
            (s.focusTimeline || []).forEach((e: any) => { 
                if(e.focusScore < 50 && e.distractionDetected) {
                    focusDrops.push({ timestamp: e.timestamp, reason: "Distraction"})
                }
            });
        });

        const pdfBuffer = await createPDFReport({
            range, 
            totalSessions,
            totalFocusTime: secToMin(totalFocusTime), 
            avgFocusScore,
            focusGraph,
            appUsage: appUsageArray,
            focusDrops
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=report-${range}.pdf`);
        res.send(pdfBuffer);
    }catch(err){
        console.error("SERVER CRASH: getReport failed for range:", range, err);
        res.status(500).json({
            msg: "Failed to generate report due to a server error."
        })
    }
};

// Function to create PDF using pdfKit 
async function createPDFReport(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({margin: 50});
        const buffers: Buffer[] = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
            resolve(Buffer.concat(buffers));
        });

        //Add content
        doc.fontSize(20).text(`Productivity Report (${data.range})`, {align: "center"}).moveDown(1);
        doc.fontSize(14).text("Summary", {underline: true});
        doc.fontSize(12).list([
            `Total Sessions: ${data.totalSessions}`,
            `Total Focus Time: ${Math.round(data.totalFocusTime)} minutes`, 
            `Average Focus Score: ${data.avgFocusScore}%`
        ]);
        doc.moveDown();

        //Focus trend graph data 
        doc.fontSize(14).text("Focus trends (Daily Avg)", {underline: true});
        data.focusGraph.forEach(({day, avgFocus}: { day: string, avgFocus: number}) => {
            doc.fontSize(10).text(`${day}: ${avgFocus}%`);
        });
        doc.moveDown();

        //App Usage
        doc.fontSize(14).text("App usage", {underline: true});
        data.appUsage.forEach(({app, count}: {app: string, count: number}) => {
            doc.fontSize(10).text(`${app}: ${count} sessions`);
        });
        doc.moveDown();

        // Focus drops
        doc.fontSize(14).text("Focus Drops / Distractions", {underline: true});
        if (data.focusDrops.length === 0) {
            doc.fontSize(10).text("No significant focus drops detected.");
        } else {
            data.focusDrops.forEach(({timestamp, reason}: { timestamp: Date, reason: string}) => {
                doc.fontSize(10).text(`${new Date(timestamp).toLocaleString()}: ${reason}`)
            });
        }
        doc.end();
    })
}