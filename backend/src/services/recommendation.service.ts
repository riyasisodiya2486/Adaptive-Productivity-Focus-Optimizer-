import axios from "axios";
import dotenv from "dotenv";
import { Session } from "../models/session.model";
dotenv.config();

const HUGGINGFACE_API_KEY = process.env.HF_API_TOKEN;

if (!HUGGINGFACE_API_KEY) {
    throw new Error("HF_API_TOKEN environment variable is not set");
}

export async function generateAdaptiveRecommendation(
    userId: string,
    session: any,
    lastRecommendation: string = ""
): Promise<string> {
    try {
        const focusData = session.focusTimeline.slice(-3);
        const avgFocus = session.statistics?.averageFocusScore || 0;
        const lastReasons = focusData.flatMap((entry: any) => entry.distractionDetected ? [entry.distractionDetected] : []);
        const sessionDuration = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 60000);
        const lastRecs = (session.recommendation ?? []).slice(-3).map((r: any) => r.text);

        const messages = [
            {
                role: "system",
                content: "You are a productivity coach giving short, actionable suggestions."
            },
            {
                role: "user",
                content: `The user's recent work session shows signs of low focus.
                        User ID: ${userId}
                        Average focus score: ${avgFocus}%
                        Session duration: ${sessionDuration} minutes
                        Recent distraction reasons: ${lastReasons.join(", ") || "none recorded"}
                        Last recommendations given: ${lastRecommendation || lastRecs.join(", ") || "none"}
                        Work context: ${session.category || "general"} task
                        Avoid repeating the last recommendation unless context demands it.
                        Please provide a 1-line practical suggestion to improve focus or wellbeing.
                        Only respond with the suggestion, no extra commentary.
                `.trim()
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

        // Store recommendation for personalization
        if (!Array.isArray(session.recommendation)) session.recommendation = [];
        session.recommendation.push({
            timestamp: new Date(),
            text: suggestion,
        });
        await session.save();

        return suggestion;
    } catch (err) {
        console.error("[Recommender] Error generating adaptive recommendation:", err);
        return "Take a short break and refocus your mind.";
    }
}
