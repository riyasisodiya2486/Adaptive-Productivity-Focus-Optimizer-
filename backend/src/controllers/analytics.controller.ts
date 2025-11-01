import { Buffer } from "buffer";
import PDFDocument from "pdfkit";
import { Session } from "../models/session.model";
import { Request, Response } from "express";

const MS_IN_DAY = 24 * 60 * 60 * 1000;

function parseRangeToDate(range: string): Date | null {
    const now = new Date();
    switch (range) {
        case "week": 
            return new Date(now.getTime() - 7 * MS_IN_DAY);
        case "month":
            return new Date(now.getTime() - 30 * MS_IN_DAY);
        default:
            const parsed = new Date(range);
            return isNaN(parsed.getTime()) ? null : parsed;
    }
}

export const getAnalyticsOverview = async(req: Request, res: Response) => {
    const userId = (req as any).userId;
    try{
        const sessions = await Session.find({userId});
        if(sessions.length === 0) {
            return res.status(404).json({
                msg: "No sessions found"
            })
        }

        // Aggregate overview data
        const totalSessions = sessions.length;
        const totalFocusTime = sessions.reduce((acc, s) => acc + (s.statistics.totalFocusTime || 0), 0);
        const totalBreaksTaken = sessions.reduce((acc, s) => acc + (s.statistics.totalBreaksTaken || 0), 0);
        const avgFocusPercent = Math.round(
            sessions.reduce((acc, s)=> acc + (s.statistics?.averageFocusScore || 0), 0) / totalSessions
        );

        return res.json({
            totalSessions,
            totalFocusTime,
            totalBreaksTaken,
            avgFocusPercent
        });
    } catch(err){
        res.status(500).json({
            error: err,
            msg: "failed to fetch overview"
        })
    }
}

export const getFocusTrends = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    try{
        const sessions = await Session.find({userId});
        if(!sessions.length) {
            return res.status(404).json({
                msg: "No sessions"
            })
        }

        // Collect all focustimeline entries
        const entries = sessions.flatMap(s =>
            s.focusTimeline.map(e => ({ timestamp: e.timestamp, focusScore: e.focusScore}))
        )

        //group by date
        const dailyMap: Record<string, { total: number; count: number }> = {};
        entries.forEach(({ timestamp, focusScore }) => {
            const day = timestamp.toISOString().slice(0, 10);
            if (!dailyMap[day]) dailyMap[day] = { total: 0, count: 0 };
            dailyMap[day].total += focusScore;
            dailyMap[day].count++;
        });

        const focusTrends = Object.entries(dailyMap).map(([day, { total, count }]) => ({
        day,
        avgFocus: Math.round(total / count),
        })).sort((a, b) => a.day.localeCompare(b.day));
        
        return res.json({
            focusTrends
        });
    }catch(err){
        return res.status(500).json({
            msg: "failed to fetch focus trends"
        })
    }
}

export const getAppUsage = async(req: Request, res: Response) => {
    const userId = (req as any).userId;
    try{
        const sessions = await Session.find({userId});
        if(!sessions.length) {
            return res.status(404).json({
                msg: "no sessions"
            })
        }

        const appCount: Record<string, number> = {};
        sessions.forEach(session => {
            (session.statistics?.productiveAppsUsed || []).forEach(app => {
                appCount[app] = (appCount[app] || 0) + 1;
            });
            (session.statistics?.distractingAppsUsed || []).forEach(app => {
                appCount[app] = (appCount[app] || 0) + 1;
            });
        });

        const apps = Object.entries(appCount)
            .map(([app, count]) => ({app, count}))
            .sort((a, b) => b.count - a.count);
        res.json({apps});
    }catch(err){
        return res.status(500).json({
            msg: "failed to fetch app usage"
        })
    }
}

export const getDistractions = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    try{
        const sessions = await Session.find({userId});
        if(!sessions.length) return res.status(404).json({
            msg: "no sessions"
        })

        const reasonsCounts: Record<string, number> = {};
        sessions.forEach(session => {
            session.focusTimeline.forEach(entry => {
                if(entry.distractionDetected) {
                    reasonsCounts["Distraction"] = (reasonsCounts["Distraction"] || 0) + 1;
                }
            })
        })
        const distractions = Object.entries(reasonsCounts).map(([reason, count]) => ({reason, count}));
        return res.json({
            distractions
        });
    }catch(err){
        res.status(500).json({
            msg: "failed to fetch distractions"
        })
    }
};

export const getReport = async(req: Request, res: Response) => {
    const userId = (req as any).userId;
    const{range} = req.params;
    try{
        const startDate = parseRangeToDate(range);
        if(!startDate){ 
            return res.status(400).json({
                error: "invalid range"
        })}
        
        const sessions = await Session.find({
            userId, 
            startTime: {$gte: startDate}
        })

        // Basic aggregation
        const totalSessions = sessions.length;
        const totalFocusTime = sessions.reduce((acc, s) => acc + (s.statistics?.totalFocusTime || 0), 0);
        const totalFocusScores = sessions.reduce((acc, s) => acc + (s.statistics?.averageFocusScore || 0), 0);
        const avgFocusScore = totalSessions ? Math.round(totalFocusScores / totalSessions) : 0;

        //Generate graph data, etc
        const focusByDay: Record<string, { total: number; count: number}> = {};
        sessions.forEach(s => {
            s.focusTimeline.forEach(e => {
                const day = e.timestamp.toISOString().slice(0, 10);
                if(!focusByDay[day]) focusByDay[day] = {total: 0, count: 0};
                focusByDay[day].total += e.focusScore;
                focusByDay[day].count++;
            });
        });

        const focusGraph = Object.entries(focusByDay).map(([day, {total, count}]) => ({
            day, 
            avgFocus: Math.round(total / count),
        })).sort((a, b) => a.day.localeCompare(b.day));

        //app usage stats
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

        // Focus drops
        const focusDrops: {timestamp: Date; reason: string}[] = [];
        sessions.forEach(s => {
            s.focusTimeline.forEach(e => {
                if(e.focusScore < 50 && e.distractionDetected) {
                    focusDrops.push({ timestamp: e.timestamp, reason: "Distraction"})
                }
            });
        });

        // Prepare PDF
        const pdfBuffer = await createPDFReport({
            range, 
            totalSessions,
            totalFocusTime,
            avgFocusScore,
            focusGraph,
            appUsage: appUsageArray,
            focusDrops
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=report-${range}.pdf`);
        res.send(pdfBuffer);
    }catch(err){
        res.status(500).json({
            msg: "failed to generate report"
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
            `Total Focus Time: ${data.totalFocusTime} seconds`,
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
            doc.fontSize(10).text(`${app}: ${count}`);
        });
        doc.moveDown();

        // Focus drops
        doc.fontSize(14).text("focus Drops / Distractions", {underline: true});
        if (data.focusDrops.length === 0) {
            doc.fontSize(10).text("No significant focus drops detected.");
        } else {
            data.focusDrops.forEach(({timestamp, reason}: { timestamp: Date, reason: string}) => {
                doc.fontSize(10).text(`${timestamp.toISOString()}: ${reason}`)
            });
        }
        doc.end();
    })
}
