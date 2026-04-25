import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { uploadChatFile } from '../middleware/upload.js';

const router = Router();

router.get('/conversations', authenticate, async (req: AuthRequest, res) => {
  try {
    const conversations = await db.all(`
      SELECT c.*, cp2.user_id as other_user_id FROM conversations c
      JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = ?
      JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id != ?
      ORDER BY c.updated_at DESC
    `, req.user!.id, req.user!.id);

    const result = await Promise.all(conversations.map(async conv => {
      const participants = await db.all(`
        SELECT u.id, u.name, u.avatar, u.role FROM conversation_participants cp
        JOIN users u ON cp.user_id = u.id WHERE cp.conversation_id = ?
      `, conv.id);

      const lastMessage = await db.get('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1', conv.id);
      const unreadRow = await db.get('SELECT COUNT(*) as c FROM messages WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL', conv.id, req.user!.id);

      return {
        id: conv.id,
        participants: participants.map((p: any) => ({ ...p, isOnline: false })),
        lastMessage: lastMessage ? { ...lastMessage, senderName: participants.find((p: any) => p.id === lastMessage.senderId)?.name } : undefined,
        unreadCount: parseInt(unreadRow?.c || 0),
        updatedAt: conv.updatedAt
      };
    }));

    res.json(result);
  } catch (err) {
    console.error('Conversations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/conversations/:id/messages', authenticate, async (req: AuthRequest, res) => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const messages = await db.all(`
      SELECT m.*, u.name as sender_name, u.avatar as sender_avatar FROM messages m
      JOIN users u ON m.sender_id = u.id WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC LIMIT ? OFFSET ?
    `, req.params.id, parseInt(limit as string), offset);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/conversations/:id/messages', authenticate, async (req: AuthRequest, res) => {
  try {
    const { content, type = 'text' } = req.body;
    if (!content) return res.status(400).json({ message: 'Content required' });

    const id = uuid();
    await db.run('INSERT INTO messages (id, conversation_id, sender_id, content, type) VALUES (?, ?, ?, ?, ?)', id, req.params.id, req.user!.id, content, type);
    await db.run('UPDATE conversations SET updated_at = NOW() WHERE id = ?', req.params.id);

    const message = await db.get('SELECT m.*, u.name as sender_name, u.avatar as sender_avatar FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?', id);
    res.json(message);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/conversations/:id/files', authenticate, uploadChatFile.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const id = uuid();
    const fileUrl = `/uploads/chat/${req.file.filename}`;
    const type = req.file.mimetype.startsWith('image/') ? 'image' : 'file';

    await db.run('INSERT INTO messages (id, conversation_id, sender_id, content, type, file_url) VALUES (?, ?, ?, ?, ?, ?)', id, req.params.id, req.user!.id, req.file.originalname, type, fileUrl);
    await db.run('UPDATE conversations SET updated_at = NOW() WHERE id = ?', req.params.id);

    const message = await db.get('SELECT m.*, u.name as sender_name, u.avatar as sender_avatar FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?', id);
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/conversations/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    await db.run('UPDATE messages SET read_at = NOW() WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL', req.params.id, req.user!.id);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/conversations', authenticate, async (req: AuthRequest, res) => {
  try {
    const { participantId } = req.body;
    if (!participantId) return res.status(400).json({ message: 'Participant required' });

    const existing = await db.get(`
      SELECT c.id FROM conversations c
      JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = ?
      JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = ?
    `, req.user!.id, participantId);

    if (existing) return res.json({ id: existing.id });

    const convId = uuid();
    await db.run('INSERT INTO conversations (id) VALUES (?)', convId);
    await db.run('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)', convId, req.user!.id);
    await db.run('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)', convId, participantId);

    res.json({ id: convId });
  } catch (err) {
    console.error('Create conversation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
