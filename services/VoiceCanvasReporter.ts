/**
 * 语音画布播报服务
 * 负责生成画布状态的语音播报内容和模块操作指令识别
 */

import { Block } from '../types';

export interface CanvasReport {
  summary: string;
  blocks: BlockReport[];
  totalCount: number;
  byType: {
    text: number;
    image: number;
    video: number;
  };
}

export interface BlockReport {
  id: string;
  number: string;
  type: 'text' | 'image' | 'video';
  status: string;
  hasContent: boolean;
  contentPreview?: string;
  position: { x: number; y: number };
}

export interface VoiceModuleCommand {
  action: 'select' | 'delete' | 'generate' | 'regenerate' | 'modify_prompt' | 'move' | 'copy' | 'edit' | 'connect';
  targetModule?: string; // 如 "A01", "B02", "V01"
  targetModules?: string[]; // 多个模块
  content?: string; // 生成内容或编辑内容
  promptModification?: string; // 提示词修改内容
  direction?: 'up' | 'down' | 'left' | 'right'; // 移动方向
  connectTo?: string; // 连接目标模块
}

class VoiceCanvasReporter {
  
  /**
   * 生成画布状态播报
   */
  generateCanvasReport(blocks: Block[], lang: 'zh' | 'en' = 'zh'): CanvasReport {
    const byType = {
      text: blocks.filter(b => b.type === 'text').length,
      image: blocks.filter(b => b.type === 'image').length,
      video: blocks.filter(b => b.type === 'video').length
    };

    const blockReports: BlockReport[] = blocks.map(block => ({
      id: block.id,
      number: block.number,
      type: block.type,
      status: block.status,
      hasContent: !!(block.content && block.content.trim()),
      contentPreview: this.getContentPreview(block),
      position: { x: block.x, y: block.y }
    }));

    const summary = this.generateSummaryText(byType, blocks.length, lang);

    return {
      summary,
      blocks: blockReports,
      totalCount: blocks.length,
      byType
    };
  }

