
import { GoogleGenAI, Type } from "@google/genai";
import { ScriptScene, ProviderConfig } from "./types";

const getAppConfig = (): ProviderConfig | null => {
  const saved = localStorage.getItem('director_canvas_api_config');
  if (!saved) return null;
  
  const config = JSON.parse(saved);
  
  // 数据迁移：旧格式 → 新格式
  if (config.modelName && !config.llmModel) {
    config.llmModel = config.modelName;
    config.imageModel = config.modelName;
    delete config.modelName;
    localStorage.setItem('director_canvas_api_config', JSON.stringify(config));
  }
  
  return config;
};

// API 连接测试函数
export const testApiConnection = async (config: ProviderConfig, type: 'llm' | 'image' = 'llm'): Promise<boolean> => {
  try {
    if (config.provider === 'gemini') {
      // 测试 Gemini API
      const ai = new GoogleGenAI({ apiKey: config.apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "test"
      });
      return !!response;
    } else {
      // 测试 OpenAI 兼容的 API
      const endpoint = type === 'image' 
        ? `${config.baseUrl}/images/generations`
        : `${config.baseUrl}/chat/completions`;
      
      const body = type === 'image'
        ? { model: config.imageModel, prompt: 'test', n: 1, size: '512x512' }
        : { model: config.llmModel, messages: [{ role: 'user', content: 'test' }], max_tokens: 10 };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(body)
      });
      
      return response.ok;
    }
  } catch (e) {
    console.error("API Test Failed:", e);
    return false;
  }
};

// 将 URL 图片转换为 base64（使用 Canvas 方法绕过 CORS）
const urlToBase64 = async (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const base64 = canvas.toDataURL('image/png');
        resolve(base64);
      } catch (err) {
        console.error("Canvas conversion failed", err);
        resolve(null);
      }
    };
    
    img.onerror = () => {
      console.error("Image load failed for URL:", url);
      resolve(null);
    };
    
    img.src = url;
  });
};

export const generateSceneImage = async (prompt: string, forceLineArt: boolean = true, isBlackAndWhite: boolean = false, style?: any, aspectRatio?: string): Promise<string | null> => {
  const config = getAppConfig();
  
  // 使用配置中的 API Key，如果没有则使用环境变量
  const apiKey = config?.apiKey || process.env.API_KEY;
  
  let stylePrefix = '';
  
  // 获取风格描述
  const styleDesc = style?.descriptionZh || style?.description || '';
  
  if (isBlackAndWhite) {
    // 黑白素描线稿模式：强制生成纯黑白素描风格
    if (styleDesc) {
      stylePrefix = `STRICT BLACK AND WHITE SKETCH ONLY. Professional pencil sketch storyboard in ${styleDesc} style. Pure black pencil lines on pure white background. ABSOLUTELY NO COLORS, NO SHADING, NO GREY TONES. Only thin, precise pencil strokes to define all shapes, details, and composition. High contrast, clean sketch work. Cinema scene: `;
    } else {
      stylePrefix = "STRICT BLACK AND WHITE SKETCH ONLY. Professional pencil sketch storyboard. Pure black pencil lines on pure white background. ABSOLUTELY NO COLORS, NO SHADING, NO GREY TONES. Only thin, precise pencil strokes to define all shapes, details, and composition. High contrast, clean sketch work. Cinema scene: ";
    }
  } else {
    // 彩色模式：生成彩色分镜
    if (styleDesc) {
      stylePrefix = `Professional cinematic storyboard frame in ${styleDesc} style. Vibrant colors, rich color palette, detailed illustration. Professional lighting and composition. High quality digital painting. Cinema scene: `;
    } else {
      stylePrefix = "Professional cinematic storyboard frame with vibrant colors. Rich color palette, detailed illustration style. Professional lighting and composition. High quality digital painting. Cinema scene: ";
    }
  }

  try {
    if (config?.provider === 'gemini') {
      // Gemini API
      const ai = new GoogleGenAI({ apiKey: apiKey || '' });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [{ text: `${stylePrefix} ${prompt}` }]
        },
        config: {
          imageConfig: { aspectRatio: aspectRatio || "16:9" }
        }
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    } else {
      // OpenAI 兼容 API（智谱、OpenAI 等）
      const response = await fetch(`${config?.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: config?.imageModel || 'dall-e-3',
          prompt: `${stylePrefix} ${prompt}`,
          n: 1,
          size: '1024x1024'
        })
      });

      if (!response.ok) {
        console.error(`Image generation failed: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const imageUrl = data.data?.[0]?.url;
      
      if (!imageUrl) return null;
      
      // 将 URL 转换为 base64，避免 CORS 问题
      console.log("Converting image URL to base64...");
      const base64 = await urlToBase64(imageUrl);
      if (base64) {
        console.log("Image converted to base64 successfully");
        return base64;
      } else {
        console.warn("Failed to convert to base64, returning URL as fallback");
        return imageUrl;
      }
    }
  } catch (err) {
    console.error("Image generation failed", err);
  }
  return null;
};

