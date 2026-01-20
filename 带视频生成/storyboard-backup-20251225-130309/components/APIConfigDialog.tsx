import React, { useState } from 'react';
import VideoService from '../videoService';

interface APIConfigDialogProps {
  onConfigured: (config: { baseUrl: string; apiKey: string }) => void;
  isOpen: boolean;
}

export default function APIConfigDialog({ onConfigured, isOpen }: APIConfigDialogProps) {
  const [baseUrl, setBaseUrl] = useState(
    localStorage.getItem('sora_base_url') || ''
  );
  const [apiKey, setApiKey] = useState(
    localStorage.getItem('sora_api_key') || ''
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleTestConnection = async () => {
    if (!baseUrl || !apiKey) {
      setError('请输入 Base URL 和 API Key');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const videoService = new VideoService({ baseUrl, apiKey });
      await videoService.getTokenQuota();

      setSuccess(true);
      setError(null);

      localStorage.setItem('sora_base_url', baseUrl);
      localStorage.setItem('sora_api_key', apiKey);

      onConfigured({ baseUrl, apiKey });

      setTimeout(() => {
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '连接失败，请检查 Base URL 和 API Key'
      );
      setSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '30px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}
      >
        <h2 style={{ marginTop: 0 }}>配置 Sora 2 API</h2>

        <p style={{ color: '#666', fontSize: '14px' }}>
          请输入你的 Sora 2 API 配置信息。你可以从中转服务（如神马 API）获取这些信息。
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 'bold' }}>
            Base URL
            <a
              href="https://api.whatai.cc/login"
              target="_blank"
              rel="noopener noreferrer"
              title="查看 WhatAI API 文档"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '18px',
                height: '18px',
                backgroundColor: '#4CAF50',
                color: '#fff',
                borderRadius: '50%',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#45a049')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4CAF50')}
            >
              ?
            </a>
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.xxx.com"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
          <p style={{ fontSize: '12px', color: '#999', margin: '5px 0 0 0' }}>
            示例: https://api.whatai.cc
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            API Key
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-xxx..."
              style={{
                width: '100%',
                padding: '10px',
                paddingRight: '40px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              style={{
                position: 'absolute',
                right: '10px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#333')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
              title={showApiKey ? '隐藏密钥' : '显示密钥'}
            >
              {showApiKey ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#999', margin: '5px 0 0 0' }}>
            你的 API 密钥将被保存在本地存储中
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#ffebee',
              color: '#c62828',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
              fontSize: '14px'
            }}
          >
            ❌ {error}
          </div>
        )}

        {success && (
          <div
            style={{
              backgroundColor: '#e8f5e9',
              color: '#2e7d32',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
              fontSize: '14px'
            }}
          >
            ✅ 连接成功！配置已保存
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleTestConnection}
            disabled={isLoading || !baseUrl || !apiKey}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: isLoading ? '#ccc' : '#4CAF50',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {isLoading ? '测试中...' : '测试连接'}
          </button>
        </div>

        <div
          style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#666'
          }}
        >
          <strong>如何获取 API 密钥？</strong>
          <ol style={{ margin: '10px 0 0 0', paddingLeft: '20px' }}>
            <li>注册中转服务账号（如神马 API）</li>
            <li>在账户设置中获取 Base URL</li>
            <li>生成或复制你的 API Key</li>
            <li>粘贴到上面的输入框中</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