  /**
   * 生成详细的画布播报文本
   */
  generateDetailedReport(blocks: Block[], lang: 'zh' | 'en' = 'zh'): string {
    const report = this.generateCanvasReport(blocks, lang);
    
    if (lang === 'zh') {
      let reportText = `画布状态播报：${report.summary}\n\n`;
      
      if (report.blocks.length === 0) {
        reportText += '画布为空，可以说"生成文本"、"生成图片"或"生成视频"来创建内容。';
        return reportText;
      }

      reportText += '模块详情：\n';
      
      // 按类型分组播报
      const textBlocks = report.blocks.filter(b => b.type === 'text');
      const imageBlocks = report.blocks.filter(b => b.type === 'image');
      const videoBlocks = report.blocks.filter(b => b.type === 'video');

      if (textBlocks.length > 0) {
        reportText += `\n📝 文本模块（${textBlocks.length}个）：\n`;
        textBlocks.forEach(block => {
          const statusText = this.getStatusText(block.status, lang);
          const contentText = block.hasContent ? `内容：${block.contentPreview}` : '暂无内容';
          reportText += `• ${block.number}：${statusText}，${contentText}\n`;
        });
      }

      if (imageBlocks.length > 0) {
        reportText += `\n🖼️ 图片模块（${imageBlocks.length}个）：\n`;
        imageBlocks.forEach(block => {
          const statusText = this.getStatusText(block.status, lang);
          reportText += `• ${block.number}：${statusText}\n`;
        });
      }

      if (videoBlocks.length > 0) {
        reportText += `\n🎬 视频模块（${videoBlocks.length}个）：\n`;
        videoBlocks.forEach(block => {
          const statusText = this.getStatusText(block.status, lang);
          reportText += `• ${block.number}：${statusText}\n`;
        });
      }

      reportText += '\n💡 操作提示：\n';
      reportText += '• 选择模块：说"选择A01"或"选择文本模块A01"\n';
      reportText += '• 生成内容：说"给A01生成内容：春天的诗歌"\n';
      reportText += '• 重新生成：说"重新生成A01"或"对A01重新生成"\n';
      reportText += '• 输入内容：说"在A01输入离离原上草"或"A01输入内容"\n';
      reportText += '• 修改提示词：说"给B02增加奔跑的马"或"在A01的提示词里加上浪漫的氛围"\n';
      reportText += '• 删除模块：说"删除B02"\n';
      reportText += '• 移动模块：说"把A01向右移动"\n';
      reportText += '• 连接模块：说"把A01连接到B02"或"连起来A01和B02"';

      return reportText;
    } else {
      // English version
      let reportText = `Canvas Status Report: ${report.summary}\n\n`;
      
      if (report.blocks.length === 0) {
        reportText += 'Canvas is empty. You can say "generate text", "generate image", or "generate video" to create content.';
        return reportText;
      }

      reportText += 'Module Details:\n';
      
      const textBlocks = report.blocks.filter(b => b.type === 'text');
      const imageBlocks = report.blocks.filter(b => b.type === 'image');
      const videoBlocks = report.blocks.filter(b => b.type === 'video');

      if (textBlocks.length > 0) {
        reportText += `\n📝 Text Modules (${textBlocks.length}):\n`;
        textBlocks.forEach(block => {
          const statusText = this.getStatusText(block.status, lang);
          const contentText = block.hasContent ? `Content: ${block.contentPreview}` : 'No content';
          reportText += `• ${block.number}: ${statusText}, ${contentText}\n`;
        });
      }

      if (imageBlocks.length > 0) {
        reportText += `\n🖼️ Image Modules (${imageBlocks.length}):\n`;
        imageBlocks.forEach(block => {
          const statusText = this.getStatusText(block.status, lang);
          reportText += `• ${block.number}: ${statusText}\n`;
        });
      }

      if (videoBlocks.length > 0) {
        reportText += `\n🎬 Video Modules (${videoBlocks.length}):\n`;
        videoBlocks.forEach(block => {
          const statusText = this.getStatusText(block.status, lang);
          reportText += `• ${block.number}: ${statusText}\n`;
        });
      }

      reportText += '\n💡 Operation Tips:\n';
      reportText += '• Select module: Say "select A01" or "select text module A01"\n';
      reportText += '• Generate content: Say "generate content for A01: spring poetry"\n';
      reportText += '• Regenerate: Say "regenerate A01" or "regenerate content for A01"\n';
      reportText += '• Input content: Say "input content to A01: hello world" or "A01 input content"\n';
      reportText += '• Modify prompt: Say "add running horse to B02" or "add romantic atmosphere to A01 prompt"\n';
      reportText += '• Delete module: Say "delete B02"\n';
      reportText += '• Move module: Say "move A01 to the right"\n';
      reportText += '• Connect modules: Say "connect A01 to B02" or "link A01 to B02"';

      return reportText;
    }
  }

