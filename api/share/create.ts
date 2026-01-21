/**
 * Vercel API 路由 - 创建分享会话
 * 适用于中国用户的实时分享功能
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// 简单的内存存储（生产环境建议使用数据库）
const sessions = new Map<string, any>();

export default function handler(req: VercelRequest, res: VercelResponse) {
  // 设置 CORS 头，支持跨域
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: '方法不允许' });
    return;
  }

  try {
    const session = req.body;
    
    // 验证会话数据
    if (!session.id || !session.hostId || !session.canvasState) {
      res.status(400).json({ error: '会话数据不完整' });
      return;
    }

    // 保存会话
    sessions.set(session.id, {
      ...session,
      createdAt: Date.now(),
      lastUpdate: Date.now()
    });

    console.log(`[API] Created share session: ${session.id}`);
    
    res.status(200).json({ 
      success: true, 
      sessionId: session.id,
      message: '分享会话创建成功'
    });
  } catch (error) {
    console.error('[API] Error creating session:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}