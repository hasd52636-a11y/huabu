import fs from 'fs';
import path from 'path';

// 读取assistant-guide.ts文件
const filePath = './config/assistant-guide.ts';
const fileContent = fs.readFileSync(filePath, 'utf8');

// 提取模块定义
const moduleRegex = /const guideModules: GuideModule\[\] = \[([\s\S]*?)\];/;
const match = fileContent.match(moduleRegex);

if (match) {
  const modulesContent = match[1];
  
  // 分割各个模块
  const moduleMatches = modulesContent.match(/\{[\s\S]*?\},/g) || [];
  
  let totalSize = 0;
  
  moduleMatches.forEach((moduleStr, index) => {
    try {
      // 提取模块内容
      const contentMatch = moduleStr.match(/content: `([\s\S]*?)`/);
      
      if (contentMatch) {
        const content = contentMatch[1];
        totalSize += content.length;
      }
    } catch (e) {
      console.error(`解析模块 ${index} 失败:`, e.message);
    }
  });
  
  console.log('=== 完整指南字符数统计 ===');
  console.log(`完整指南字符数: ${totalSize.toLocaleString()}`);
  console.log(`分隔符添加后总字符数: ${(totalSize + moduleMatches.length * 2).toLocaleString()}`);
} else {
  console.error('未找到模块定义');
}