  /**
   * 解析语音模块操作指令
   */
  parseModuleCommand(transcript: string, lang: 'zh' | 'en' = 'zh'): VoiceModuleCommand | null {
    const text = transcript.toLowerCase();
    console.log('[VoiceCanvasReporter] 开始解析模块指令:', { transcript, text, lang });

    if (lang === 'zh') {
      // 选择模块：选择A01、选中B02、点击V01
      const selectMatch = text.match(/(?:选择|选中|点击)\s*([abv]\d{2}|[abv]\s*\d{1,2})/i);
      if (selectMatch) {
        const moduleNumber = this.normalizeModuleNumber(selectMatch[1]);
        return {
          action: 'select',
          targetModule: moduleNumber
        };
      }

      // 重新生成：重新生成A01、对A01重新生成、请对文本模块A01重新生成
      const regenerateMatch = text.match(/(?:重新生成|再次生成|重生成)\s*([abv]\d{2}|[abv]\s*\d{1,2})/i) ||
                             text.match(/(?:对|给)\s*(?:文本模块|图片模块|视频模块)?\s*([abv]\d{2}|[abv]\s*\d{1,2})\s*(?:重新生成|再次生成)/i) ||
                             text.match(/(?:请对?)\s*(?:文本模块|图片模块|视频模块)?\s*([abv]\d{2}|[abv]\s*\d{1,2})\s*(?:重新生成|再次生成)/i);
      if (regenerateMatch) {
        const moduleNumber = this.normalizeModuleNumber(regenerateMatch[1]);
        return {
          action: 'regenerate',
          targetModule: moduleNumber
        };
      }

      // 修改提示词：给B02增加奔跑的马、在A01的提示词里加上浪漫的氛围、请将B02的提示词里增加对一匹奔跑的马的描述
      const modifyPromptMatch = text.match(/(?:给|为)\s*([abv]\d{2}|[abv]\s*\d{1,2})\s*(?:增加|添加|加上|加入)\s*(.+)/i) ||
                               text.match(/(?:在|将)\s*([abv]\d{2}|[abv]\s*\d{1,2})\s*(?:的)?(?:提示词|内容)(?:里|中)?\s*(?:增加|添加|加上|加入)\s*(?:对?)?\s*(.+?)(?:的描述)?/i) ||
                               text.match(/(?:请将?)\s*([abv]\d{2}|[abv]\s*\d{1,2})\s*(?:的)?(?:提示词|内容)(?:里|中)?\s*(?:增加|添加|加上|加入)\s*(?:对?)?\s*(.+?)(?:的描述)?/i);
      if (modifyPromptMatch) {
        const moduleNumber = this.normalizeModuleNumber(modifyPromptMatch[1]);
        const modification = modifyPromptMatch[2]?.trim();
        return {
          action: 'modify_prompt',
          targetModule: moduleNumber,
          promptModification: modification
        };
      }

      // 删除模块：删除A01、移除B02
      const deleteMatch = text.match(/(?:删除|移除)\s*([abv]\d{2}|[abv]\s*\d{1,2})/i);
      if (deleteMatch) {
        const moduleNumber = this.normalizeModuleNumber(deleteMatch[1]);
        return {
          action: 'delete',
          targetModule: moduleNumber
        };
      }

      // 输入/编辑内容：在A01输入离离原上草、给A01输入内容、编辑A01内容为春天、A01输入内容
      // 🔥 优先匹配更具体的输入指令模式
      const editMatch = text.match(/(?:在|给|对)\s*([abv]\d{1,2}|[abv]\s*\d{1,2})\s*(?:文本模块|模块)?\s*(?:里面|中|内)?\s*(?:输入|编辑|写入|填入)(?:内容)?[:：]?\s*(.+)/i) ||
                       text.match(/(?:在|给|对)\s*([abv]\d{1,2}|[abv]\s*\d{1,2})\s*(?:输入|编辑|写入|填入)(?:内容)?[:：]?\s*(.+)/i) ||
                       text.match(/(?:编辑|修改)\s*([abv]\d{1,2}|[abv]\s*\d{1,2})\s*(?:内容)?(?:为|成)[:：]?\s*(.+)/i) ||
                       text.match(/([abv]\d{1,2}|[abv]\s*\d{1,2})\s*(?:输入|写入|填入)(?:内容)?[:：]?\s*(.+)/i);
      if (editMatch) {
        const moduleNumber = this.normalizeModuleNumber(editMatch[1]);
        const content = editMatch[2]?.trim();
        console.log('[VoiceCanvasReporter] 匹配到输入指令:', { moduleNumber, content, original: transcript });
        return {
          action: 'edit',
          targetModule: moduleNumber,
          content: content
        };
      }

      // 生成内容：给A01生成内容、为B02生成、A01生成春天的诗歌
      const generateMatch = text.match(/(?:给|为)\s*([abv]\d{2}|[abv]\s*\d{1,2})\s*(?:生成|创建)(?:内容)?[:：]?\s*(.+)/i) ||
                           text.match(/([abv]\d{2}|[abv]\s*\d{1,2})\s*(?:生成|创建)\s*(.+)/i);
      if (generateMatch) {
        const moduleNumber = this.normalizeModuleNumber(generateMatch[1]);
        const content = generateMatch[2]?.trim();
        return {
          action: 'generate',
          targetModule: moduleNumber,
          content: content
        };
      }

      // 移动模块：把A01向右移动、A01向上移、移动B02到左边
      const moveMatch = text.match(/(?:把\s*)?([abv]\d{2}|[abv]\s*\d{1,2})\s*(?:向|往|到)\s*(上|下|左|右|顶部|底部|左边|右边)(?:移动|移)?/i) ||
                       text.match(/(?:移动)\s*([abv]\d{2}|[abv]\s*\d{1,2})\s*(?:向|往|到)\s*(上|下|左|右|顶部|底部|左边|右边)/i);
      if (moveMatch) {
        const moduleNumber = this.normalizeModuleNumber(moveMatch[1]);
        const direction = this.parseDirection(moveMatch[2], lang);
        return {
          action: 'move',
          targetModule: moduleNumber,
          direction: direction
        };
      }

      // 连接模块：把A01连接到B02、A01连B02、连接A01和B02、连起来、连接起来
      const connectMatch = text.match(/(?:把\s*)?([abv]\d{2}|[abv]\s*\d{1,2})\s*(?:连接?到?|连)\s*([abv]\d{2}|[abv]\s*\d{1,2})/i) ||
                          text.match(/(?:连接)\s*([abv]\d{2}|[abv]\s*\d{1,2})\s*(?:和|与)\s*([abv]\d{2}|[abv]\s*\d{1,2})/i) ||
                          text.match(/(?:连起来|连接起来)\s*([abv]\d{2}|[abv]\s*\d{1,2})\s*(?:和|与|到)\s*([abv]\d{2}|[abv]\s*\d{1,2})/i) ||
                          text.match(/([abv]\d{2}|[abv]\s*\d{1,2})\s*(?:连起来|连接起来)\s*([abv]\d{2}|[abv]\s*\d{1,2})/i);
      if (connectMatch) {
        const fromModule = this.normalizeModuleNumber(connectMatch[1]);
        const toModule = this.normalizeModuleNumber(connectMatch[2]);
        return {
          action: 'connect',
          targetModule: fromModule,
          connectTo: toModule
        };
      }

      // 复制模块：复制A01、拷贝B02
      const copyMatch = text.match(/(?:复制|拷贝|克隆)\s*([abv]\d{2}|[abv]\s*\d{1,2})/i);
      if (copyMatch) {
        const moduleNumber = this.normalizeModuleNumber(copyMatch[1]);
        return {
          action: 'copy',
          targetModule: moduleNumber
        };
      }

    } else {
      // English commands
      // Select module: select A01, choose B02, click V01
      const selectMatch = text.match(/(?:select|choose|click)\s*([abv]\d{2}|[abv]\s*\d{1,2})/i);
      if (selectMatch) {
        const moduleNumber = this.normalizeModuleNumber(selectMatch[1]);
        return {
          action: 'select',
          targetModule: moduleNumber
        };
      }

      // Regenerate: regenerate A01, regenerate content for A01
      const regenerateMatch = text.match(/(?:regenerate|re-generate)\s*(?:content\s*(?:for\s*)?)?([abv]\d{2}|[abv]\s*\d{1,2})/i) ||
                             text.match(/(?:regenerate|re-generate)\s*([abv]\d{2}|[abv]\s*\d{1,2})/i);
      if (regenerateMatch) {
        const moduleNumber = this.normalizeModuleNumber(regenerateMatch[1]);
        return {
          action: 'regenerate',
          targetModule: moduleNumber
        };
      }

      // Modify prompt: add running horse to B02, add romantic atmosphere to A01 prompt
      const modifyPromptMatch = text.match(/(?:add|include)\s*(.+?)\s*(?:to|in)\s*([abv]\d{2}|[abv]\s*\d{1,2})(?:\s*prompt)?/i) ||
                               text.match(/(?:modify|update)\s*([abv]\d{2}|[abv]\s*\d{1,2})\s*(?:prompt\s*)?(?:with|by\s*adding)\s*(.+)/i);
      if (modifyPromptMatch) {
        let moduleNumber: string, modification: string;
        if (modifyPromptMatch[2] && modifyPromptMatch[2].match(/[abv]\d{1,2}/i)) {
          // Pattern: add X to Y
          modification = modifyPromptMatch[1]?.trim() || '';
          moduleNumber = this.normalizeModuleNumber(modifyPromptMatch[2]);
        } else {
          // Pattern: modify X with Y
          moduleNumber = this.normalizeModuleNumber(modifyPromptMatch[1]);
          modification = modifyPromptMatch[2]?.trim() || '';
        }
        return {
          action: 'modify_prompt',
          targetModule: moduleNumber,
          promptModification: modification
        };
      }

      // Delete module: delete A01, remove B02
      const deleteMatch = text.match(/(?:delete|remove)\s*([abv]\d{2}|[abv]\s*\d{1,2})/i);
      if (deleteMatch) {
        const moduleNumber = this.normalizeModuleNumber(deleteMatch[1]);
        return {
          action: 'delete',
          targetModule: moduleNumber
        };
      }

      // Input/Edit content: input content to A01, edit A01 content, A01 input content
      const editMatch = text.match(/(?:input|enter|type)\s*(?:content\s*)?(?:to|in|into)\s*([abv]\d{2}|[abv]\s*\d{1,2})[:：]?\s*(.+)/i) ||
                       text.match(/(?:edit|modify)\s*([abv]\d{2}|[abv]\s*\d{1,2})\s*(?:content\s*)?(?:to|as)[:：]?\s*(.+)/i) ||
                       text.match(/([abv]\d{2}|[abv]\s*\d{1,2})\s*(?:input|enter|type)(?:\s*content)?[:：]?\s*(.+)/i);
      if (editMatch) {
        let moduleNumber: string, content: string;
        if (editMatch[2] && editMatch[2].match(/[abv]\d{1,2}/i)) {
          // Pattern: input content to A01
          content = editMatch[2]?.trim() || '';
          moduleNumber = this.normalizeModuleNumber(editMatch[1]);
        } else {
          // Pattern: edit A01 content to X or A01 input X
          moduleNumber = this.normalizeModuleNumber(editMatch[1]);
          content = editMatch[2]?.trim() || '';
        }
        return {
          action: 'edit',
          targetModule: moduleNumber,
          content: content
        };
      }

      // Generate content: generate content for A01, create for B02
      const generateMatch = text.match(/(?:generate|create)\s*(?:content\s*)?(?:for\s*)?([abv]\d{2}|[abv]\s*\d{1,2})[:：]?\s*(.+)/i);
      if (generateMatch) {
        const moduleNumber = this.normalizeModuleNumber(generateMatch[1]);
        const content = generateMatch[2]?.trim();
        return {
          action: 'generate',
          targetModule: moduleNumber,
          content: content
        };
      }

      // Move module: move A01 to the right, move B02 up
      const moveMatch = text.match(/(?:move)\s*([abv]\d{2}|[abv]\s*\d{1,2})\s*(?:to\s*the\s*)?(up|down|left|right|top|bottom)/i);
      if (moveMatch) {
        const moduleNumber = this.normalizeModuleNumber(moveMatch[1]);
        const direction = this.parseDirection(moveMatch[2], lang);
        return {
          action: 'move',
          targetModule: moduleNumber,
          direction: direction
        };
      }

      // Connect modules: connect A01 to B02, link A01 to B02, connect them
      const connectMatch = text.match(/(?:connect)\s*([abv]\d{2}|[abv]\s*\d{1,2})\s*(?:to|with)\s*([abv]\d{2}|[abv]\s*\d{1,2})/i) ||
                          text.match(/(?:link)\s*([abv]\d{2}|[abv]\s*\d{1,2})\s*(?:to|with)\s*([abv]\d{2}|[abv]\s*\d{1,2})/i) ||
                          text.match(/(?:connect them|link them)\s*([abv]\d{2}|[abv]\s*\d{1,2})\s*(?:and|to)\s*([abv]\d{2}|[abv]\s*\d{1,2})/i);
      if (connectMatch) {
        const fromModule = this.normalizeModuleNumber(connectMatch[1]);
        const toModule = this.normalizeModuleNumber(connectMatch[2]);
        return {
          action: 'connect',
          targetModule: fromModule,
          connectTo: toModule
        };
      }

      // Copy module: copy A01, duplicate B02
      const copyMatch = text.match(/(?:copy|duplicate|clone)\s*([abv]\d{2}|[abv]\s*\d{1,2})/i);
      if (copyMatch) {
        const moduleNumber = this.normalizeModuleNumber(copyMatch[1]);
        return {
          action: 'copy',
          targetModule: moduleNumber
        };
      }
    }

    return null;
  }

