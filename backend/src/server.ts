import express from 'express';
import connectDB from './config/db';
import authRouter from './routes/auth.routes';
import userRouter from './routes/user.routes';
import activityRouter from './routes/activity.routes';
import sessionRouter from './routes/session.routes';
import gamificationRouter from './routes/gamification.route';
import analyticsRouter from './routes/analytics.routes';

connectDB();
const app = express();
app.use(express.json());

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/user', userRouter);
app.use("/api/v1/activities", activityRouter);
app.use("/api/v1/session", sessionRouter);
app.use("/api/v1/gamification", gamificationRouter);
app.use("/api/v1/analysis", analyticsRouter);

app.listen(5000, ()=>console.log(`server running on 5000`))