export const parseScriptToScenes = async (scriptText: string, sceneCount: number): Promise<ScriptScene[]> => {
  const config = getAppConfig();
  const apiKey = config?.apiKey || process.env.API_KEY;

  // If using a custom provider that is OpenAI-compatible
  if (config && config.provider !== 'gemini' && config.apiKey) {
    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.llmModel || 'gpt-4o',
          messages: [
            { 
              role: 'system', 
              content: `You are a script parser. Parse input into ${sceneCount} storyboard scenes. Return a JSON array of objects with keys: index (int), description (string), visualPrompt (string). Do not include markdown code blocks.` 
            },
            { role: 'user', content: scriptText }
          ],
          response_format: { type: "json_object" }
        })
      });
      const data = await response.json();
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);
      // Handle cases where the response might be nested
      let scenes = Array.isArray(parsed) ? parsed : (parsed.scenes || Object.values(parsed)[0]);
      
      // 确保返回的场景数量正确
      if (Array.isArray(scenes)) {
        if (scenes.length > sceneCount) {
          console.warn(`AI returned ${scenes.length} scenes but ${sceneCount} were requested. Trimming to ${sceneCount}.`);
          scenes = scenes.slice(0, sceneCount);
        } else if (scenes.length < sceneCount) {
          console.warn(`AI returned ${scenes.length} scenes but ${sceneCount} were requested. Padding with duplicates.`);
          while (scenes.length < sceneCount) {
            const lastScene = scenes[scenes.length - 1];
            scenes.push({
              index: scenes.length,
              description: lastScene.description + ` (variation ${scenes.length - sceneCount + 1})`,
              visualPrompt: lastScene.visualPrompt + ` (variation ${scenes.length - sceneCount + 1})`
            });
          }
        }
      }
      
      return scenes;
    } catch (e) {
      console.error("Third-party script parsing failed", e);
    }
  }

  // Fallback or default to Gemini
  const ai = new GoogleGenAI({ apiKey: apiKey || '' });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Parse this script into exactly ${sceneCount} storyboard scenes. 
    Script: ${scriptText}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            index: { type: Type.INTEGER },
            description: { type: Type.STRING },
            visualPrompt: { type: Type.STRING }
          },
          required: ["index", "description", "visualPrompt"]
        }
      }
    }
  });
  try { 
    let scenes = JSON.parse(response.text);
    
    // 确保返回的场景数量正确
    if (Array.isArray(scenes)) {
      // 如果场景数量不匹配，进行调整
      if (scenes.length > sceneCount) {
        console.warn(`AI returned ${scenes.length} scenes but ${sceneCount} were requested. Trimming to ${sceneCount}.`);
        scenes = scenes.slice(0, sceneCount);
      } else if (scenes.length < sceneCount) {
        console.warn(`AI returned ${scenes.length} scenes but ${sceneCount} were requested. Padding with duplicates.`);
        // 用最后一个场景的变体填充
        while (scenes.length < sceneCount) {
          const lastScene = scenes[scenes.length - 1];
          scenes.push({
            index: scenes.length,
            description: lastScene.description + ` (variation ${scenes.length - sceneCount + 1})`,
            visualPrompt: lastScene.visualPrompt + ` (variation ${scenes.length - sceneCount + 1})`
          });
        }
      }
    }
    
    return scenes;
  } catch (e) { 
    console.error("Failed to parse script response:", e);
    return []; 
  }
};

