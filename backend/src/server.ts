import express from 'express';
import http from 'http';
import connectDB from './config/db';
import authRouter from './routes/auth.routes';
import userRouter from './routes/user.routes';
import activityRouter from './routes/activity.routes';
import sessionRouter from './routes/session.routes';
import gamificationRouter from './routes/gamification.route';
import analyticsRouter from './routes/analytics.routes';
import recommendationRouter from './routes/recommendation.route';
import { setupWebSocket } from './ws';
import cors from "cors";

connectDB();
const app = express();
app.use(express.json());
app.use(cors())

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/user', userRouter);
app.use("/api/v1/activities", activityRouter);
app.use("/api/v1/session", sessionRouter);
app.use("/api/v1/gamification", gamificationRouter);
app.use("/api/v1/analysis", analyticsRouter);
app.use("/api/v1/recommendations", recommendationRouter);

const server = http.createServer(app);
setupWebSocket(server);

const PORT = 5000;
server.listen(PORT, ()=>console.log(`server running on ${PORT}`))
