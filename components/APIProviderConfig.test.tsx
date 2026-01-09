import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import APIProviderConfig from './APIProviderConfig';
import { ProviderSettings, ProviderType } from '../types';

const defaultSettings: ProviderSettings = {
  provider: 'google',
  modelId: 'gemini-3-flash-preview'
};

const defaultProps = {
  activeTab: 'text' as const,
  settings: defaultSettings,
  onUpdateSettings: vi.fn(),
  theme: 'light' as const,
  lang: 'zh' as const
};

describe('APIProviderConfig', () => {
  it('renders provider selection with all options', () => {
    render(<APIProviderConfig {...defaultProps} />);
    
    expect(screen.getByText('Google AI')).toBeInTheDocument();
    expect(screen.getByText('OpenAI兼容')).toBeInTheDocument();
    expect(screen.getByText('智谱AI')).toBeInTheDocument();
    expect(screen.getByText('神马AI')).toBeInTheDocument();
  });

  it('renders in English when lang is en', () => {
    render(<APIProviderConfig {...defaultProps} lang="en" />);
    
    expect(screen.getByText('Provider Type')).toBeInTheDocument();
    expect(screen.getByText('Model ID')).toBeInTheDocument();
    expect(screen.getByText('OpenAI Compatible')).toBeInTheDocument();
    expect(screen.getByText('Zhipu AI')).toBeInTheDocument();
    expect(screen.getByText('Shenma AI')).toBeInTheDocument();
  });

  it('shows Google AI as selected by default', () => {
    render(<APIProviderConfig {...defaultProps} />);
    
    const googleButton = screen.getByText('Google AI').closest('button');
    expect(googleButton).toHaveClass('border-amber-500');
  });

  it('calls onUpdateSettings when provider is changed', () => {
    const onUpdateSettings = vi.fn();
    render(<APIProviderConfig {...defaultProps} onUpdateSettings={onUpdateSettings} />);
    
    fireEvent.click(screen.getByText('智谱AI'));
    
    expect(onUpdateSettings).toHaveBeenCalledWith({
      provider: 'zhipu',
      modelId: 'GLM-4-Flash'
    });
  });

  it('shows API key field for non-Google providers', () => {
    const zhipuSettings: ProviderSettings = {
      provider: 'zhipu',
      modelId: 'GLM-4-Flash'
    };
    
    render(<APIProviderConfig {...defaultProps} settings={zhipuSettings} />);
    
    expect(screen.getByText('API密钥')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('sk-...')).toBeInTheDocument();
  });

  it('shows base URL field for compatible providers', () => {
    const openaiSettings: ProviderSettings = {
      provider: 'openai-compatible',
      modelId: 'qwen-plus'
    };
    
    render(<APIProviderConfig {...defaultProps} settings={openaiSettings} />);
    
    expect(screen.getByText('基础URL')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://api.example.com/v1')).toBeInTheDocument();
  });

  it('does not show API key field for Google provider', () => {
    render(<APIProviderConfig {...defaultProps} />);
    
    expect(screen.queryByText('API密钥')).not.toBeInTheDocument();
    expect(screen.queryByText('基础URL')).not.toBeInTheDocument();
  });

  it('updates model ID when input changes', () => {
    const onUpdateSettings = vi.fn();
    render(<APIProviderConfig {...defaultProps} onUpdateSettings={onUpdateSettings} />);
    
    const modelInput = screen.getByDisplayValue('gemini-3-flash-preview');
    fireEvent.change(modelInput, { target: { value: 'gemini-4-flash' } });
    
    expect(onUpdateSettings).toHaveBeenCalledWith({ modelId: 'gemini-4-flash' });
  });

  it('updates API key when input changes', () => {
    const zhipuSettings: ProviderSettings = {
      provider: 'zhipu',
      modelId: 'GLM-4-Flash',
      apiKey: ''
    };
    
    const onUpdateSettings = vi.fn();
    render(<APIProviderConfig {...defaultProps} settings={zhipuSettings} onUpdateSettings={onUpdateSettings} />);
    
    const apiKeyInput = screen.getByPlaceholderText('sk-...');
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test123' } });
    
    expect(onUpdateSettings).toHaveBeenCalledWith({ apiKey: 'sk-test123' });
  });

  it('updates base URL when input changes', () => {
    const openaiSettings: ProviderSettings = {
      provider: 'openai-compatible',
      modelId: 'qwen-plus',
      baseUrl: ''
    };
    
    const onUpdateSettings = vi.fn();
    render(<APIProviderConfig {...defaultProps} settings={openaiSettings} onUpdateSettings={onUpdateSettings} />);
    
    const baseUrlInput = screen.getByPlaceholderText('https://api.example.com/v1');
    fireEvent.change(baseUrlInput, { target: { value: 'https://api.test.com/v1' } });
    
    expect(onUpdateSettings).toHaveBeenCalledWith({ baseUrl: 'https://api.test.com/v1' });
  });

  it('shows test connection button when API key is provided', () => {
    const zhipuSettings: ProviderSettings = {
      provider: 'zhipu',
      modelId: 'GLM-4-Flash',
      apiKey: 'sk-test123'
    };
    
    render(<APIProviderConfig {...defaultProps} settings={zhipuSettings} onTestConnection={vi.fn()} />);
    
    expect(screen.getByText('测试连接')).toBeInTheDocument();
  });

  it('calls onTestConnection when test button is clicked', async () => {
    const onTestConnection = vi.fn().mockResolvedValue(true);
    const zhipuSettings: ProviderSettings = {
      provider: 'zhipu',
      modelId: 'GLM-4-Flash',
      apiKey: 'sk-test123'
    };
    
    render(<APIProviderConfig {...defaultProps} settings={zhipuSettings} onTestConnection={onTestConnection} />);
    
    fireEvent.click(screen.getByText('测试连接'));
    
    await waitFor(() => {
      expect(onTestConnection).toHaveBeenCalledWith('zhipu');
    });
  });

  it('shows success status after successful connection test', async () => {
    const onTestConnection = vi.fn().mockResolvedValue(true);
    const zhipuSettings: ProviderSettings = {
      provider: 'zhipu',
      modelId: 'GLM-4-Flash',
      apiKey: 'sk-test123'
    };
    
    render(<APIProviderConfig {...defaultProps} settings={zhipuSettings} onTestConnection={onTestConnection} />);
    
    fireEvent.click(screen.getByText('测试连接'));
    
    await waitFor(() => {
      expect(screen.getByText('连接成功')).toBeInTheDocument();
    });
  });

  it('shows error status after failed connection test', async () => {
    const onTestConnection = vi.fn().mockResolvedValue(false);
    const zhipuSettings: ProviderSettings = {
      provider: 'zhipu',
      modelId: 'GLM-4-Flash',
      apiKey: 'sk-test123'
    };
    
    render(<APIProviderConfig {...defaultProps} settings={zhipuSettings} onTestConnection={onTestConnection} />);
    
    fireEvent.click(screen.getByText('测试连接'));
    
    await waitFor(() => {
      expect(screen.getByText('连接失败')).toBeInTheDocument();
    });
  });

  it('shows loading state during connection test', async () => {
    const onTestConnection = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
    const zhipuSettings: ProviderSettings = {
      provider: 'zhipu',
      modelId: 'GLM-4-Flash',
      apiKey: 'sk-test123'
    };
    
    render(<APIProviderConfig {...defaultProps} settings={zhipuSettings} onTestConnection={onTestConnection} />);
    
    fireEvent.click(screen.getByText('测试连接'));
    
    expect(screen.getByText('测试中...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('连接成功')).toBeInTheDocument();
    });
  });

  it('shows Zhipu-specific help information', () => {
    const zhipuSettings: ProviderSettings = {
      provider: 'zhipu',
      modelId: 'GLM-4-Flash'
    };
    
    render(<APIProviderConfig {...defaultProps} settings={zhipuSettings} />);
    
    expect(screen.getByText('智谱AI配置说明')).toBeInTheDocument();
    expect(screen.getByText(/请在智谱AI开放平台获取API密钥/)).toBeInTheDocument();
  });

  it('shows Shenma-specific help information', () => {
    const shenmaSettings: ProviderSettings = {
      provider: 'shenma',
      modelId: 'chat'
    };
    
    render(<APIProviderConfig {...defaultProps} settings={shenmaSettings} />);
    
    expect(screen.getByText('神马AI配置说明')).toBeInTheDocument();
    expect(screen.getByText(/请配置神马API的基础URL和密钥/)).toBeInTheDocument();
  });

  it('shows recommended models for Zhipu provider', () => {
    const zhipuSettings: ProviderSettings = {
      provider: 'zhipu',
      modelId: 'GLM-4-Flash'
    };
    
    render(<APIProviderConfig {...defaultProps} settings={zhipuSettings} />);
    
    expect(screen.getByText('推荐模型:')).toBeInTheDocument();
    expect(screen.getByText('GLM-4-Flash, GLM-4-Plus')).toBeInTheDocument();
  });

  it('shows recommended models for Shenma provider', () => {
    const shenmaSettings: ProviderSettings = {
      provider: 'shenma',
      modelId: 'chat'
    };
    
    render(<APIProviderConfig {...defaultProps} settings={shenmaSettings} />);
    
    expect(screen.getByText('推荐模型:')).toBeInTheDocument();
    expect(screen.getByText('对话模型')).toBeInTheDocument();
  });

  it('shows different recommended models for different tabs', () => {
    const zhipuSettings: ProviderSettings = {
      provider: 'zhipu',
      modelId: 'CogView-3-Flash'
    };
    
    render(<APIProviderConfig {...defaultProps} activeTab="image" settings={zhipuSettings} />);
    
    expect(screen.getByText('CogView-3-Flash')).toBeInTheDocument();
  });

  it('applies dark theme styles correctly', () => {
    render(<APIProviderConfig {...defaultProps} theme="dark" />);
    
    const modelInput = screen.getByDisplayValue('gemini-3-flash-preview');
    expect(modelInput).toHaveClass('border-white/10');
  });

  it('clears API key and base URL when switching to Google provider', () => {
    const onUpdateSettings = vi.fn();
    const zhipuSettings: ProviderSettings = {
      provider: 'zhipu',
      modelId: 'GLM-4-Flash',
      apiKey: 'sk-test',
      baseUrl: 'https://api.test.com'
    };
    
    render(<APIProviderConfig {...defaultProps} settings={zhipuSettings} onUpdateSettings={onUpdateSettings} />);
    
    fireEvent.click(screen.getByText('Google AI'));
    
    expect(onUpdateSettings).toHaveBeenCalledWith({
      provider: 'google',
      modelId: 'gemini-3-flash-preview',
      apiKey: undefined,
      baseUrl: undefined
    });
  });
});