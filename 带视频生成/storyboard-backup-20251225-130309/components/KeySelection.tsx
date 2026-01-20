
import React, { useState, useEffect } from 'react';
import { ModelProvider, ProviderConfig, I18N, Language, Theme } from '../types';
import { testApiConnection } from '../geminiService';

interface KeySelectionProps {
  onSuccess: () => void;
  lang: Language;
  theme?: Theme;
  onLangChange?: (lang: Language) => void;
  onThemeChange?: (theme: Theme) => void;
}

const PROVIDERS = [
  { id: 'gemini', name: 'Gemini (Official)', logo: '✨' },
  { id: 'zhipu', name: '智谱 AI (ChatGLM)', logo: '🧠' },
  { id: 'qianwen', name: '通义千问 (Qwen)', logo: '☁️' },
  { id: 'deepseek', name: 'DeepSeek', logo: '🔍' },
  { id: 'openai', name: 'OpenAI', logo: '🤖' },
  { id: 'custom', name: 'Third-party (Custom)', logo: '🛠️' },
];

const PROVIDER_CONFIG: Record<string, { baseUrl: string; llmModel: string; imageModel: string }> = {
  zhipu: {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    llmModel: 'glm-4',
    imageModel: 'cogview-4-250304'
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    llmModel: 'deepseek-chat',
    imageModel: 'deepseek-chat'
  },
  qianwen: {
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    llmModel: 'qwen-max',
    imageModel: 'qwen-vl-max'
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    llmModel: 'gpt-4o',
    imageModel: 'dall-e-3'
  },
  custom: {
    baseUrl: 'https://api.example.com/v1',
    llmModel: 'model-name',
    imageModel: 'image-model-name'
  }
};