  /**
   * 标准化模块编号格式
   */
  private normalizeModuleNumber(input: string): string {
    // 移除空格并转换为大写
    const cleaned = input.replace(/\s+/g, '').toUpperCase();
    
    console.log('[VoiceCanvasReporter] 标准化模块编号:', { input, cleaned });
    
    // 匹配 A1, A01, A 1, A 01, a2, a02 等格式
    const match = cleaned.match(/([ABV])(\d{1,2})/);
    if (match) {
      const letter = match[1];
      const number = match[2].padStart(2, '0');
      const result = `${letter}${number}`;
      console.log('[VoiceCanvasReporter] 模块编号标准化结果:', { input, result });
      return result;
    }
    
    console.warn('[VoiceCanvasReporter] 无法标准化模块编号:', input);
    return cleaned;
  }

  /**
   * 解析方向指令
   */
  private parseDirection(directionText: string, lang: 'zh' | 'en'): 'up' | 'down' | 'left' | 'right' {
    const text = directionText.toLowerCase();
    
    if (lang === 'zh') {
      if (text.includes('上') || text.includes('顶')) return 'up';
      if (text.includes('下') || text.includes('底')) return 'down';
      if (text.includes('左')) return 'left';
      if (text.includes('右')) return 'right';
    } else {
      if (text.includes('up') || text.includes('top')) return 'up';
      if (text.includes('down') || text.includes('bottom')) return 'down';
      if (text.includes('left')) return 'left';
      if (text.includes('right')) return 'right';
    }
    
    return 'right'; // 默认向右
  }

