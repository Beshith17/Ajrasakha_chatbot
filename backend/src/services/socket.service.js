import { Server } from 'socket.io';
import { env } from '../config/env.js';
let io = null;
export function initializeSocket(server) {
    io = new Server(server, {
        cors: {
            origin: env.clientUrl,
        },
    });
    io.on('connection', (socket) => {
        socket.on('register-role', (payload) => {
            if (payload.role === 'expert') {
                socket.join('role:expert');
            }
            if (payload.role === 'farmer' && payload.uid) {
                socket.join(`user:${payload.uid}`);
            }
        });
        socket.on('join-session', (payload) => {
            if (payload.sessionId) {
                socket.join(`session:${payload.sessionId}`);
            }
        });
    });
    return io;
}
export function emitSessionNotification(audience, payload, farmerUid) {
    if (!io) {
        return;
    }
    if (audience === 'experts') {
        io.to('role:expert').emit('notification', payload);
        return;
    }
    if (farmerUid) {
        io.to(`user:${farmerUid}`).emit('notification', payload);
    }
}
export function emitSessionUpdate(sessionId, payload, farmerUid) {
    if (!io) {
        return;
    }
    io.to(`session:${sessionId}`).emit('session:update', payload);
    if (farmerUid) {
        io.to(`user:${farmerUid}`).emit('session:update', payload);
    }
}
