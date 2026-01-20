/**
 * API密钥检查工具
 * 帮助用户验证API密钥配置是否正确
 */

export interface ApiKeyStatus {
  isConfigured: boolean;
  isValid: boolean;
  provider: string;
  message: string;
  instructions?: string[];
}

export class ApiKeyChecker {
  /**
   * 检查API密钥配置状态
   */
  static checkApiKey(apiKey: string, provider: string = 'gemini'): ApiKeyStatus {
    // 检查是否配置
    if (!apiKey || apiKey.trim() === '') {
      return {
        isConfigured: false,
        isValid: false,
        provider,
        message: 'API密钥未配置',
        instructions: [
          '1. 访问 https://aistudio.google.com/app/apikey',
          '2. 登录Google账号',
          '3. 点击"Create API Key"',
          '4. 复制生成的API密钥',
          '5. 在.env.local文件中替换PLACEHOLDER_API_KEY',
          '6. 重启开发服务器'
        ]
      };
    }

    // 检查是否是占位符
    if (apiKey === 'PLACEHOLDER_API_KEY') {
      return {
        isConfigured: false,
        isValid: false,
        provider,
        message: '检测到占位符API密钥，需要配置真实密钥',
        instructions: [
          '当前使用的是占位符密钥，请配置真实的Gemini API密钥：',
          '1. 访问 https://aistudio.google.com/app/apikey',
          '2. 获取真实的API密钥',
          '3. 替换.env.local中的PLACEHOLDER_API_KEY',
          '4. 重启服务器'
        ]
      };
    }

    // 基本格式检查
    if (provider === 'gemini') {
      if (!apiKey.startsWith('AIza')) {
        return {
          isConfigured: true,
          isValid: false,
          provider,
          message: 'Gemini API密钥格式不正确',
          instructions: [
            'Gemini API密钥应该以"AIza"开头',
            '请检查是否复制完整',
            '确保没有多余的空格或字符'
          ]
        };
      }

      if (apiKey.length < 35) {
        return {
          isConfigured: true,
          isValid: false,
          provider,
          message: 'API密钥长度不足',
          instructions: [
            'Gemini API密钥通常长度为39个字符',
            '请检查是否复制完整'
          ]
        };
      }
    }

    return {
      isConfigured: true,
      isValid: true,
      provider,
      message: 'API密钥格式正确'
    };
  }

  /**
   * 生成用户友好的错误消息
   */
  static generateErrorMessage(status: ApiKeyStatus): string {
    let message = `🔑 API密钥状态检查\n\n`;
    message += `提供商: ${status.provider}\n`;
    message += `状态: ${status.message}\n\n`;

    if (status.instructions && status.instructions.length > 0) {
      message += `解决方案:\n`;
      status.instructions.forEach((instruction, index) => {
        message += `${instruction}\n`;
      });
    }

    if (!status.isValid) {
      message += `\n⚠️ 配置正确的API密钥后，所有功能将正常工作！`;
    }

    return message;
  }

  /**
   * 检查环境变量中的API密钥
   */
  static checkEnvironmentApiKey(): ApiKeyStatus {
    // 在浏览器环境中，我们无法直接访问环境变量
    // 这个方法主要用于服务端检查
    if (typeof process !== 'undefined' && process.env) {
      const apiKey = process.env.GEMINI_API_KEY || '';
      return this.checkApiKey(apiKey, 'gemini');
    }

    return {
      isConfigured: false,
      isValid: false,
      provider: 'gemini',
      message: '无法检查环境变量（浏览器环境）'
    };
  }

  /**
   * 创建API密钥配置指导
   */
  static createConfigurationGuide(): string {
    return `
# 🔑 Gemini API密钥配置指南

## 步骤1: 获取API密钥
1. 访问 Google AI Studio: https://aistudio.google.com/app/apikey
2. 使用Google账号登录
3. 点击 "Create API Key" 按钮
4. 复制生成的API密钥（以AIza开头）

## 步骤2: 配置到项目
1. 打开项目根目录的 .env.local 文件
2. 找到这一行：GEMINI_API_KEY=PLACEHOLDER_API_KEY
3. 将 PLACEHOLDER_API_KEY 替换为你的真实API密钥
4. 保存文件

## 步骤3: 重启服务
\`\`\`bash
# 停止当前服务 (Ctrl+C)
# 重新启动开发服务器
npm run dev
# 或预览模式
npm run preview
\`\`\`

## 验证配置
配置完成后，语音控制应该能正常工作，不再显示"network"错误。

## 注意事项
- API密钥是敏感信息，不要分享给他人
- .env.local文件已在.gitignore中，不会被提交到代码仓库
- 生产环境需要在Vercel中配置环境变量
`;
  }
}

export default ApiKeyChecker;