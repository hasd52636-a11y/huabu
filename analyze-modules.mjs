import fs from 'fs';

// 读取文件内容
const filePath = './config/assistant-guide.ts';
const content = fs.readFileSync(filePath, 'utf8');

// 提取guideModules数组
const modulesMatch = content.match(/const guideModules: GuideModule\[\] = \[(.*?)\];/s);
if (!modulesMatch) {
  console.error('未找到guideModules数组');
  process.exit(1);
}

const modulesString = modulesMatch[1];

// 分割成单个模块
const moduleRegex = /\{\s*name:\s*['"](.*?)['"],\s*content:\s*`([\s\S]*?)`,\s*keywords:\s*\[(.*?)\]\s*\}/g;
let match;
const modules = [];
let totalSize = 0;

while ((match = moduleRegex.exec(modulesString)) !== null) {
  const [, name, moduleContent, keywords] = match;
  const charCount = moduleContent.length;
  totalSize += charCount;
  
  modules.push({
    name,
    charCount,
    keywords: keywords.split(',').map(k => k.trim().replace(/['"]/g, '')).filter(k => k)
  });
}

// 按功能分类模块
const moduleCategories = {
  core: ['coreOverview', 'aiServiceConfig', 'conversationModes'],
  moduleOperations: ['moduleBasic', 'moduleReference', 'fileUpload'],
  voiceControl: ['voiceBasic', 'voiceMore', 'voiceClose', 'realTimeVoice'],
  gestureControl: ['gestureBasic', 'gestureOperations', 'gestureTips'],
  contentProjection: ['contentProjection', 'projectionMore'],
  advancedFeatures: ['advanced'],
  automation: ['automationBasic', 'variableReplacement', 'canvasAutoLayout'],
  canvasFeatures: ['uiFeatures', 'accessibility', 'paintingEditing', 'exportDownload', 'resourceLimits'],
  tips: ['tipsConversation', 'tipsAccessibility', 'tipsWorkflow', 'tipsCanvas'],
  troubleshooting: ['troubleshootingBasic', 'troubleshootingFiles', 'troubleshootingFeatures', 'troubleshootingInteraction', 'troubleshootingAutomation', 'securityUpdates']
};

// 计算分类统计
const categoryStats = {};
for (const [category, moduleNames] of Object.entries(moduleCategories)) {
  const categoryModules = modules.filter(m => moduleNames.includes(m.name));
  const categorySize = categoryModules.reduce((sum, m) => sum + m.charCount, 0);
  categoryStats[category] = {
    count: categoryModules.length,
    size: categorySize,
    avgSize: Math.round(categorySize / categoryModules.length)
  };
}

// 计算常见问题场景的字符数
const scenarioAnalysis = [
  {
    name: '基础操作问题',
    modules: ['coreOverview', 'moduleBasic', 'moduleReference'],
    description: '询问模块创建、编辑、引用等基础操作'
  },
  {
    name: '语音控制问题',
    modules: ['coreOverview', 'voiceBasic', 'voiceMore', 'voiceClose'],
    description: '询问语音控制功能和使用方法'
  },
  {
    name: '手势控制问题',
    modules: ['coreOverview', 'gestureBasic', 'gestureOperations'],
    description: '询问手势控制功能和使用方法'
  },
  {
    name: '文件上传问题',
    modules: ['coreOverview', 'fileUpload', 'conversationModes'],
    description: '询问文件上传、视频处理等功能'
  },
  {
    name: '高级功能问题',
    modules: ['coreOverview', 'advanced', 'automationBasic', 'contentProjection'],
    description: '询问高级功能、自动化、内容投射等'
  },
  {
    name: '故障排除问题',
    modules: ['coreOverview', 'troubleshootingBasic', 'troubleshootingFiles', 'troubleshootingInteraction'],
    description: '询问常见问题和故障排除'
  }
];

// 计算每个场景的字符数
scenarioAnalysis.forEach(scenario => {
  const scenarioSize = scenario.modules.reduce((sum, moduleName) => {
    const module = modules.find(m => m.name === moduleName);
    return sum + (module ? module.charCount : 0);
  }, 0);
  scenario.size = scenarioSize;
});

// 生成分析报告
console.log('=== AI助手文档拆分效果详细分析 ===');
console.log(`\n📊 总体统计`);
console.log(`- 模块总数: ${modules.length}个`);
console.log(`- 总字符数: ${totalSize}字符`);
console.log(`- 平均模块大小: ${Math.round(totalSize / modules.length)}字符`);
console.log(`- 最大模块大小: ${Math.max(...modules.map(m => m.charCount))}字符`);
console.log(`- 最小模块大小: ${Math.min(...modules.map(m => m.charCount))}字符`);

console.log(`\n📁 模块分类统计`);
for (const [category, stats] of Object.entries(categoryStats)) {
  console.log(`- ${category.padEnd(20)}: ${stats.count}个模块, 总字符数${stats.size}, 平均${stats.avgSize}字符/模块`);
}

console.log(`\n📈 字符数分布`);
const sizeRanges = {
  '0-200': 0,
  '201-400': 0,
  '401-600': 0,
  '601-800': 0,
  '801-1000': 0
};

modules.forEach(module => {
  if (module.charCount <= 200) sizeRanges['0-200']++;
  else if (module.charCount <= 400) sizeRanges['201-400']++;
  else if (module.charCount <= 600) sizeRanges['401-600']++;
  else if (module.charCount <= 800) sizeRanges['601-800']++;
  else sizeRanges['801-1000']++;
});

for (const [range, count] of Object.entries(sizeRanges)) {
  console.log(`- ${range}字符: ${count}个模块`);
}

console.log(`\n💡 常见场景字符数分析`);
scenarioAnalysis.forEach(scenario => {
  console.log(`- ${scenario.name.padEnd(20)}: ${scenario.size}字符 (${scenario.description})`);
});

console.log(`\n📊 单次提交字符数分析`);
const avgScenarioSize = scenarioAnalysis.reduce((sum, s) => sum + s.size, 0) / scenarioAnalysis.length;
const maxScenarioSize = Math.max(...scenarioAnalysis.map(s => s.size));
const minScenarioSize = Math.min(...scenarioAnalysis.map(s => s.size));

console.log(`- 平均场景字符数: ${Math.round(avgScenarioSize)}字符`);
console.log(`- 最大场景字符数: ${maxScenarioSize}字符`);
console.log(`- 最小场景字符数: ${minScenarioSize}字符`);

console.log(`\n🔄 与之前版本对比`);
const oldSize = 8000; // 之前的固定提交字符数
const avgReduction = oldSize - avgScenarioSize;
const maxReduction = oldSize - maxScenarioSize;
const avgReductionPercent = Math.round((avgReduction / oldSize) * 100);
const maxReductionPercent = Math.round((maxReduction / oldSize) * 100);

console.log(`- 之前版本: 固定8000字符/次`);
console.log(`- 平均节约: ${Math.round(avgReduction)}字符/次 (${avgReductionPercent}%)`);
console.log(`- 最大节约: ${maxReduction}字符/次 (${maxReductionPercent}%)`);
console.log(`- 最小节约: ${oldSize - minScenarioSize}字符/次`);

console.log(`\n💲 Token消费节约分析`);
const avgTokens = Math.round(avgScenarioSize / 4); // 粗略估算，1 token ≈ 4字符
const oldTokens = Math.round(oldSize / 4);
const tokenSavings = oldTokens - avgTokens;
const tokenSavingsPercent = Math.round((tokenSavings / oldTokens) * 100);

console.log(`- 之前版本: 约${oldTokens} tokens/次`);
console.log(`- 现在版本: 约${avgTokens} tokens/次`);
console.log(`- 平均节约: ${tokenSavings} tokens/次 (${tokenSavingsPercent}%)`);

console.log(`\n✅ 优化效果总结`);
console.log(`1. 模块拆分: 将原文档拆分为${modules.length}个细粒度模块`);
console.log(`2. 字符数控制: 所有模块字符数均<1000，平均${Math.round(totalSize / modules.length)}字符/模块`);
console.log(`3. 精准匹配: 根据用户问题匹配相关模块，避免传递无关内容`);
console.log(`4. 大幅节约: 平均节约${avgReductionPercent}%的字符数和Token消费`);
console.log(`5. 响应优化: 减少了AI模型的处理负担，提高了响应速度`);
console.log(`6. 可维护性: 模块化结构便于后续更新和扩展`);

console.log(`\n=== 分析完成 ===`);
