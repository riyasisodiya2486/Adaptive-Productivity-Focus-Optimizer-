import axios from "axios";
import { Session } from "../models/session.model";


const MODEL_NAME =  "gpt2";
const HUGGINGFACE_API_KEY = process.env.HF_API_TOKEN;
const HUGGINGFACE_API_URL = `https://api-inference.huggingface.co/models/${MODEL_NAME}`;


export async function generateAdaptiveRecommendation(
    userId: string,
    session: any,
    lastRecommendation: string = ""
): Promise<string> {
    try{
        const focusData = session.focusTimeline.slice(-3);
        const avgFocus = session.statistics?.averageFocusScore || 0;
        //@ts-ignore
        const lastReasons = focusData.flatMap(entry => entry.distractionDetected ?? []);
        const sessionDuration = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 60000);
        //@ts-ignore
        const lastRecs = (session.recommendation ?? []).slice(-3).map(r => r.text);

        const prompt = `
        You are a productivity coach.
        The user's recent work session shows signs of low focus.

        - Average focus score: ${avgFocus}%
        - Session Duration: ${sessionDuration} minutes
        - Recent Distraction Reasons: ${lastReasons.join(", ") || "none recorded"}
        - work context: ${session.category || "general"} task
        - User ID: ${userId}
        - last Recommendation Given: "${lastRecs || 'none'}"

        Avoid repeating the last recommendation unless context demands it.
        Give a **1-line short, practical suggestion** to improve focus or wellbeing.
        only return the suggestion, no extra commentary.
        `;

        const response = await axios.post(
            HUGGINGFACE_API_URL,
            {inputs: prompt},
            {
                headers: {Authorization: `Bearer ${HUGGINGFACE_API_KEY}`},
            }
        );
        
        const rawText = response.data?.[0]?.generated_text || " ";
        const text = rawText.replace(prompt, "").trim();
        
        //Store recommendation for personalization
        if(!Array.isArray(session.recommendation)) session.recommendation = [];
        session.recommendation.push({
            timestamp: new Date(),
            text,
        })
        await session.save();

        return text || `take a short break and re-focus your mind. ${lastReasons}`
    } catch(err){
        console.error("[Recommender] Error generating adaptive recommendation:", err);
        return "Take a short break and re-focus your mind.";
    }
}