export const chatWithGemini = async (messages: any[]) => {
  const config = getAppConfig();
  const apiKey = config?.apiKey || process.env.API_KEY;

  if (config && config.provider !== 'gemini' && config.apiKey) {
    try {
      const formattedMessages = messages.map(m => {
        // 安全提取文本内容
        let text = '';
        if (typeof m.text === 'string') {
          text = m.text;
        } else if (m.parts && Array.isArray(m.parts) && m.parts[0]?.text) {
          text = m.parts[0].text;
        }
        return {
          role: m.role === 'model' ? 'assistant' : 'user',
          content: text
        };
      });

      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.llmModel,
          messages: formattedMessages
        })
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      console.log("Third-party chat response:", content);
      return content || null;
    } catch (e) {
      console.error("Third-party chat failed", e);
      return null;
    }
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey || '' });
    
    // 构建完整的对话历史，包含系统指令作为第一条消息
    const conversationHistory = [
      {
        role: 'user',
        parts: [{ text: "You are an expert AI design assistant and film director. Provide creative and concise storyboarding advice." }]
      },
      {
        role: 'model',
        parts: [{ text: "I understand. I'll provide expert storyboarding and film direction advice." }]
      },
      ...messages.map(m => {
        // 安全提取文本内容
        let text = '';
        if (typeof m.text === 'string') {
          text = m.text;
        } else if (m.parts && Array.isArray(m.parts) && m.parts[0]?.text) {
          text = m.parts[0].text;
        }
        return {
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text }]
        };
      })
    ];
    
    console.log("Sending conversation history to Gemini:", conversationHistory);
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: conversationHistory
    });
    
    console.log("Gemini response:", response);
    
    // 提取文本内容
    if (response.text) {
      console.log("Got response.text:", response.text);
      return response.text;
    }
    
    if (response.candidates && response.candidates[0]) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
        const text = candidate.content.parts[0].text;
        console.log("Got text from candidate:", text);
        return text || null;
      }
    }
    
    console.warn("Could not extract text from Gemini response:", response);
    return null;
  } catch (e) {
    console.error("Gemini chat failed", e);
    return null;
  }
};


