import { Request, Response } from "express";
import { Gamification } from "../models/gamification.model";
import { GamificationService } from "../services/gamification.service";


export const getGamificationStats = async(req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { sessionId } = req.body;

    try{
        const stats = await GamificationService.getUserGamification(userId);
        res.json({
            stats
        })
    }catch(err){
        console.log(err)
        res.status(500).json({
            msg: "server error"
        })
    }
};

export const updateGamification = async(req: Request, res: Response) => {
    const userId = (req as any).userId;
    const {sessionId} = req.body.sessionId;
    if(!sessionId){
        return res.status(400).json({
            error: "missing sessionId in req body"
        })
    }
    try{
        const xpResult = await GamificationService.calculateAndAddXP(userId, sessionId);
        return res.json({
            xpResult
        })
    }catch (err){
        console.log(err);
        return res.status(500).json({
            msg: "server error"
        })
    }
}

export const getBadges = async(req:Request, res:Response) => {
    try{
        const userId = (req as any).userId;
        const badges = await GamificationService.getUserBadges(userId);
        res.json(badges);

    }catch(err){
        console.log(err);
        return res.status(500).json({
            msg: "server error"
        })
    }
}

