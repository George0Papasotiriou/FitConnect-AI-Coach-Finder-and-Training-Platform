/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 as uuid } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

['avatars', 'documents', 'chat'].forEach(dir => {
  const full = path.join(uploadsDir, dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

function createStorage(subDir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(uploadsDir, subDir)),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuid()}${ext}`);
    }
  });
}

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|mp3|wav|ogg|mp4)$/i;
  if (allowed.test(path.extname(file.originalname))) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'));
  }
};

export const uploadAvatar = multer({ storage: createStorage('avatars'), fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
export const uploadDocument = multer({ storage: createStorage('documents'), fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });
export const uploadChatFile = multer({ storage: createStorage('chat'), fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
