import { Request, Response } from "express";
import bcrypt from "bcrypt" 
import jwt from "jsonwebtoken"
import { LoginSchema, RegisterSchema } from "../schemas/user.schema";
import { User } from "../models/user.model";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;

export const register = async (req:Request, res:Response) => {
    const parsePayload = RegisterSchema.safeParse(req.body);
    if(!parsePayload.success){
        return res.status(403).json({
            msg: "invalid inputs"
        })
    }
    
    try{
        const existingUser = await User.findOne({
            email: parsePayload.data.email
        })

        if(existingUser){
            return res.status(409).json({
                msg: "user already exist with email"
            })
        }
        await User.create({
            name: parsePayload.data.name,
            email: parsePayload.data.email,
            password: await bcrypt.hash(parsePayload.data.password, 10)
        })
        
        return res.json({
            msg:"account created successfully"
        })
    }catch(err){
        console.error("Error in register:", err);
        return res.status(500).json({
            msg: "Internal Server Error",
        })
    }
}

export const login = async (req:Request, res:Response) =>{
    const parsePayload = LoginSchema.safeParse(req.body);
    if(!parsePayload.success){
        return res.status(403).json({
            msg: "invalid inputs"
        })
    }
     
    try{
        const user = await User.findOne({
            email: parsePayload.data.email
        })
        if(!user){
            return res.json({
                msg: "invalid password or email"
            })
        }
        const isMatchedPassword = await bcrypt.compare(parsePayload.data.password, user.password);
        if(!isMatchedPassword){
            return res.json({
                msg: "invalid password or username"
            })
        }

        const token = jwt.sign({userId: user._id, username: user.name}, JWT_SECRET, {expiresIn: '7d'});
        return res.json({
            msg: "logged in successfully",
            token,
        })
    }catch(err){
        console.error("Error in login:", err);
        return res.status(500).json({
            msg: "Internal Server Error",
        })
    }
}

export const getProfile = async (req:Request, res:Response) =>{
    const userId = (req as any).userId;
    try{
        const user = await User.findById((userId)).select('-password');
        if(!user){
            return res.status(404).json({
                msg: "User not found"
            });
        }

        return res.json({
            user
        })
    }catch(err){
        console.error("Error in login:", err);
        return res.status(500).json({
            msg: "Internal Server Error",
        })
    }
}

export const update = async(req:Request, res:Response)=> {
    const userId = (req as any).userId;
    try{
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {name},
            {new: true}
        ).select('-password');

        if(!updatedUser){
            return res.status(404).json({
                msg: "user not found"
            });
        }
        
        res.json({
            message: 'Profile updated successfully',
            user: updatedUser,
        })
    }catch(err){
        console.error("Error in login:", err);
        return res.status(500).json({
            msg: "Internal Server Error",
        })
    } 
}