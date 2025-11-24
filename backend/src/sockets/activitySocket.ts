import { Server, Socket } from 'socket.io';
import { Activity } from '../models/activity.model';
import { verifyToken } from '../utils/auth';

export const setupActivitySocket = (io: Server) => {
    io.on('connection', async (socket: Socket) => {
        const token = socket.handshake.auth.token;
        
        try {
            const user = await verifyToken(token);
            console.log(`User ${user._id} connected for activity tracking`);
            
            socket.on('activity:update', async (data) => {
                try {
                    const activity = new Activity(data);
                    await activity.save();
                    
                    // Optionally emit back confirmation
                    socket.emit('activity:saved', { 
                        activityId: activity._id 
                    });
                } catch (error) {
                    console.error('Error saving activity:', error);
                    socket.emit('activity:error', { 
                        error: error.message 
                    });
                }
            });
            
            socket.on('disconnect', () => {
                console.log(`User ${user._id} disconnected`);
            });
            
        } catch (error) {
            console.error('Socket authentication failed:', error);
            socket.disconnect();
        }
    });
};