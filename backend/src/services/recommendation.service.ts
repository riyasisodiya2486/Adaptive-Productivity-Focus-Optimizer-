import axios from "axios";
import dotenv from "dotenv";
import { Recommendation } from "../models/recommendations.model";

// Load environment variables FIRST
dotenv.config();

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Validate API key exists
if (!HUGGINGFACE_API_KEY || HUGGINGFACE_API_KEY.trim() === "") {
    console.error("❌ [Recommender] HUGGINGFACE_API_KEY is not set!");
    console.error("   Add HUGGINGFACE_API_KEY=your_key to .env file");
}

function cleanAndTrimTip(text: string): string {
    if (!text) return "";
    
    console.log("[Recommender] 🔧 Raw response:", text.substring(0, 100));
    
    // Remove <think> blocks and explanation
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    // Remove meta lines/extra context
    text = text.replace(/Based on.*?try this:/gi, '');
    // Take only the first quote-delimited string, or first sentence if not quoted
    let m = text.match(/["""]([^"""]{8,})["""]/);
    if (m) text = m[1];
    // Remove markdown, asterisks, emojis, etc.
    text = text.replace(/\*\*/g, '').replace(/[✨🎯💡⚡🔥🚀💪🌟⭐]+/g, '');
    text = text.replace(/[`'""'']/g, '').trim();
    // Only first sentence, max 160 chars
    text = text.split(".")[0].trim() + ".";
    if (text.length > 160) text = text.slice(0, 157) + '...';
    if (!text || text.split(' ').length < 3) text = "Take 2 minutes for a single focused task, even if distracted, to build momentum.";
    
    console.log("[Recommender] ✅ Cleaned response:", text);
    return text;
}

export async function generateAdaptiveRecommendation(
    userId: string | undefined,
    session: any,
    lastRecommendation: string = ""
): Promise<{
    recommendation: string,
    context: { focusScore: number, distractions: boolean | string[], [key: string]: any }
}> {
    try {
        console.log("\n[Recommender] 🚀 Starting recommendation generation");
        console.log("[Recommender] 📊 Input params:", {
            userId: userId ? userId.substring(0, 10) + "..." : "undefined",
            sessionId: session?._id ? session._id.toString().substring(0, 10) + "..." : "undefined",
            hasStartTime: !!session?.startTime,
            hasFocusTimeline: !!session?.focusTimeline,
            hasStatistics: !!session?.statistics
        });

        // Validate inputs
        if (!userId) {
            console.warn("[Recommender] ⚠️ userId is undefined");
        }
        if (!session) {
            throw new Error("Session object is undefined or null");
        }
        if (!session._id) {
            console.warn("[Recommender] ⚠️ session._id is missing");
        }

        // Validate API key
        if (!HUGGINGFACE_API_KEY || HUGGINGFACE_API_KEY.trim() === "") {
            throw new Error("HUGGINGFACE_API_KEY is not configured in .env");
        }

        const now = new Date();
        const sessionStart = new Date(session.startTime || Date.now());
        const sessionDurationMinutes = Math.floor((now.getTime() - sessionStart.getTime()) / 60000);

        // Extract focus timeline - safely handle different data structures
        const focusData = (session.focusTimeline && Array.isArray(session.focusTimeline)) 
            ? session.focusTimeline.slice(-3) 
            : [];
        
        const avgFocus = session.statistics?.averageFocusScore ?? 0;
        
        // Extract distraction reasons - handle both string and array formats
        const lastReasons = focusData.flatMap((entry: any) => {
            if (entry.distractionDetected) {
                if (Array.isArray(entry.distractionDetected)) {
                    return entry.distractionDetected;
                } else if (typeof entry.distractionDetected === 'string') {
                    return [entry.distractionDetected];
                }
            }
            return [];
        });
        
        const recentApps = (session.statistics?.recentApps && Array.isArray(session.statistics.recentApps))
            ? session.statistics.recentApps 
            : [];
        
        const lastRecs = (session.recommendations && Array.isArray(session.recommendations))
            ? session.recommendations.slice(-3).map((r: any) => r.text || r.recommendation || "")
            : [];
        
        const lastAdvice = lastRecs.length > 0 ? lastRecs[lastRecs.length - 1] : "none";
        const userCategory = session.category || session.type || "general";

        console.log("[Recommender] 📈 Extracted data:", {
            avgFocus,
            sessionDurationMinutes,
            focusTimelineEntries: focusData.length,
            distractionReasons: lastReasons.length,
            recentApps: recentApps.length,
            userCategory
        });

        const contextSummary = `Session start: ${sessionStart.toLocaleTimeString()}
Current site/app(s): ${recentApps.join(", ") || "unknown"}
Average focus score: ${avgFocus}%
Session duration: ${sessionDurationMinutes} minutes
Recent distractions: ${lastReasons.join(", ") || "none"}
Last advice: "${lastAdvice}"
Current mode: ${userCategory}`;

        console.log("[Recommender] 📝 Context summary:\n", contextSummary);

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

        console.log("[Recommender] 🌐 Calling Hugging Face API...");
        console.log("[Recommender] API Endpoint: https://router.huggingface.co/v1/chat/completions");
        console.log("[Recommender] Model: deepseek-ai/DeepSeek-R1:novita");

        const response = await axios.post(
            "https://router.huggingface.co/v1/chat/completions",
            {
                model: "deepseek-ai/DeepSeek-R1:novita",
                messages,
                max_tokens: 300,
                temperature: 0.7
            },
            {
                headers: {
                    Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
                    "Content-Type": "application/json"
                },
                timeout: 30000  // 30 second timeout
            }
        );

        console.log("[Recommender] ✅ API response received");
        console.log("[Recommender] 📦 Response status:", response.status);

        if (!response.data?.choices?.[0]?.message?.content) {
            console.error("[Recommender] ❌ Invalid response structure:", response.data);
            throw new Error("Invalid API response structure");
        }

        let suggestion = response.data.choices[0].message.content.trim();
        console.log("[Recommender] 📄 Raw suggestion:", suggestion);
        
        suggestion = cleanAndTrimTip(suggestion);

        const priority: 'low' | 'medium' | 'high' = 
            avgFocus < 30 ? 'high' : avgFocus < 50 ? 'medium' : 'low';

        const type: 'break' | 'work' | 'study' = 
            session.type === "break" ? "break" : "work";

        const hadDistractions = lastReasons.length > 0;

        console.log("[Recommender] 💾 Saving recommendation to database");

        const newRec = new Recommendation({
            userId: userId || "unknown",
            sessionId: session._id,
            timestamp: new Date(),
            prompt: contextSummary,
            type,
            priority,
            recommendation: suggestion,
            context: {
                focusScore: avgFocus,
                sessionDuration: session.duration || sessionDurationMinutes,
                recentActivity: recentApps.join(", "),
                distractions: lastReasons
            }
        });

        await newRec.save();
        console.log("[Recommender] ✅ Recommendation saved:", newRec._id);

        // Update session recommendations
        if (!Array.isArray(session.recommendations)) {
            session.recommendations = [];
        }
        session.recommendations.push(newRec._id);
        await session.save();
        console.log("[Recommender] ✅ Session updated with recommendation");

        console.log("[Recommender] 🎉 Successfully generated recommendation\n");

        return {
            recommendation: suggestion,
            context: {
                focusScore: avgFocus,
                distractions: hadDistractions,
                reason: lastReasons.join(", ") || "none"
            }
        };

    } catch (err: any) {
        console.error("\n[Recommender] ❌ Error generating recommendation");
        console.error("[Recommender] Error type:", err.code || err.name);
        console.error("[Recommender] Error message:", err.message);
        
        if (err.response) {
            console.error("[Recommender] API Response status:", err.response.status);
            console.error("[Recommender] API Response data:", err.response.data);
        }
        
        if (err.code === 'ECONNABORTED') {
            console.error("[Recommender] ⏱️ Request timeout - API took too long to respond");
        }
        
        if (err.code === 'ERR_INVALID_URL') {
            console.error("[Recommender] 🔗 Invalid API URL");
        }

        if (err.message.includes("401") || err.message.includes("Unauthorized")) {
            console.error("[Recommender] 🔑 Invalid API key - check HUGGINGFACE_API_KEY");
        }

        console.error("[Recommender] Stack:", err.stack);

        // Return safe fallback
        console.log("[Recommender] 🔄 Returning fallback recommendation\n");
        return {
            recommendation: "Take 2 minutes for a single focused task, even if distracted, to build momentum.",
            context: {
                focusScore: session?.statistics?.averageFocusScore || 0,
                distractions: false,
                error: err.message
            }
        };
    }
}