import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import db from '../db.js';

type UserStatus = 'available' | 'in-call' | 'offline';

const onlineUsers = new Map<string, string>(); // userId -> socketId
const userStatuses = new Map<string, UserStatus>(); // userId -> status

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
    userStatuses.set(userId, 'available');

    // Broadcast new user online status
    io.emit('user_online', { userId });
    io.emit('user_status_change', { userId, status: 'available' });

    try {
      const conversations = await db.all('SELECT conversation_id FROM conversation_participants WHERE user_id = ?', userId);
      conversations.forEach((c: any) => socket.join(`conv:${c.conversationId}`));
    } catch (err) {
      console.error('Socket join conversations error:', err);
    }

    // Send all online users to the connecting client
    socket.on('get_online_users', () => {
      const statuses: Record<string, UserStatus> = {};
      for (const [uid, status] of userStatuses.entries()) {
        statuses[uid] = status;
      }
      socket.emit('online_users', statuses);
    });

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

    // Call status tracking
    socket.on('join_session', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
      socket.to(`session:${sessionId}`).emit('peer_joined');
      userStatuses.set(userId, 'in-call');
      io.emit('user_status_change', { userId, status: 'in-call' });
    });

    socket.on('peer_ready', (data: { sessionId: string }) => {
      socket.to(`session:${data.sessionId}`).emit('peer_ready');
    });

    socket.on('call_declined', (data: { sessionId: string }) => {
      socket.to(`session:${data.sessionId}`).emit('call_declined');
    });

    socket.on('call_ended', (data: { sessionId: string }) => {
      socket.to(`session:${data.sessionId}`).emit('call_ended', { sessionId: data.sessionId });
      userStatuses.set(userId, 'available');
      io.emit('user_status_change', { userId, status: 'available' });
    });

    // WebRTC signaling
    socket.on('webrtc_offer', (data: { sessionId: string; signal: any }) => {
      socket.to(`session:${data.sessionId}`).emit('webrtc_offer', { signal: data.signal, from: userId });
    });

    socket.on('webrtc_answer', (data: { sessionId: string; signal: any }) => {
      socket.to(`session:${data.sessionId}`).emit('webrtc_answer', { signal: data.signal, from: userId });
    });

    socket.on('webrtc_ice_candidate', (data: { sessionId: string; signal: any }) => {
      socket.to(`session:${data.sessionId}`).emit('webrtc_ice_candidate', { signal: data.signal, from: userId });
    });

    socket.on('coach_match_accept', (data: { traineeId: string; trainerId: string }) => {
      const traineeSocket = onlineUsers.get(data.traineeId);
      if (traineeSocket) {
        io.to(traineeSocket).emit('match_accepted', { trainerId: data.trainerId });
      }
    });

    socket.on('incoming_call', (data: { targetUserId: string; conversationId: string; callerName: string; type: string }) => {
      const targetSocket = onlineUsers.get(data.targetUserId);
      if (targetSocket) {
        io.to(targetSocket).emit('incoming_call', {
          conversationId: data.conversationId,
          callerName: data.callerName,
          type: data.type
        });
      }
    });

    socket.on('mark_read', (data: { conversationId: string }) => {
      socket.to(`conv:${data.conversationId}`).emit('messages_read', { conversationId: data.conversationId, userId });
    });

    socket.on('notification', (data: { userId: string; notification: any }) => {
      const targetSocket = onlineUsers.get(data.userId);
      if (targetSocket) {
        io.to(targetSocket).emit('notification', data.notification);
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      userStatuses.delete(userId);
      io.emit('user_offline', { userId });
      io.emit('user_status_change', { userId, status: 'offline' });
    });
  });
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

export function getUserStatus(userId: string): UserStatus {
  return userStatuses.get(userId) || 'offline';
}

export function getOnlineUsers(): string[] {
  return Array.from(onlineUsers.keys());
}

export function getOnlineUserStatuses(): Record<string, UserStatus> {
  const statuses: Record<string, UserStatus> = {};
  for (const [uid, status] of userStatuses.entries()) {
    statuses[uid] = status;
  }
  return statuses;
}