export const generateStoryboardFromDialogue = async (dialogueHistory: any[], frameCount: number, style: string, duration?: number, aspectRatio?: string, language: 'zh' | 'en' = 'en'): Promise<ScriptScene[]> => {
  const config = getAppConfig();
  const apiKey = config?.apiKey || process.env.API_KEY;
  
  // 提取最后一条用户消息作为生成分镜的主要内容
  let primaryContent = '';
  let contextContent = '';
  
  if (dialogueHistory.length > 0) {
    for (let i = dialogueHistory.length - 1; i >= 0; i--) {
      if (dialogueHistory[i].role === 'user') {
        primaryContent = dialogueHistory[i].text;
        contextContent = dialogueHistory.slice(0, i).map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');
        break;
      }
    }
  }
  
  if (!primaryContent) {
    primaryContent = dialogueHistory.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');
  }
  
  // 构建风格和参数提示
  const stylePrompt = style ? (language === 'zh' ? `视觉风格应该是：${style}。` : `The visual style should be: ${style}. `) : '';
  const durationPrompt = duration && duration > 0 ? (language === 'zh' ? `总时长：${duration}秒。` : `Total duration: ${duration} seconds. `) : '';
  const aspectRatioPrompt = aspectRatio ? (language === 'zh' ? `画面比例：${aspectRatio}。` : `Aspect ratio: ${aspectRatio}. `) : '';
  
  const systemPrompts = {
    zh: `你是一位创意分镜导演。根据用户的创意指导，生成恰好${frameCount}个分镜场景。
${stylePrompt}${durationPrompt}${aspectRatioPrompt}
返回一个JSON数组，包含对象，字段为：index (int), description (string), visualPrompt (string)。
每个visualPrompt应该详细具体，用于图像生成。
不要包含markdown代码块，只返回JSON数组。`,
    en: `You are a creative storyboard director. Based on the user's creative direction, generate exactly ${frameCount} storyboard scenes.
${stylePrompt}${durationPrompt}${aspectRatioPrompt}
Return a JSON array with objects containing: index (int), description (string), visualPrompt (string).
Each visualPrompt should be detailed and specific for image generation.
Do not include markdown code blocks, just the JSON array.`
  };
  
  const systemPrompt = systemPrompts[language];
  
  const userPrompt = contextContent 
    ? (language === 'zh' 
      ? `之前的对话背景：\n${contextContent}\n\n根据这个创意指导，创建${frameCount}个分镜场景：\n${primaryContent}`
      : `Previous context:\n${contextContent}\n\nBased on this creative direction, create ${frameCount} storyboard scenes:\n${primaryContent}`)
    : (language === 'zh'
      ? `根据这个创意指导，创建${frameCount}个分镜场景：\n${primaryContent}`
      : `Based on this creative direction, create ${frameCount} storyboard scenes:\n${primaryContent}`);

  if (config && config.provider !== 'gemini' && config.apiKey) {
    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.llmModel || 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: "json_object" }
        })
      });
      const data = await response.json();
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);
      let scenes = Array.isArray(parsed) ? parsed : (parsed.scenes || Object.values(parsed)[0]);
      
      // 确保返回的场景数量正确
      if (Array.isArray(scenes)) {
        if (scenes.length > frameCount) {
          console.warn(`AI returned ${scenes.length} scenes but ${frameCount} were requested. Trimming to ${frameCount}.`);
          scenes = scenes.slice(0, frameCount);
        } else if (scenes.length < frameCount) {
          console.warn(`AI returned ${scenes.length} scenes but ${frameCount} were requested. Padding with duplicates.`);
          while (scenes.length < frameCount) {
            const lastScene = scenes[scenes.length - 1];
            scenes.push({
              index: scenes.length,
              description: lastScene.description + ` (variation ${scenes.length - frameCount + 1})`,
              visualPrompt: lastScene.visualPrompt + ` (variation ${scenes.length - frameCount + 1})`
            });
          }
        }
      }
      
      return scenes;
    } catch (e) {
      console.error("Third-party dialogue to storyboard failed", e);
    }
  }

  // Fallback to Gemini
  const ai = new GoogleGenAI({ apiKey: apiKey || '' });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `${systemPrompt}\n\n${userPrompt}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            index: { type: Type.INTEGER },
            description: { type: Type.STRING },
            visualPrompt: { type: Type.STRING }
          },
          required: ["index", "description", "visualPrompt"]
        }
      }
    }
  });
  try { 
    let scenes = JSON.parse(response.text);
    
    // 确保返回的场景数量正确
    if (Array.isArray(scenes)) {
      // 如果场景数量不匹配，进行调整
      if (scenes.length > frameCount) {
        console.warn(`AI returned ${scenes.length} scenes but ${frameCount} were requested. Trimming to ${frameCount}.`);
        scenes = scenes.slice(0, frameCount);
      } else if (scenes.length < frameCount) {
        console.warn(`AI returned ${scenes.length} scenes but ${frameCount} were requested. Padding with duplicates.`);
        // 用最后一个场景的变体填充
        while (scenes.length < frameCount) {
          const lastScene = scenes[scenes.length - 1];
          scenes.push({
            index: scenes.length,
            description: lastScene.description + ` (variation ${scenes.length - frameCount + 1})`,
            visualPrompt: lastScene.visualPrompt + ` (variation ${scenes.length - frameCount + 1})`
          });
        }
      }
    }
    
    return scenes;
  } catch (e) { 
    console.error("Failed to parse storyboard response:", e);
    return []; 
  }
};
