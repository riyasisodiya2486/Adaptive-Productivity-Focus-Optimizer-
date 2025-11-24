import { Request, Response } from "express";
import { Recommendation } from "../models/recommendations.model";
import { error, timeStamp } from "console";
import { Session } from "../models/session.model";
import mongoose from "mongoose";

export const getActiveSessionRecommendation = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    try{
        const lastestRec = await Recommendation.findOne({userId}).sort({timestamp: -1}).limit(1);
        if(!lastestRec){
            return res.status(404).json({
                msg: "no recommendation found"
            })
        }
        return res.json({
            lrecommendation: lastestRec
        })
    } catch(err) {
        return res.status(500).json({
            msg: "failed to fetch latest recommendation"
        })
    }
};

export const postRecommendationFeedback = async(req: Request, res: Response) => {
    const userId = (req as any).userId;
    const {recommedationsId, followed, userComment } = req.body;

    if(!recommedationsId){
        return res.status(400).json({
            error: "recommendationId is required"
        })
    }

    try{
        const recommedation = await Recommendation.findOne({
            _id: recommedationsId,
            userId
        })
        if(!recommedation){
            return res.status(404).json({
                error: "recommendation not found"
            })
        }

        recommedation.feedback = {
            followed: followed ?? recommedation.feedback?.followed,
            userComment: userComment ?? recommedation.feedback?.userComment,
            timestamp: new Date(),
        };

        await recommedation.save();

        if(followed) {
            const session = await Session.findById(recommedation.sessionId);
            if(session) {
                session.statistics.recommendationsFollowed = (session.statistics.recommendationsFollowed || 0) + 1;
                await session.save()
            }
        }
        res.json({
            msg: "feedback recorded successfully", 
            recommedation
        })
    }catch(err) {
         res.status(500).json({
            error: err || "Failed to record feedback"
        });
    }
}

export const getRecommendationHistory = async(req: Request, res: Response) => {
    const userId = (req as any).userId;
    try{
        console.log("Looking up recommendations for userId:", userId);
        const history = await Recommendation.find({
            userId: new mongoose.Types.ObjectId(userId)
        }).sort({timestamp: -1});
        return res.json({
            history
        })
    }catch(err) {
        res.status(500).json({ msg: "failed to fetch recommendation history" });
    }
}