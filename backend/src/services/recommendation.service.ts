import axios from "axios";
import dotenv from "dotenv";
import { Recommendation } from "../models/recommendations.model";
dotenv.config();

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

if (!HUGGINGFACE_API_KEY) {
    throw new Error("HF_API_TOKEN environment variable is not set");
}

export async function generateAdaptiveRecommendation(
    userId: string,
    session: any,
    lastRecommendation: string = ""
): Promise<string> {
    try {
        const now = new Date();
        const sessionStart = new Date(session.startTime);
        const minutesSinceStart = Math.floor((now.getTime() - sessionStart.getTime()) / 60000);
        const focusData = session.focusTimeline.slice(-3);
        const avgFocus = session.statistics?.averageFocusScore || 0;
        const lastReasons = focusData.flatMap((entry: any) => entry.distractionDetected ? [entry.distractionDetected] : []);
        const recentApps = session.statistics?.recentApps ?? [];
        const lastRecs = (session.recommendations ?? []).slice(-3).map((r: any) => r.text);
        const lastAdvice = lastRecs.slice(-1)[0] || "none";

        const contextSummary = `
                                Session start: ${sessionStart.toLocaleTimeString()} (${minutesSinceStart} min ago)
                                Current site/app(s): ${recentApps.join(", ") || "unknown"}
                                Average focus score: ${avgFocus}%
                                Recent distractions: ${lastReasons.join(", ") || "none"}
                                Last advice: "${lastAdvice}"
                                Current mode: ${session.category || "general"}
                                Provide a new, timely tip or suggestion (1 sentence), different from previous advice, customized for this context.
                                `.trim();

        const messages = [
            {
                role: "system",
                content: "You are a productivity coach generating personalized, evolving suggestions with each prompt."
            },
            {
                role: "user",
                content: contextSummary
            }
        ];

        const response = await axios.post(
            "https://router.huggingface.co/v1/chat/completions",
            {
                model: "deepseek-ai/DeepSeek-R1:novita",
                messages
            },
            {
                headers: {
                    Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );
        
        const suggestion = response.data?.choices?.[0]?.message?.content?.trim() || "Take a short break and refocus your mind.";

        const priority: 'low'| 'medium' | 'high'= 
         avgFocus < 30 ? 'high': avgFocus < 50 ? 'medium' : 'low';

        const type: 'break' | 'work' | 'study' = 
            session.type === "break" ? "break" : "work";   

        const newRec = new Recommendation({
            userId,
            sessionId: session._id,
            timestamp: new Date(),
            prompt: contextSummary,
            type,
            priority,
            recommendation: suggestion,
            context: {
                focusScore: avgFocus,
                sessionDuration: session.duration,
                recentActivity: recentApps.join(", "),
                distractions: lastReasons
            }
        });
        await newRec.save();

        // link recommendation to session refrence array and save session
        if (!Array.isArray(session.recommendations)) session.recommendations = [];
            session.recommendations.push(newRec._id);
        await session.save();

        return suggestion;
    } catch (err) {
        console.error("[Recommender] Error generating adaptive recommendation:", err);
        return "Take a short break and refocus your mind.";
    }
}
