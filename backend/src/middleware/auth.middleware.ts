import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload{
    userId: string;
}

const JWT_SECRET = process.env.JWT_SECRET as string;

export const authenticateToken = (req:Request, res:Response, next:NextFunction) =>{
    try{
        const authHeader = req.headers['authorization'];
        
        if(!authHeader?.startsWith("Bearer ")){
            return res.status(403).json({
                msg: "unathorized access"
            })
        }
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET) as {userId:string, username: string}
        if(!decoded){
            return res.status(401).json({
                    msg: "Invalid token"
                });
        }
        (req as any).userId = decoded.userId;
        (req as any).username = decoded.username;
        
        next();
    }catch(err){
        return res.status(403).json({
            message: 'Invalid or expired token',
        });
    }
}