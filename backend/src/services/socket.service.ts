import type { Server as HttpServer } from 'http';

import { Server } from 'socket.io';

import { env } from '../config/env.js';

export interface SessionNotificationPayload {
  sessionId: string;
  sessionCode: string;
  title: string;
  preview: string;
  actorRole: 'farmer' | 'expert';
  actorName?: string;
  createdAt: string;
}

let io: Server | null = null;

export function initializeSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: env.clientUrl,
    },
  });

  io.on('connection', (socket) => {
    socket.on('register-role', (payload: { role?: 'farmer' | 'expert'; uid?: string }) => {
      if (payload.role === 'expert') {
        socket.join('role:expert');
      }

      if (payload.role === 'farmer' && payload.uid) {
        socket.join(`user:${payload.uid}`);
      }
    });

    socket.on('join-session', (payload: { sessionId?: string }) => {
      if (payload.sessionId) {
        socket.join(`session:${payload.sessionId}`);
      }
    });
  });

  return io;
}

export function emitSessionNotification(
  audience: 'experts' | 'farmer',
  payload: SessionNotificationPayload,
  farmerUid?: string,
) {
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

export function emitSessionUpdate(sessionId: string, payload: unknown, farmerUid?: string) {
  if (!io) {
    return;
  }

  io.to(`session:${sessionId}`).emit('session:update', payload);

  if (farmerUid) {
    io.to(`user:${farmerUid}`).emit('session:update', payload);
  }
}
