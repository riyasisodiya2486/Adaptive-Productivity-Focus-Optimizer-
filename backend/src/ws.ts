import WebSocket, { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Session } from "./models/session.model";
import { Activity } from "./models/activity.model";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;

export function setupWebSocket(server: any) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket & { context?: any }) => {
    ws.context = {};

    ws.on("message", async (message: string) => {
      try {
        const data = JSON.parse(message);

        if (data.type === "auth") {
          const token = data.token;
          if (!token) {
            ws.close(1008, "Unauthorized");
            return;
          }
          const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
          const session = await Session.findOne({ userId: payload.userId, status: "active" });

          if (!session) {
            ws.close(1008, "No active session found");
            return;
          }

          ws.context = { userId: payload.userId, sessionId: session._id.toString() };
          return;
        }

        if (!ws.context?.userId || !ws.context?.sessionId) {
          ws.close(1008, "Not authorized");
          return;
        }

        const activityData = {
          userId: ws.context.userId,
          sessionId: ws.context.sessionId,
          timestamp: new Date(),
          activityData: data.activityData || {},
          activeApp: data.activeApp || {},
          browserActivity: data.eyeTracking || {},
          focusScore: data.focusScore,
          distractionDetected: data.distractionDetected || [],
        };

        const activity = new Activity(activityData);
        await activity.save();
        console.log("Activity saved:", activity._id);
      } catch (err) {
        console.log("Error processing message:", err);
        ws.close(1011, "Internal server error");
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });
}
