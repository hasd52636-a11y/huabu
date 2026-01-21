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
let totalSize = 0;

console.log('=== 模块字符数分析 ===');
console.log('模块名称 | 字符数 | 建议');
console.log('---------|--------|------');

while ((match = moduleRegex.exec(modulesString)) !== null) {
  const [, name, moduleContent, keywords] = match;
  const charCount = moduleContent.length;
  totalSize += charCount;
  
  const suggestion = charCount > 1000 ? '⚠️ 需要拆分' : '✅ 符合要求';
  console.log(`${name.padEnd(9)} | ${charCount.toString().padStart(6)} | ${suggestion}`);
}

console.log('\n=== 汇总信息 ===');
console.log(`总字符数: ${totalSize}`);
console.log(`模块数量: ${(modulesString.match(moduleRegex) || []).length}`);
console.log('\n=== 过大模块拆分建议 ===');
console.log('1. core模块 (核心功能) - 考虑拆分为更小的功能模块');
console.log('2. voice模块 (语音控制) - 可拆分为基础语音和实时语音两个模块');
console.log('3. modules模块 (模块操作) - 可拆分为基础操作和文件处理两个模块');
console.log('4. canvas模块 (画布功能) - 可拆分为UI功能、导出下载、资源限制等多个模块');
console.log('5. troubleshooting模块 (故障排除) - 可按问题类型拆分为多个小模块');