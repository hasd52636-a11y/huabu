/**
 * 语音指令库系统
 * 用于收集、学习和优化用户语音指令的识别精度
 */

export interface CommandPattern {
  id: string;
  command: 'generate_text' | 'generate_image' | 'generate_video' | 'add_to_canvas' | 
           'clear_canvas' | 'reset_view' | 'auto_layout' | 'copy_blocks' | 'delete_blocks' |
           'zoom_in' | 'zoom_out' | 'save_project' | 'export_pdf' | 'batch_generate' |
           'connect_blocks' | 'select_all' | 'undo' | 'redo' | 'show_config' | 'switch_theme';
  patterns: string[]; // 用户的不同说法
  confidence: number; // 置信度 0-1
  usage_count: number; // 使用次数
  success_rate: number; // 成功率
  created_at: number;
  updated_at: number;
}

export interface UserFeedback {
  original_text: string;
  recognized_command: string;
  actual_command: string;
  is_correct: boolean;
  timestamp: number;
  user_correction?: string;
}

export class VoiceCommandLibrary {
  private patterns: CommandPattern[] = [];
  private feedbacks: UserFeedback[] = [];
  private readonly STORAGE_KEY = 'voice_command_library';
  private readonly FEEDBACK_KEY = 'voice_command_feedback';

  constructor() {
    this.loadFromStorage();
    this.initializeDefaultPatterns();
  }

