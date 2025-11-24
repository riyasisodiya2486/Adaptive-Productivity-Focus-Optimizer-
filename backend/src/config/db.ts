import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { DataCleanupService } from '../services/dataCleanup.service';
import { DatabaseMonitor } from '../utils/database.monitor';
import { FocusMonitor } from '../services/focusMonitor.service';
dotenv.config()

export const connectDB = async () =>{
    try{
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log("mongo db connected");

        //schedule automatic cleanup (runs daily at 2 am)
        DataCleanupService.scheduleCleanup();

        //log db health on startup
        await DatabaseMonitor.logMetrics();

        // resume focus monitoring
        await FocusMonitor.resumeAllActiveSession(5);
    }catch(err){
        console.log(err)
    }
}

export default connectDB;