const KeySelection: React.FC<KeySelectionProps> = ({ onSuccess, lang, theme = 'dark', onLangChange, onThemeChange }) => {
  const [config, setConfig] = useState<ProviderConfig>({
    provider: 'gemini',
    apiKey: '',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    llmModel: '',
    imageModel: ''
  });
  const [selectedLang, setSelectedLang] = useState<Language>(lang);
  const [selectedTheme, setSelectedTheme] = useState<Theme>(theme);
  const [testStatus, setTestStatus] = useState<{ llm?: 'idle' | 'loading' | 'success' | 'failed'; image?: 'idle' | 'loading' | 'success' | 'failed' }>({});
  const [showHelp, setShowHelp] = useState(false);

  const t = I18N[selectedLang];

  const helpContent = {
    zh: {
      title: '使用说明',
      sections: [
        {
          title: '1. 产品功能及定位',
          content: '分镜大师是一个 AI 智能分镜创作平台，帮助创意工作者快速生成专业的视频分镜。支持多种 AI 模型，包括 Gemini、智谱、OpenAI 等。'
        },
        {
          title: '2. API 设置',
          content: '选择您要使用的 AI 服务商，输入对应的 API Key、Base URL 和模型名称。系统支持分离的对话模型（LLM）和图像生成模型（Image），可根据需要分别配置。点击 Test 按钮验证配置是否正确。'
        },
        {
          title: '3. 左侧工具栏功能',
          content: '✋ 平移工具：拖动画布移动视图\n🎯 选择工具：框选或 Shift+点击选择分镜\n📥 上传工具：上传参考主体（1张）或分镜图片（最多6张）\n⚙️ 设置：配置 API 接口\n🌸/⚫ 颜色模式：切换彩色（🌸）或黑白素描（⚫）\n缩放显示：当前画布缩放比例\n🌙/☀️ 主题：深色/浅色模式\n中/EN：语言切换'
        },
        {
          title: '4. 剧本生成模式',
          content: '步骤：\n① 输入视频剧本文本\n② 选择分镜数量（推荐 4-8 张）\n③ 选择视觉风格（电影风格、科幻、赛博朋克等）\n④ 可选：设置画面比例和总时长\n⑤ 点击"开始生成"按钮\n系统会根据剧本自动生成对应数量的分镜图片。如果上传了参考主体，系统会保持角色一致性。\n\n📐 画面比例说明：\n• 16:9（默认）：标准宽屏，适合电影、视频\n• 4:3：传统比例，适合演讲、教学\n• 9:16：竖屏比例，适合短视频、手机\n• 1:1：正方形，适合社交媒体\n• 21:9：超宽屏，适合电影级效果\n• 4:5、3:2：其他常用比例\n不选择时默认使用 16:9。'
        },
        {
          title: '4.1 有参考主体的剧本生成',
          content: '场景：您有一个角色形象，想基于剧本生成保持该角色一致的分镜。\n操作步骤：\n① 点击左侧 📥 上传工具 → 选择"参考主体"\n② 上传 1 张参考角色图片（系统会自动设为参考主体）\n③ 切换到"剧本生成"标签\n④ 输入剧本文本\n⑤ 选择分镜数量、风格等参数\n⑥ 点击"开始生成"\n生成逻辑：系统会在每张生成的分镜中保持参考主体的外观特征 100% 一致，确保角色连贯性。'
        },
        {
          title: '4.2 无参考主体的剧本生成',
          content: '场景：您只有剧本，想快速生成分镜概念图，不需要特定角色。\n操作步骤：\n① 直接切换到"剧本生成"标签（不上传参考主体）\n② 输入剧本文本\n③ 选择分镜数量、风格等参数\n④ 点击"开始生成"\n生成逻辑：系统根据剧本内容自由创作分镜，每张图片可能有不同的角色和场景设计。适合概念阶段或多角色故事。'
        },
        {
          title: '5. 创意对话模式',
          content: '场景：您没有完整剧本，想通过与 AI 对话逐步构思分镜。\n操作步骤：\n① 切换到"创意对话"标签\n② 在输入框输入您的创意想法（例如："一个科幻场景，主角在太空站里"）\n③ 点击 🚀 发送按钮\n④ AI 会理解您的想法并生成对应的分镜场景\n⑤ 继续对话，逐步完善场景细节\n⑥ 选择分镜数量、风格和画面比例\n⑦ 当满意时，点击"生成分镜"按钮生成对应的图片\n⑧ 如果想清除之前的对话重新开始，点击 🧹 清除按钮\n\n📐 画面比例选择：在生成前选择合适的比例，所有生成的分镜都会使用该比例。'
        },
        {
          title: '5.1 创意对话的生图逻辑',
          content: '对话流程：\n① 用户输入创意描述 → AI 理解并转化为场景\n② 用户可继续对话补充细节 → AI 记住上下文\n③ 用户点击"生成分镜" → 系统将整个对话转化为分镜场景\n\n生图规则：\n• 系统提取对话中的最后一条用户消息作为主要内容\n• 之前的对话作为背景上下文\n• 生成的分镜数量由用户在界面上选择\n• 每个分镜对应一个场景，按对话逻辑顺序编号\n\n⚠️ 重要：多轮对话会被融合到一起。如果想生成不同风格的分镜，需要清除对话历史后重新开始。'
        },
        {
          title: '5.2 创意对话的最佳实践',
          content: '示例 1：逐步构思\n用户：一个科幻电影的开场\n→ AI 生成初步场景\n用户：加入更多细节，主角应该是一个女性宇航员\n→ AI 更新理解\n用户：场景应该在月球基地\n→ AI 再次调整\n用户：点击"生成分镜" → 生成 4 张融合所有细节的分镜\n\n示例 2：清除重新开始\n用户：完成了科幻场景的分镜\n用户：点击 🧹 清除按钮\n用户：开始新的对话，描述悬疑场景\n→ 系统不会混合之前的科幻内容'
        },
        {
          title: '6. 图片选择与排序',
          content: '选择方式：\n• 框选：在画布上拖动鼠标框选多张图片\n• Shift+点击：逐个选择图片\n• Ctrl+A：全选所有图片\n排序逻辑：\n• 框选时的选择顺序会被记录\n• 导出时按照选择顺序编号（SC-01, SC-02...）\n• 如果没有框选顺序，则按照画布位置排序（从左上到右下）'
        },
        {
          title: '7. 导出分镜图功能',
          content: '步骤：\n① 框选或选择要导出的分镜图片\n② 点击右侧"导出分镜图（JPEG）"按钮\n或右键点击任意选中的图片，选择"导出分镜图"\n③ 系统会生成一张 JPEG 文件，包含：\n  • 参考主体（如有）：左侧红色虚线框\n  • 分镜图片：按选择顺序排列，蓝色实线框\n  • 场景编号：SC-01, SC-02 等\n④ 自动下载到本地\n布局说明：有参考主体时最多 2 列，无参考主体时根据数量自动调整列数。\n\n⚠️ 重要：所有导出的分镜必须是同一个比例！如果混合了不同比例的分镜，系统会提示错误。'
        },
        {
          title: '7.1 画面比例详解与应用场景',
          content: '比例选择指南：\n\n📺 16:9（默认、最常用）\n• 用途：电影、电视、YouTube、大多数视频平台\n• 特点：宽屏，适合横向构图\n• 示例：电影分镜、电视剧、宣传视频\n\n📱 9:16（竖屏）\n• 用途：短视频、TikTok、Instagram Reels、手机竖屏\n• 特点：竖屏，适合竖向构图\n• 示例：手机短视频、竖屏广告\n\n🎬 21:9（超宽屏）\n• 用途：电影级效果、高端视频\n• 特点：极宽，适合全景、大场景\n• 示例：电影开场、风景镜头\n\n⬜ 1:1（正方形）\n• 用途：社交媒体、Instagram、微博\n• 特点：正方形，适合对称构图\n• 示例：社交媒体内容、头像\n\n📐 4:3（传统）\n• 用途：演讲、教学、旧电视\n• 特点：较宽，适合信息展示\n• 示例：教学视频、演讲\n\n🖼️ 4:5、3:2（其他）\n• 用途：特定平台或创意需求\n• 特点：介于常用比例之间\n• 示例：特殊格式视频\n\n💡 选择建议：\n• 不确定时选 16:9（最通用）\n• 手机内容选 9:16\n• 电影效果选 21:9\n• 社交媒体选 1:1\n\n⚠️ 混合比例导出：\n• 画布可以混合多个比例的分镜\n• 但导出时必须选择同一比例的分镜\n• 如果选中了不同比例的分镜，系统会提示错误\n• 解决方案：分别导出不同比例的分镜'
        },
        {
          title: '8. 图片操作',
          content: '右键菜单选项：\n• 设为参考主体：将选中图片设为参考主体\n• 上传替换图片：用本地图片替换当前分镜\n• 重绘（查看脚本）：编辑提示词后重新生成图片\n• 批量重绘：选中多张图片后，为每张输入改进指令\n• 克隆镜头：复制当前图片到新位置\n• 导出分镜图：导出所有选中的图片为 JPEG\n• 删除镜头：删除当前图片\n拖动调整：点击并拖动图片可以移动位置\n缩放调整：拖动右下角的小三角形可以调整图片大小'
        },
        {
          title: '9. 颜色模式详解',
          content: '🌸 彩色模式（默认）：\n• 生成彩色分镜图片\n• 适合最终呈现和客户展示\n⚫ 黑白素描模式：\n• 生成黑白线稿风格的分镜\n• 适合快速草稿和概念设计\n• 线条简洁，便于后期修改\n切换方式：点击左侧工具栏的颜色按钮切换\n影响范围：仅影响新生成的图片，已生成的图片不会改变'
        },
        {
          title: '10. 导出提示词功能',
          content: '步骤：\n① 选择要导出的分镜图片\n② 点击"导出提示词"按钮\n③ 可以预览和编辑提示词内容\n④ 点击"导出"下载为 TXT 文件\n用途：保存生成参数，便于后续调整或在其他工具中使用'
        },
        {
          title: '11. 快捷键',
          content: 'Ctrl+A：全选所有分镜图片\nCtrl+滚轮：缩放画布（在参考主体上滚轮可单独缩放参考主体）\n鼠标拖动：平移画布（需要先选择平移工具）\nShift+点击：逐个选择/取消选择图片\n鼠标框选：拖动鼠标框选多张图片\n右键点击：打开图片操作菜单'
        },
        {
          title: '12. 常见问题',
          content: '问：如何保持角色一致性？\n答：上传参考主体图片，系统会在生成时保持角色外观一致。\n\n问：导出的图片排序不对？\n答：确保按照想要的顺序框选图片，系统会按框选顺序编号。\n\n问：黑白模式生成的还是彩色？\n答：切换颜色模式后生成的新图片才会应用该模式。\n\n问：如何清除创意对话的历史？\n答：点击输入框旁的 🧹 清除按钮清除对话历史。\n\n问：创意对话和剧本生成有什么区别？\n答：剧本生成适合有完整脚本的情况，创意对话适合逐步构思的情况。\n\n问：为什么导出时提示"分镜必须是同一个比例"？\n答：系统要求导出的所有分镜使用同一比例。如果混合了不同比例，需要分别导出。\n\n问：如何生成不同比例的分镜？\n答：在生成前选择所需比例，所有生成的分镜都会使用该比例。可以多次生成不同比例的分镜。\n\n问：画布里可以混合不同比例吗？\n答：可以。画布支持混合多个比例的分镜，但导出时必须选择同一比例的分镜。\n\n问：如何调整已生成分镜的大小？\n答：拖动分镜右下角的小三角形可以调整大小，系统会自动保持原有的比例。'
        }
      ]
    },
    en: {
      title: 'User Guide',
      sections: [
        {
          title: '1. Product Features & Positioning',
          content: 'Storyboard Master is an AI-powered storyboarding platform that helps creative professionals quickly generate professional video storyboards. It supports multiple AI models including Gemini, Zhipu, OpenAI, and more.'
        },
        {
          title: '2. API Configuration',
          content: 'Select your preferred AI service provider and enter the corresponding API Key, Base URL, and model names. The system supports separate dialogue models (LLM) and image generation models (Image), which can be configured independently. Click the Test button to verify your configuration.'
        },
        {
          title: '3. Left Toolbar Functions',
          content: '✋ Pan Tool: Drag to move canvas view\n🎯 Select Tool: Box select or Shift+click to select frames\n📥 Upload Tool: Upload reference subject (1 image) or storyboard frames (max 6)\n⚙️ Settings: Configure API interface\n🌸/⚫ Color Mode: Toggle between color (🌸) or B&W sketch (⚫)\nZoom Display: Current canvas zoom level\n🌙/☀️ Theme: Dark/Light mode\n中/EN: Language toggle'
        },
        {
          title: '4. Script to Viz Mode',
          content: 'Steps:\n① Enter your video script text\n② Select number of scenes (recommended 4-8)\n③ Choose visual style (Cinematic, Sci-Fi, Cyberpunk, etc.)\n④ Optional: Set aspect ratio and total duration\n⑤ Click "Gen Frames" button\nThe system automatically generates storyboard images based on your script. If you uploaded a reference subject, the system maintains character consistency.\n\n📐 Aspect Ratio Guide:\n• 16:9 (Default): Standard widescreen, ideal for movies, videos\n• 4:3: Traditional ratio, ideal for presentations, teaching\n• 9:16: Portrait ratio, ideal for short videos, mobile\n• 1:1: Square, ideal for social media\n• 21:9: Ultra-wide, ideal for cinematic effects\n• 4:5, 3:2: Other common ratios\nDefault is 16:9 if not selected.'
        },
        {
          title: '4.1 Script to Viz with Reference Subject',
          content: 'Scenario: You have a character design and want to generate storyboards based on script while maintaining character consistency.\nSteps:\n① Click left toolbar 📥 Upload → Select "Import Ref Subject"\n② Upload 1 reference character image (auto-set as reference)\n③ Switch to "Script to Viz" tab\n④ Enter script text\n⑤ Select scene count, style, and other parameters\n⑥ Click "Gen Frames"\nGeneration Logic: System maintains 100% consistency of reference subject appearance in every generated frame, ensuring character continuity.'
        },
        {
          title: '4.2 Script to Viz without Reference Subject',
          content: 'Scenario: You only have a script and want quick concept storyboards without specific character requirements.\nSteps:\n① Switch to "Script to Viz" tab (no reference upload)\n② Enter script text\n③ Select scene count, style, and other parameters\n④ Click "Gen Frames"\nGeneration Logic: System freely creates storyboards based on script content. Each image may feature different characters and scene designs. Ideal for concept stage or multi-character stories.'
        },
        {
          title: '5. Creative Chat Mode',
          content: 'Scenario: You don\'t have a complete script and want to gradually develop storyboards through AI conversation.\nSteps:\n① Switch to "Creative Chat" tab\n② Enter your creative idea in the input field (e.g., "A sci-fi scene with the protagonist in a space station")\n③ Click 🚀 send button\n④ AI understands your idea and generates corresponding storyboard scenes\n⑤ Continue conversation to refine scene details\n⑥ Select scene count, style, and aspect ratio\n⑦ When satisfied, click "Generate Storyboard" to create images\n⑧ To clear history and start fresh, click 🧹 clear button\n\n📐 Aspect Ratio Selection: Choose the appropriate ratio before generating. All generated storyboards will use that ratio.'
        },
        {
          title: '5.1 Creative Chat Image Generation Logic',
          content: 'Conversation Flow:\n① User inputs creative description → AI understands and converts to scenes\n② User continues conversation to add details → AI remembers context\n③ User clicks "Generate Storyboard" → System converts entire conversation to storyboard scenes\n\nGeneration Rules:\n• System extracts the last user message as primary content\n• Previous conversation serves as background context\n• Scene count is selected by user in the interface\n• Each scene corresponds to a scene, numbered sequentially by conversation logic\n\n⚠️ Important: Multi-turn conversations are merged together. To generate different style storyboards, clear chat history and start fresh.'
        },
        {
          title: '5.2 Creative Chat Best Practices',
          content: 'Example 1: Gradual Development\nUser: A sci-fi movie opening scene\n→ AI generates initial scene\nUser: Add more details, protagonist should be a female astronaut\n→ AI updates understanding\nUser: Scene should be on lunar base\n→ AI adjusts again\nUser: Click "Generate Storyboard" → Generates 4 frames with all details merged\n\nExample 2: Clear and Restart\nUser: Completed sci-fi storyboards\nUser: Click 🧹 clear button\nUser: Start new conversation describing mystery scene\n→ System won\'t mix previous sci-fi content'
        },
        {
          title: '6. Image Selection & Ordering',
          content: 'Selection Methods:\n• Box Select: Drag mouse on canvas to select multiple images\n• Shift+Click: Select images one by one\n• Ctrl+A: Select all images\nOrdering Logic:\n• Selection order during box select is recorded\n• Export uses selection order for numbering (SC-01, SC-02...)\n• If no selection order, sorts by canvas position (top-left to bottom-right)'
        },
        {
          title: '7. Export Storyboard Feature',
          content: 'Steps:\n① Select storyboard images to export\n② Click "Export Storyboard (JPEG)" button on the right\nOr right-click selected image and choose "Export Storyboard"\n③ System generates a JPEG file containing:\n  • Reference Subject (if any): Left side with red dashed border\n  • Storyboard Frames: Arranged by selection order, blue solid border\n  • Scene Numbers: SC-01, SC-02, etc.\n④ Auto-downloads to your device\nLayout: Max 2 columns with reference subject, auto-adjusts without reference.\n\n⚠️ Important: All exported frames must be the same aspect ratio! If you mix different ratios, the system will show an error.'
        },
        {
          title: '7.1 Aspect Ratio Guide & Use Cases',
          content: 'Aspect Ratio Selection Guide:\n\n📺 16:9 (Default, Most Common)\n• Use: Movies, TV, YouTube, most video platforms\n• Feature: Widescreen, ideal for horizontal composition\n• Example: Movie storyboards, TV series, promotional videos\n\n📱 9:16 (Portrait)\n• Use: Short videos, TikTok, Instagram Reels, mobile vertical\n• Feature: Portrait, ideal for vertical composition\n• Example: Mobile short videos, vertical ads\n\n🎬 21:9 (Ultra-wide)\n• Use: Cinematic effects, premium videos\n• Feature: Ultra-wide, ideal for panoramic, large scenes\n• Example: Movie opening, landscape shots\n\n⬜ 1:1 (Square)\n• Use: Social media, Instagram, Weibo\n• Feature: Square, ideal for symmetric composition\n• Example: Social media content, avatars\n\n📐 4:3 (Traditional)\n• Use: Presentations, teaching, old TV\n• Feature: Wider, ideal for information display\n• Example: Educational videos, presentations\n\n🖼️ 4:5, 3:2 (Others)\n• Use: Specific platforms or creative needs\n• Feature: Between common ratios\n• Example: Special format videos\n\n💡 Selection Tips:\n• Unsure? Choose 16:9 (most universal)\n• Mobile content? Choose 9:16\n• Cinematic effect? Choose 21:9\n• Social media? Choose 1:1\n\n⚠️ Mixed Ratio Export:\n• Canvas can mix multiple aspect ratios\n• But export requires same ratio for all frames\n• If you select different ratios, system shows error\n• Solution: Export different ratios separately'
        },
        {
          title: '8. Image Operations',
          content: 'Right-Click Menu Options:\n• Set as Main: Set image as reference subject\n• Upload & Replace: Replace with local image\n• Redraw Frame: Edit prompt and regenerate\n• Batch Redraw: Input improvement instructions for multiple selected frames\n• Clone: Duplicate image to new position\n• Export Storyboard: Export all selected images as JPEG\n• Remove: Delete current image\nDrag to Move: Click and drag image to reposition\nResize: Drag bottom-right corner triangle to adjust size'
        },
        {
          title: '9. Color Mode Explained',
          content: '🌸 Color Mode (Default):\n• Generates color storyboard images\n• Best for final presentation and client review\n⚫ B&W Sketch Mode:\n• Generates black & white sketch-style storyboards\n• Perfect for quick drafts and concept design\n• Clean lines, easy to modify\nToggle: Click color button in left toolbar\nScope: Only affects newly generated images, existing images unchanged'
        },
        {
          title: '10. Export Prompts Feature',
          content: 'Steps:\n① Select storyboard images\n② Click "Export Prompts" button\n③ Preview and edit prompt content\n④ Click "Export" to download as TXT file\nUse: Save generation parameters for future adjustments or use in other tools'
        },
        {
          title: '11. Keyboard Shortcuts',
          content: 'Ctrl+A: Select all storyboard images\nCtrl+Scroll: Zoom canvas (scroll on reference subject to zoom it individually)\nMouse Drag: Pan canvas (requires pan tool selected first)\nShift+Click: Select/deselect images one by one\nMouse Box Select: Drag to select multiple images\nRight-Click: Open image operation menu'
        },
        {
          title: '12. FAQ',
          content: 'Q: How to maintain character consistency?\nA: Upload a reference subject image, system maintains character appearance.\n\nQ: Export image order is wrong?\nA: Make sure to box-select images in desired order, system numbers by selection order.\n\nQ: B&W mode still generates color?\nA: New images generated after switching mode will apply the new mode.\n\nQ: How to clear Creative Chat history?\nA: Click the 🧹 clear button next to the input field.\n\nQ: What\'s the difference between Script to Viz and Creative Chat?\nA: Script to Viz is for complete scripts, Creative Chat is for gradual ideation.\n\nQ: Why does export show "frames must be same aspect ratio"?\nA: System requires all exported frames use same ratio. If mixed, export separately.\n\nQ: How to generate different aspect ratios?\nA: Select desired ratio before generating. All generated frames use that ratio. Can generate multiple times with different ratios.\n\nQ: Can canvas mix different aspect ratios?\nA: Yes. Canvas supports mixed ratios, but export requires same ratio for all selected frames.\n\nQ: How to resize generated frames?\nA: Drag the small triangle at bottom-right corner. System auto-maintains original aspect ratio.'
        }
      ]
    }
  };

  const currentHelp = helpContent[selectedLang];

  useEffect(() => {
    const saved = localStorage.getItem('director_canvas_api_config');
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  const handleSave = () => {
    localStorage.setItem('director_canvas_api_config', JSON.stringify(config));
    if (onLangChange && selectedLang !== lang) {
      onLangChange(selectedLang);
    }
    if (onThemeChange && selectedTheme !== theme) {
      onThemeChange(selectedTheme);
    }
    onSuccess();
  };

  const handleOfficialGemini = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      const newConfig = { ...config, provider: 'gemini' as ModelProvider };
      localStorage.setItem('director_canvas_api_config', JSON.stringify(newConfig));
      onSuccess();
    }
  };

  const runApiTest = async (type: 'llm' | 'image') => {
    setTestStatus(prev => ({ ...prev, [type]: 'loading' }));
    try {
      const success = await testApiConnection(config, type);
      setTestStatus(prev => ({ ...prev, [type]: success ? 'success' : 'failed' }));
      if (!success) {
        setTimeout(() => setTestStatus(prev => ({ ...prev, [type]: 'idle' })), 3000);
      }
    } catch (e) {
      setTestStatus(prev => ({ ...prev, [type]: 'failed' }));
      setTimeout(() => setTestStatus(prev => ({ ...prev, [type]: 'idle' })), 3000);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6 ${theme === 'light' ? 'bg-white/90' : ''}`}>
      <div className={`max-w-2xl w-full border rounded-[3rem] p-12 shadow-2xl text-left animate-in zoom-in-95 duration-500 ${theme === 'dark' ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200'}`}>
        <div className="flex items-center gap-6 mb-10 justify-between">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-purple-500/20">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h2 className={`text-3xl font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{t.apiConfig}</h2>
              <p className={`font-bold mt-1 ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Configure your creative brain</p>
            </div>
          </div>
          <button
            onClick={onSuccess}
            className={`w-10 h-10 flex items-center justify-center rounded-full border-2 transition-all ${theme === 'dark' ? 'border-white/20 text-white hover:border-white/50 hover:bg-white/10' : 'border-zinc-300 text-black hover:border-zinc-500 hover:bg-zinc-100'}`}
            title={lang === 'zh' ? '关闭' : 'Close'}
          >
            ✕
          </button>
        </div>

        {/* Language & Theme Settings */}
        <div className={`grid grid-cols-2 gap-8 mb-10 pb-10 border-b ${theme === 'dark' ? 'border-white/10' : 'border-zinc-200'}`}>
          <div className="space-y-4">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{t.language}</label>
            <div className="flex gap-3">
              {(['zh', 'en'] as Language[]).map(l => (
                <button
                  key={l}
                  onClick={() => setSelectedLang(l)}
                  className={`flex-1 py-3 rounded-xl border font-black uppercase text-xs tracking-widest transition-all ${selectedLang === l ? 'bg-purple-600 border-purple-600 text-white' : `${theme === 'dark' ? 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20' : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}`}
                >
                  {l === 'zh' ? '中文' : 'English'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{t.theme}</label>
            <div className="flex gap-3">
              {(['dark', 'light'] as Theme[]).map(th => (
                <button
                  key={th}
                  onClick={() => setSelectedTheme(th)}
                  className={`flex-1 py-3 rounded-xl border font-black uppercase text-xs tracking-widest transition-all ${selectedTheme === th ? 'bg-purple-600 border-purple-600 text-white' : `${theme === 'dark' ? 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20' : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}`}
                >
                  {th === 'dark' ? t.darkMode : t.lightMode}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-6">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{t.provider}</label>
            <div className="grid grid-cols-2 gap-3">
              {PROVIDERS.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    const providerConfig = PROVIDER_CONFIG[p.id];
                    setConfig({ 
                      ...config, 
                      provider: p.id as ModelProvider,
                      ...(providerConfig && {
                        baseUrl: providerConfig.baseUrl,
                        llmModel: providerConfig.llmModel,
                        imageModel: providerConfig.imageModel
                      })
                    });
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all hover:scale-105 ${config.provider === p.id ? 'bg-purple-600/20 border-purple-500 text-purple-400' : `${theme === 'dark' ? 'bg-white/5 border-white/5 text-zinc-500 hover:border-white/20' : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}`}
                >
                  <div className="text-xl mb-1">{p.logo}</div>
                  <div className="text-[10px] font-black uppercase leading-tight">{p.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {config.provider === 'gemini' ? (
              <div className="h-full flex flex-col justify-center space-y-4">
                 <p className={`text-sm leading-relaxed font-bold ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                   Use the built-in Gemini high-performance engine. Fast, reliable, and cinematic.
                 </p>
                 <button
                   onClick={handleOfficialGemini}
                   className="w-full py-5 bg-purple-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] transition-all"
                 >
                   Connect Official Key
                 </button>
              </div>
            ) : (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t.apiKey}</label>
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className={`w-full rounded-xl px-5 py-4 text-sm font-bold outline-none focus:border-purple-500/50 border ${theme === 'dark' ? 'bg-white/5 border-white/5 text-white' : 'bg-zinc-50 border-zinc-200 text-black'}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t.baseUrl}</label>
                  <input
                    type="text"
                    value={config.baseUrl}
                    onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                    className={`w-full rounded-xl px-5 py-4 text-sm font-bold outline-none focus:border-purple-500/50 border ${theme === 'dark' ? 'bg-white/5 border-white/5 text-white' : 'bg-zinc-50 border-zinc-200 text-black'}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">LLM {t.model}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={config.llmModel}
                      onChange={(e) => setConfig({ ...config, llmModel: e.target.value })}
                      placeholder="glm-4 / gpt-4o / qwen-max"
                      className={`flex-1 rounded-xl px-5 py-4 text-sm font-bold outline-none focus:border-purple-500/50 border ${theme === 'dark' ? 'bg-white/5 border-white/5 text-white' : 'bg-zinc-50 border-zinc-200 text-black'}`}
                    />
                    <button
                      onClick={() => runApiTest('llm')}
                      className={`px-3 py-2 rounded-lg font-bold text-[10px] tracking-widest transition-all min-w-[60px] ${testStatus.llm === 'loading' ? 'bg-yellow-600 text-white' : testStatus.llm === 'success' ? 'bg-green-600 text-white' : `${theme === 'dark' ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' : 'bg-zinc-100 border border-zinc-300 text-black hover:bg-zinc-200'}`}`}
                    >
                      {testStatus.llm === 'loading' ? '...' : testStatus.llm === 'success' ? '✓' : 'Test'}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Image {t.model}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={config.imageModel}
                      onChange={(e) => setConfig({ ...config, imageModel: e.target.value })}
                      placeholder="cogview-4-250304 / dall-e-3"
                      className={`flex-1 rounded-xl px-5 py-4 text-sm font-bold outline-none focus:border-purple-500/50 border ${theme === 'dark' ? 'bg-white/5 border-white/5 text-white' : 'bg-zinc-50 border-zinc-200 text-black'}`}
                    />
                    <button
                      onClick={() => runApiTest('image')}
                      className={`px-3 py-2 rounded-lg font-bold text-[10px] tracking-widest transition-all min-w-[60px] ${testStatus.image === 'loading' ? 'bg-yellow-600 text-white' : testStatus.image === 'success' ? 'bg-green-600 text-white' : `${theme === 'dark' ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' : 'bg-zinc-100 border border-zinc-300 text-black hover:bg-zinc-200'}`}`}
                    >
                      {testStatus.image === 'loading' ? '...' : testStatus.image === 'success' ? '✓' : 'Test'}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowHelp(true)}
                    className={`w-10 h-10 flex items-center justify-center rounded-full text-lg font-black transition-all text-red-500 hover:text-red-600`}
                  >
                    ?
                  </button>
                  <button
                    onClick={handleSave}
                    className={`flex-1 py-5 font-black uppercase tracking-widest rounded-2xl transition-all ${theme === 'dark' ? 'bg-white text-black hover:bg-zinc-200' : 'bg-black text-white hover:bg-zinc-800'}`}
                  >
                    {t.save}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className={`mt-12 flex justify-center border-t pt-8 ${theme === 'dark' ? 'border-white/10' : 'border-zinc-200'}`}>
           <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              className={`text-[10px] font-black uppercase tracking-widest transition-colors ${theme === 'dark' ? 'text-zinc-600 hover:text-purple-500' : 'text-zinc-400 hover:text-purple-600'}`}
            >
              Learn about Billing & Usage
            </a>
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className={`fixed inset-0 z-[101] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6 ${theme === 'light' ? 'bg-white/90' : ''}`}>
          <div className={`max-w-2xl w-full border rounded-[3rem] p-12 shadow-2xl text-left animate-in zoom-in-95 duration-500 max-h-[80vh] overflow-y-auto ${theme === 'dark' ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200'}`}>
            <div className="flex items-center justify-between mb-8">
              <h2 className={`text-3xl font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                {currentHelp.title}
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className={`text-2xl w-8 h-8 flex items-center justify-center rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-white' : 'hover:bg-zinc-100 text-black'}`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {currentHelp.sections.map((section, idx) => (
                <div key={idx} className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
                  <h3 className={`text-lg font-black uppercase tracking-widest mb-3 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
                    {section.title}
                  </h3>
                  <p className={`text-sm leading-relaxed font-bold ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    {section.content}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className={`w-full py-4 font-black uppercase tracking-widest rounded-2xl transition-all mt-8 ${theme === 'dark' ? 'bg-white text-black hover:bg-zinc-200' : 'bg-black text-white hover:bg-zinc-800'}`}
            >
              {selectedLang === 'zh' ? '关闭' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeySelection;
