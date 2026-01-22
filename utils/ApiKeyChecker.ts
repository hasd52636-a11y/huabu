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
          '5. 在右上角设置按钮 → API配置中填入密钥',
          '6. 启用对应的提供商'
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
          '当前使用的是占位符密钥，请配置真实的API密钥：',
          '1. 访问 https://aistudio.google.com/app/apikey',
          '2. 获取真实的API密钥',
          '3. 在右上角设置按钮 → API配置中填入密钥',
          '4. 启用对应的提供商'
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
# 🔑 API密钥配置指南

## 步骤1: 获取API密钥
1. 访问 Google AI Studio: https://aistudio.google.com/app/apikey
2. 使用Google账号登录
3. 点击 "Create API Key" 按钮
4. 复制生成的API密钥（以AIza开头）

## 步骤2: 配置到应用
1. 点击右上角的设置按钮（齿轮图标）
2. 选择 "API配置" 选项卡
3. 在对应提供商处填入API密钥
4. 点击单选按钮启用该提供商

## 步骤3: 开始使用
配置完成后，所有AI功能将立即可用，无需重启。

## 验证配置
- 配置完成后，可以点击测试按钮验证连接
- 成功后会显示绿色勾号
- 语音控制和AI生成功能将正常工作

## 注意事项
- API密钥是敏感信息，不要分享给他人
- 密钥保存在浏览器本地存储中，安全可靠
- 支持多个提供商，可以随时切换
`;
  }
}

export default ApiKeyChecker;