  // 初始化默认指令模式
  private initializeDefaultPatterns() {
    const defaultPatterns: Omit<CommandPattern, 'id' | 'created_at' | 'updated_at'>[] = [
      // 文字生成指令
      {
        command: 'generate_text',
        patterns: [
          '写', '写一段', '写段', '帮我写', '帮我写一段', '帮我写段',
          '描述', '描述一下', '描述一个', '帮我描述',
          '文字', '文本', '内容', '段落', '文章',
          '创作', '创作一段', '生成文字', '生成文本',
          '编写', '撰写', '起草', '草拟',
          '故事', '写个故事', '讲个故事',
          '诗', '写首诗', '作诗', '诗歌',
          '小说', '写小说', '科幻小说', '爱情小说'
        ],
        confidence: 0.9,
        usage_count: 0,
        success_rate: 1.0
      },
      // 图片生成指令
      {
        command: 'generate_image',
        patterns: [
          '画', '画一张', '画个', '帮我画', '帮我画一张',
          '图片', '图像', '图', '照片', '画面',
          '生成图片', '生成图像', '制作图片', '创建图片',
          '设计', '设计一张', '设计图片',
          '插画', '绘画', '美术', '艺术',
          '海报', '封面', '头像', '背景',
          '素材', '配图', '示意图'
        ],
        confidence: 0.9,
        usage_count: 0,
        success_rate: 1.0
      },
      // 视频生成指令
      {
        command: 'generate_video',
        patterns: [
          '视频', '录像', '影片', '短片',
          '制作视频', '生成视频', '创建视频',
          '动画', '动画片', '卡通',
          '电影', '微电影', '宣传片',
          '演示', '演示视频', '教程视频',
          '短视频', '长视频'
        ],
        confidence: 0.9,
        usage_count: 0,
        success_rate: 1.0
      },
      // 添加到画布指令
      {
        command: 'add_to_canvas',
        patterns: [
          '放到画布', '添加到画布', '加到画布',
          '放画布上', '加画布上', '添加画布',
          '拖到画布', '移到画布', '复制到画布',
          '保存到画布', '导入画布'
        ],
        confidence: 0.9,
        usage_count: 0,
        success_rate: 1.0
      },
      // 清空画布指令
      {
        command: 'clear_canvas',
        patterns: [
          '清空画布', '清除画布', '清理画布', '删除所有',
          '清空', '清除', '全部删除', '重新开始',
          '清空所有内容', '删除全部', '清空工作区'
        ],
        confidence: 0.95,
        usage_count: 0,
        success_rate: 1.0
      },
      // 重置视角指令
      {
        command: 'reset_view',
        patterns: [
          '重置视角', '重置画布', '回到中心', '居中显示',
          '重置缩放', '恢复视角', '回到原点', '重置位置',
          '画布居中', '视角居中', '回到默认视角'
        ],
        confidence: 0.95,
        usage_count: 0,
        success_rate: 1.0
      },
      // 自动布局指令
      {
        command: 'auto_layout',
        patterns: [
          '自动布局', '整理布局', '排列整齐', '自动排列',
          '整理画布', '优化布局', '重新排列', '自动整理',
          '布局优化', '排版', '整理排版'
        ],
        confidence: 0.95,
        usage_count: 0,
        success_rate: 1.0
      },
      // 复制块指令
      {
        command: 'copy_blocks',
        patterns: [
          '复制', '复制选中', '复制模块', '复制块',
          '拷贝', '克隆', '复制选择的', '复制这些',
          '复制当前选中', '复制已选择'
        ],
        confidence: 0.9,
        usage_count: 0,
        success_rate: 1.0
      },
      // 删除块指令
      {
        command: 'delete_blocks',
        patterns: [
          '删除', '删除选中', '删除模块', '删除块',
          '移除', '清除选中', '删掉', '去掉',
          '删除选择的', '删除这些', '删除当前选中'
        ],
        confidence: 0.9,
        usage_count: 0,
        success_rate: 1.0
      },
      // 放大指令
      {
        command: 'zoom_in',
        patterns: [
          '放大', '放大画布', '缩放放大', '拉近',
          '放大视图', '放大显示', '拉近看', '放大一点'
        ],
        confidence: 0.95,
        usage_count: 0,
        success_rate: 1.0
      },
      // 缩小指令
      {
        command: 'zoom_out',
        patterns: [
          '缩小', '缩小画布', '缩放缩小', '拉远',
          '缩小视图', '缩小显示', '拉远看', '缩小一点'
        ],
        confidence: 0.95,
        usage_count: 0,
        success_rate: 1.0
      },
      // 保存项目指令
      {
        command: 'save_project',
        patterns: [
          '保存', '保存项目', '保存工作', '存储',
          '保存当前', '保存画布', '保存文件', '存档'
        ],
        confidence: 0.95,
        usage_count: 0,
        success_rate: 1.0
      },
      // 导出PDF指令
      {
        command: 'export_pdf',
        patterns: [
          '导出PDF', '生成PDF', '保存PDF', '输出PDF',
          '导出文档', '生成文档', '保存文档', '打印PDF'
        ],
        confidence: 0.95,
        usage_count: 0,
        success_rate: 1.0
      },
      // 批量生成指令
      {
        command: 'batch_generate',
        patterns: [
          '批量生成', '批量处理', '一键生成', '全部生成',
          '批量创建', '批量制作', '自动生成所有', '批处理'
        ],
        confidence: 0.9,
        usage_count: 0,
        success_rate: 1.0
      },
      // 连接块指令
      {
        command: 'connect_blocks',
        patterns: [
          '连接', '连接模块', '连接块', '建立连接',
          '连线', '关联', '链接', '连接选中',
          '建立关系', '连接这些'
        ],
        confidence: 0.9,
        usage_count: 0,
        success_rate: 1.0
      },
      // 全选指令
      {
        command: 'select_all',
        patterns: [
          '全选', '选择全部', '选中所有', '全部选中',
          '选择所有模块', '选中全部', '全选模块'
        ],
        confidence: 0.95,
        usage_count: 0,
        success_rate: 1.0
      },
      // 撤销指令
      {
        command: 'undo',
        patterns: [
          '撤销', '撤回', '后退', '取消上一步',
          '撤销操作', '回退', '撤销上一步', '恢复'
        ],
        confidence: 0.95,
        usage_count: 0,
        success_rate: 1.0
      },
      // 重做指令
      {
        command: 'redo',
        patterns: [
          '重做', '前进', '恢复', '重新执行',
          '重做操作', '再次执行', '恢复撤销'
        ],
        confidence: 0.95,
        usage_count: 0,
        success_rate: 1.0
      },
      // 显示配置指令
      {
        command: 'show_config',
        patterns: [
          '打开设置', '显示设置', '配置', '设置',
          '打开配置', '显示配置', '系统设置', '参数设置',
          '打开选项', '设置选项'
        ],
        confidence: 0.9,
        usage_count: 0,
        success_rate: 1.0
      },
      // 切换主题指令
      {
        command: 'switch_theme',
        patterns: [
          '切换主题', '换主题', '改变主题', '主题切换',
          '深色模式', '浅色模式', '暗色主题', '亮色主题',
          '夜间模式', '日间模式', '切换颜色'
        ],
        confidence: 0.9,
        usage_count: 0,
        success_rate: 1.0
      }
    ];

    // 只添加不存在的默认模式
    defaultPatterns.forEach(pattern => {
      if (!this.patterns.some(p => p.command === pattern.command)) {
        this.addPattern({
          ...pattern,
          id: this.generateId(),
          created_at: Date.now(),
          updated_at: Date.now()
        });
      }
    });
  }

  // 智能匹配指令
  public matchCommand(text: string): {
    command: string;
    confidence: number;
    matched_pattern?: string;
  } {
    const normalizedText = text.toLowerCase().trim();
    let bestMatch = { command: 'unknown', confidence: 0, matched_pattern: '' };

    for (const pattern of this.patterns) {
      for (const patternText of pattern.patterns) {
        const confidence = this.calculateSimilarity(normalizedText, patternText);
        
        // 考虑模式的历史成功率
        const adjustedConfidence = confidence * pattern.success_rate * pattern.confidence;
        
        if (adjustedConfidence > bestMatch.confidence) {
          bestMatch = {
            command: pattern.command,
            confidence: adjustedConfidence,
            matched_pattern: patternText
          };
        }
      }
    }

    // 只有置信度超过阈值才返回匹配结果
    if (bestMatch.confidence < 0.6) {
      return { command: 'unknown', confidence: 0 };
    }

    // 更新使用统计
    this.updateUsageStats(bestMatch.command);

    return bestMatch;
  }

