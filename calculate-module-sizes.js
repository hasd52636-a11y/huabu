// 计算每个模块的字符数
const guideModules = require('./config/assistant-guide.ts').guideModules;

console.log('=== 模块字符数分析 ===');
console.log('模块名称 | 字符数 | 建议');
console.log('---------|--------|------');

guideModules.forEach(module => {
  const charCount = module.content.length;
  const suggestion = charCount > 1000 ? '⚠️ 需要拆分' : '✅ 符合要求';
  console.log(`${module.name.padEnd(9)} | ${charCount.toString().padStart(6)} | ${suggestion}`);
});

// 计算核心模块的大小单独显示
const coreModule = guideModules.find(module => module.name === 'core');
if (coreModule) {
  console.log('\n=== 核心模块分析 ===');
  console.log(`核心模块字符数: ${coreModule.content.length}`);
  console.log('核心模块是默认包含的，需要特别关注其大小');
}