import {Request, Response} from "express";
import { User } from "../models/user.model";

export const getProfile = async (req:Request, res: Response)=> {
    try{
        const userId = (req as any).userId;
        const user = await User.findById(userId).select('-password');
        if(!user){
            return res.status(404).json({
                msg: "user not found"
            });
        }
        return res.json({
            user
        })
    }catch(err){
        console.log(err)
        res.status(500).json({
            msg: "server error"
        })
    }
}

export const updatePreferences = async (req: Request, res:Response)=> {
    try{
        const userId = (req as any).userId;
        const preferences = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {preferences},
            {new: true} 
            ).select("-password");
            res.json({
                preferences: updatedUser?.preferences
            });
    }catch(err){
        console.log(err)
        res.status(500).json({
            msg: "server error"
        })
    }
}

export const addToWhitelist = async (req: Request, res: Response) => {
  try {
    const { type, value } = req.body; 
    const userId = (req as any).userId;
    const field = "whitelist" + (type === "app" ? "Apps" : "Urls");
    await User.findByIdAndUpdate(userId, { $addToSet: { [field]: value } });
    res.json({ msg: `${value} added to ${field}` });

  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "server error" });
  }
};

export const removeFromWhitelist = async (req: Request, res: Response) => {
  try {
    const { type } = req.body;
    const { value } = req.params;
    const userId = (req as any).userId;
    const field = "whitelist" + (type === "app" ? "Apps" : "Urls");
    await User.findByIdAndUpdate(userId, { $pull: { [field]: value } });
    res.json({ msg: `${value} removed from ${field}` });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "server error" });
  }
};

export const addToBlacklist = async (req: Request, res: Response) => {
  try {
    const { type, value } = req.body;
    const userId = (req as any).userId;
    const field = "blacklist" + (type === "app" ? "Apps" : "Urls");
    await User.findByIdAndUpdate(userId, { $addToSet: { [field]: value } });
    res.json({ msg: `${value} added to ${field}` });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "server error" });
  }
};

export const removeFromBlacklist = async (req: Request, res: Response) => {
  try {
    const { type } = req.body;
    const { value } = req.params;
    const userId = (req as any).userId;
    const field = "blacklist" + (type === "app" ? "Apps" : "Urls");
    await User.findByIdAndUpdate(userId, { $pull: { [field]: value } });
    res.json({ msg: `${value} removed from ${field}` });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "server error" });
  }
};

export const resetListDefaults = async(req:Request, res:Response) => {
    try{
        const userId = (req as any).userId;
        const {listType} = req.body;
        const defaultApps = (User.schema.path(listType + "Apps")as any).defaultValue();
        const defaultUrls = (User.schema.path(listType + "Urls")as any).defaultValue();

        const updates: any = {};
        updates[listType + "Apps"] = defaultApps;
        updates[listType + "Urls"] = defaultUrls;

        await User.findByIdAndUpdate(userId, updates);
        res.json({
            msg: `${listType} lists reset to default`
        });
    }catch(err){
        console.log(err);
        return res.status(500).json({
            msg: "server error"
        })
    }
}