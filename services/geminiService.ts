
import { GoogleGenAI } from "@google/genai";
import { ProviderSettings, NewModelConfig } from "../types";

export class AIService {
  // 获取用户配置的方法
  private getUserConfig(): NewModelConfig | null {
    try {
      const configStr = localStorage.getItem('caocao-canvas-model-config');
      return configStr ? JSON.parse(configStr) : null;
    } catch (error) {
      console.error('Failed to get user config:', error);
      return null;
    }
  }
  // Master dispatch for text generation
  async generateText(contents: any, settings: ProviderSettings) {
    if (settings.provider === 'google') {
      return this.generateGoogleText(contents, settings.modelId);
    } else {
      return this.generateOpenAIText(contents, settings);
    }
  }

  // Google Implementation
  private async generateGoogleText(contents: any, model: string) {
    // 从用户配置中获取 API 密钥，不再使用环境变量
    const userConfig = this.getUserConfig();
    const apiKey = userConfig?.providers?.google?.apiKey;
    
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('请在设置中配置 Google API 密钥。点击右上角设置按钮 → API配置 → 填入您的 Gemini API 密钥');
    }
    
    const ai = new GoogleGenAI({ apiKey });
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: contents,
      });
      return response.text || "No response content.";
    } catch (error: any) {
      if (error?.message?.includes("Requested entity was not found.")) {
        if ((window as any).aistudio) await (window as any).aistudio.openSelectKey();
      }
      throw error;
    }
  }

  // Generic OpenAI-compatible Implementation (Supports Qwen, DeepSeek, etc.)
  private async generateOpenAIText(contents: any, settings: ProviderSettings) {
    if (!settings.baseUrl) throw new Error("Base URL required for generic provider");
    
    // Convert Gemini parts to OpenAI messages format
    // Simple conversion: flatten text parts
    let prompt = "";
    if (Array.isArray(contents)) {
      prompt = contents.map(c => c.text || "").join("\n");
    } else if (contents.parts) {
      prompt = contents.parts.map((p: any) => p.text || "").join("\n");
    } else {
      prompt = String(contents);
    }

    const response = await fetch(`${settings.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey || process.env.API_KEY || ''}`
      },
      body: JSON.stringify({
        model: settings.modelId,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "API Request Failed");
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "No response content.";
  }

  // Image dispatch
  async generateImage(contents: any, settings: ProviderSettings) {
    if (settings.provider === 'google') {
      // 从用户配置中获取 API 密钥，不再使用环境变量
      const userConfig = this.getUserConfig();
      const apiKey = userConfig?.providers?.google?.apiKey;
      
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('请在设置中配置 Google API 密钥。点击右上角设置按钮 → API配置 → 填入您的 Gemini API 密钥');
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: settings.modelId,
        contents: contents,
        config: settings.modelId.includes('pro') ? { imageConfig: { imageSize: "1K", aspectRatio: "1:1" } } : undefined
      });
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
      throw new Error("No image data returned from Google");
    } else {
      // Basic DALL-E style fallback for generic providers
      throw new Error("Generic Image Provider not implemented yet. Use Google for images.");
    }
  }

  // Video dispatch
  async generateVideo(prompt: string, settings: ProviderSettings) {
    if (settings.provider === 'google') {
      // 从用户配置中获取 API 密钥，不再使用环境变量
      const userConfig = this.getUserConfig();
      const apiKey = userConfig?.providers?.google?.apiKey;
      
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('请在设置中配置 Google API 密钥。点击右上角设置按钮 → API配置 → 填入您的 Gemini API 密钥');
      }
      
      const ai = new GoogleGenAI({ apiKey });
      let operation = await ai.models.generateVideos({
        model: settings.modelId,
        prompt,
        config: { resolution: '720p', aspectRatio: '16:9', numberOfVideos: 1 }
      });
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }
      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      return `${uri}&key=${apiKey}`;
    } else {
      throw new Error("Generic Video Provider not implemented. Use Veo/Google.");
    }
  }
}

export const aiService = new AIService();