  // 计算文本相似度
  private calculateSimilarity(text1: string, text2: string): number {
    // 完全匹配
    if (text1.includes(text2) || text2.includes(text1)) {
      return 1.0;
    }

    // 编辑距离算法
    const distance = this.levenshteinDistance(text1, text2);
    const maxLength = Math.max(text1.length, text2.length);
    
    if (maxLength === 0) return 1.0;
    
    return 1 - (distance / maxLength);
  }

  // 编辑距离算法
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  // 添加用户反馈
  public addFeedback(feedback: Omit<UserFeedback, 'timestamp'>) {
    const newFeedback: UserFeedback = {
      ...feedback,
      timestamp: Date.now()
    };

    this.feedbacks.push(newFeedback);
    this.saveToStorage();

    // 如果用户纠正了识别结果，学习新模式
    if (!feedback.is_correct && feedback.user_correction) {
      this.learnFromCorrection(feedback.original_text, feedback.user_correction);
    }

    // 更新成功率
    this.updateSuccessRate(feedback.recognized_command, feedback.is_correct);
  }

  // 从用户纠正中学习
  private learnFromCorrection(originalText: string, correctedCommand: string) {
    const pattern = this.patterns.find(p => p.command === correctedCommand);
    
    if (pattern) {
      // 添加新的表达方式
      if (!pattern.patterns.includes(originalText.toLowerCase())) {
        pattern.patterns.push(originalText.toLowerCase());
        pattern.updated_at = Date.now();
        this.saveToStorage();
      }
    } else {
      // 创建新的指令模式
      this.addPattern({
        id: this.generateId(),
        command: correctedCommand as any,
        patterns: [originalText.toLowerCase()],
        confidence: 0.8,
        usage_count: 1,
        success_rate: 1.0,
        created_at: Date.now(),
        updated_at: Date.now()
      });
    }
  }

  // 更新成功率
  private updateSuccessRate(command: string, isCorrect: boolean) {
    const pattern = this.patterns.find(p => p.command === command);
    if (pattern) {
      const totalFeedbacks = this.feedbacks.filter(f => f.recognized_command === command).length;
      const successfulFeedbacks = this.feedbacks.filter(f => f.recognized_command === command && f.is_correct).length;
      
      pattern.success_rate = totalFeedbacks > 0 ? successfulFeedbacks / totalFeedbacks : 1.0;
      pattern.updated_at = Date.now();
      this.saveToStorage();
    }
  }

  // 更新使用统计
  private updateUsageStats(command: string) {
    const pattern = this.patterns.find(p => p.command === command);
    if (pattern) {
      pattern.usage_count++;
      pattern.updated_at = Date.now();
      this.saveToStorage();
    }
  }

  // 添加新模式
  private addPattern(pattern: CommandPattern) {
    this.patterns.push(pattern);
    this.saveToStorage();
  }

  // 获取统计信息
  public getStats() {
    return {
      total_patterns: this.patterns.length,
      total_feedbacks: this.feedbacks.length,
      patterns_by_command: this.patterns.reduce((acc, pattern) => {
        acc[pattern.command] = (acc[pattern.command] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      average_success_rate: this.patterns.reduce((sum, p) => sum + p.success_rate, 0) / this.patterns.length,
      most_used_patterns: this.patterns
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 10)
        .map(p => ({ command: p.command, usage_count: p.usage_count, success_rate: p.success_rate }))
    };
  }

  // 导出学习数据（用于分析）
  public exportLearningData() {
    return {
      patterns: this.patterns,
      feedbacks: this.feedbacks,
      stats: this.getStats(),
      exported_at: Date.now()
    };
  }

  // 清理旧数据
  public cleanup(daysToKeep: number = 30) {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    this.feedbacks = this.feedbacks.filter(f => f.timestamp > cutoffTime);
    this.saveToStorage();
  }

  // 存储到本地
  private saveToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.patterns));
      localStorage.setItem(this.FEEDBACK_KEY, JSON.stringify(this.feedbacks));
    } catch (error) {
      console.error('Failed to save voice command library:', error);
    }
  }

  // 从本地加载
  private loadFromStorage() {
    try {
      const patternsData = localStorage.getItem(this.STORAGE_KEY);
      const feedbacksData = localStorage.getItem(this.FEEDBACK_KEY);
      
      if (patternsData) {
        this.patterns = JSON.parse(patternsData);
      }
      
      if (feedbacksData) {
        this.feedbacks = JSON.parse(feedbacksData);
      }
    } catch (error) {
      console.error('Failed to load voice command library:', error);
    }
  }

  // 生成唯一ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// 单例实例
export const voiceCommandLibrary = new VoiceCommandLibrary();