  /**
   * 生成摘要文本
   */
  private generateSummaryText(byType: { text: number; image: number; video: number }, total: number, lang: 'zh' | 'en'): string {
    if (lang === 'zh') {
      if (total === 0) {
        return '画布为空';
      }
      
      const parts = [];
      if (byType.text > 0) parts.push(`${byType.text}个文本模块`);
      if (byType.image > 0) parts.push(`${byType.image}个图片模块`);
      if (byType.video > 0) parts.push(`${byType.video}个视频模块`);
      
      return `共${total}个模块：${parts.join('、')}`;
    } else {
      if (total === 0) {
        return 'Canvas is empty';
      }
      
      const parts = [];
      if (byType.text > 0) parts.push(`${byType.text} text module${byType.text > 1 ? 's' : ''}`);
      if (byType.image > 0) parts.push(`${byType.image} image module${byType.image > 1 ? 's' : ''}`);
      if (byType.video > 0) parts.push(`${byType.video} video module${byType.video > 1 ? 's' : ''}`);
      
      return `Total ${total} modules: ${parts.join(', ')}`;
    }
  }

  /**
   * 获取内容预览
   */
  private getContentPreview(block: Block): string {
    if (!block.content || !block.content.trim()) {
      return '';
    }

    if (block.type === 'text') {
      // 文本内容预览，最多20个字符
      return block.content.substring(0, 20) + (block.content.length > 20 ? '...' : '');
    } else if (block.type === 'image') {
      return '图片已生成';
    } else if (block.type === 'video') {
      return '视频已生成';
    }

    return '';
  }

  /**
   * 获取状态文本
   */
  private getStatusText(status: string, lang: 'zh' | 'en'): string {
    if (lang === 'zh') {
      switch (status) {
        case 'idle': return '就绪';
        case 'processing': return '生成中';
        case 'error': return '错误';
        default: return status;
      }
    } else {
      switch (status) {
        case 'idle': return 'ready';
        case 'processing': return 'generating';
        case 'error': return 'error';
        default: return status;
      }
    }
  }
}

export const voiceCanvasReporter = new VoiceCanvasReporter();