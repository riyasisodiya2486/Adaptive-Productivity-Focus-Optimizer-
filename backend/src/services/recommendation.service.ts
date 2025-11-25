import axios from "axios";
import dotenv from "dotenv";
import { Recommendation } from "../models/recommendations.model";
dotenv.config();

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

if (!HUGGINGFACE_API_KEY) {
    throw new Error("HF_API_TOKEN environment variable is not set");
}

function cleanAndTrimTip(text: string): string {
    if (!text) return "";
    // Remove <think> blocks and explanation
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    // Remove meta lines/extra context
    text = text.replace(/Based on.*?try this:/gi, '');
    // Take only the first quote-delimited string, or first sentence if not quoted
    let m = text.match(/["“”]([^"“”]{8,})["“”]/);
    if (m) text = m[1];
    // Remove markdown, asterisks, emojis, etc.
    text = text.replace(/\*\*/g, '').replace(/[✨🎯💡⚡🔥🚀💪🌟⭐]+/g, '');
    text = text.replace(/[`'“”‘’]/g, '').trim();
    // Only first sentence, max 160 chars, fallback if too short
    text = text.split(".")[0].trim() + ".";
    if (text.length > 160) text = text.slice(0, 157) + '...';
    if (!text || text.split(' ').length < 3) text = "Take 2 minutes for a single focused task, even if distracted, to build momentum.";
    return text;
}

export async function generateAdaptiveRecommendation(
    userId: string,
    session: any,
    lastRecommendation: string = ""
): Promise<{
    recommendation: string,
    context: { focusScore: number, distractions: boolean | string[], [key: string]: any }
}> {
    try {
        const now = new Date();
        const sessionStart = new Date(session.startTime);
        const focusData = session.focusTimeline.slice(-3);
        const avgFocus = session.statistics?.averageFocusScore || 0;
        const lastReasons = focusData.flatMap((entry: any) => entry.distractionDetected ? [entry.distractionDetected] : []);
        const recentApps = session.statistics?.recentApps ?? [];
        const lastRecs = (session.recommendations ?? []).slice(-3).map((r: any) => r.text);
        const lastAdvice = lastRecs.slice(-1)[0] || "none";

        const contextSummary = `
Session start: ${sessionStart.toLocaleTimeString()}
Current site/app(s): ${recentApps.join(", ") || "unknown"}
Average focus score: ${avgFocus}%
Recent distractions: ${lastReasons.join(", ") || "none"}
Last advice: "${lastAdvice}"
Current mode: ${session.category || "general"}
`.trim();

        const messages = [
            {
                role: "system",
                content: "You are a productivity coach. Only output a SINGLE direct, actionable tip for the user, no explanation, no meta-comments. Exactly one sentence, plain text, under 30 words, nothing else."
            },
            {
                role: "user",
                content: `Here is my focus context:\n${contextSummary}\n\nTip:`
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
        
        let suggestion = response.data?.choices?.[0]?.message?.content?.trim() || "";
        suggestion = cleanAndTrimTip(suggestion);

        const priority: 'low'| 'medium' | 'high'= 
            avgFocus < 30 ? 'high': avgFocus < 50 ? 'medium' : 'low';

        const type: 'break' | 'work' | 'study' = 
            session.type === "break" ? "break" : "work";   

        // For context: if any distractions found, flag as true
        const hadDistractions = lastReasons.length > 0;

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

        if (!Array.isArray(session.recommendations)) session.recommendations = [];
            session.recommendations.push(newRec._id);
        await session.save();

        // Return BOTH the tip and minimal context!
        return {
            recommendation: suggestion,
            context: {
                focusScore: avgFocus,
                distractions: hadDistractions,
            }
        };
    } catch (err) {
        console.error("[Recommender] Error generating adaptive recommendation:", err);
        return {
            recommendation: "Take 2 minutes for a single focused task, even if distracted, to build momentum.",
            context: { focusScore: session?.statistics?.averageFocusScore || 0, distractions: false }
        };
    }
}
