/**
 * Vercel API 路由 - 获取和更新分享会话
 * 支持 GET 和 PUT 方法
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// 简单的内存存储（生产环境建议使用数据库）
const sessions = new Map<string, any>();

export default function handler(req: VercelRequest, res: VercelResponse) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { sessionId } = req.query;

  if (!sessionId || typeof sessionId !== 'string') {
    res.status(400).json({ error: '会话ID无效' });
    return;
  }

  try {
    if (req.method === 'GET') {
      // 获取会话
      const session = sessions.get(sessionId);
      
      if (!session) {
        res.status(404).json({ error: '会话不存在' });
        return;
      }

      // 检查会话是否过期（24小时）
      const now = Date.now();
      const sessionAge = now - session.createdAt;
      const maxAge = 24 * 60 * 60 * 1000; // 24小时

      if (sessionAge > maxAge) {
        sessions.delete(sessionId);
        res.status(404).json({ error: '会话已过期' });
        return;
      }

      res.status(200).json(session);
    } 
    else if (req.method === 'PUT') {
      // 更新会话
      const updatedSession = req.body;
      
      if (!sessions.has(sessionId)) {
        res.status(404).json({ error: '会话不存在' });
        return;
      }

      // 更新会话数据
      sessions.set(sessionId, {
        ...updatedSession,
        lastUpdate: Date.now()
      });

      console.log(`[API] Updated share session: ${sessionId}`);
      
      res.status(200).json({ 
        success: true,
        message: '会话更新成功'
      });
    } 
    else {
      res.status(405).json({ error: '方法不允许' });
    }
  } catch (error) {
    console.error(`[API] Error handling session ${sessionId}:`, error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}