import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const onlineUsers = new Map<string, string>();

export function initializeSocket(io: Server) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      const user = await db.get('SELECT id, name, role FROM users WHERE id = ?', payload.id);
      if (!user) return next(new Error('User not found'));
      (socket as any).userId = user.id;
      (socket as any).userName = user.name;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = (socket as any).userId;
    onlineUsers.set(userId, socket.id);
    io.emit('user_online', { userId });

    try {
      const conversations = await db.all('SELECT conversation_id FROM conversation_participants WHERE user_id = ?', userId);
      conversations.forEach((c: any) => socket.join(`conv:${c.conversationId}`));
    } catch (err) {
      console.error('Socket join conversations error:', err);
    }

    socket.on('send_message', (data: { conversationId: string; message: any }) => {
      socket.to(`conv:${data.conversationId}`).emit('new_message', data.message);
    });

    socket.on('typing_start', (data: { conversationId: string }) => {
      socket.to(`conv:${data.conversationId}`).emit('typing_start', { conversationId: data.conversationId, userId });
    });

    socket.on('typing_stop', (data: { conversationId: string }) => {
      socket.to(`conv:${data.conversationId}`).emit('typing_stop', { conversationId: data.conversationId, userId });
    });

    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on('webrtc_offer', (data: { sessionId: string; signal: any }) => {
      socket.to(`session:${data.sessionId}`).emit('webrtc_offer', { signal: data.signal, from: userId });
    });

    socket.on('webrtc_answer', (data: { sessionId: string; signal: any }) => {
      socket.to(`session:${data.sessionId}`).emit('webrtc_answer', { signal: data.signal, from: userId });
    });

    socket.on('webrtc_ice_candidate', (data: { sessionId: string; signal: any }) => {
      socket.to(`session:${data.sessionId}`).emit('webrtc_ice_candidate', { signal: data.signal, from: userId });
    });

    socket.on('join_session', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
    });

    socket.on('call_ended', (data: { sessionId: string }) => {
      socket.to(`session:${data.sessionId}`).emit('call_ended', { sessionId: data.sessionId });
    });

    socket.on('notification', (data: { userId: string; notification: any }) => {
      const targetSocket = onlineUsers.get(data.userId);
      if (targetSocket) {
        io.to(targetSocket).emit('notification', data.notification);
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('user_offline', { userId });
    });
  });
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

export function getOnlineUsers(): string[] {
  return Array.from(onlineUsers.keys());
}
