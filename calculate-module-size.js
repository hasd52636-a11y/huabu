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
  
  console.log('=== 指南模块字符数统计 ===');
  
  let totalSize = 0;
  let maxModuleSize = 0;
  let largestModule = '';
  
  moduleMatches.forEach((moduleStr, index) => {
    try {
      // 提取模块名称和内容
      const nameMatch = moduleStr.match(/name: ['"](.*?)['"]/);
      const contentMatch = moduleStr.match(/content: `([\s\S]*?)`/);
      
      if (nameMatch && contentMatch) {
        const name = nameMatch[1];
        const content = contentMatch[1];
        const size = content.length;
        
        totalSize += size;
        
        if (size > maxModuleSize) {
          maxModuleSize = size;
          largestModule = name;
        }
        
        console.log(`${name.padEnd(20)}: ${size.toLocaleString()} 字符`);
      }
    } catch (e) {
      console.error(`解析模块 ${index} 失败:`, e.message);
    }
  });
  
  console.log('\n=== 统计结果 ===');
  console.log(`总字符数: ${totalSize.toLocaleString()}`);
  console.log(`最大模块: ${largestModule} (${maxModuleSize.toLocaleString()} 字符)`);
  
  // 计算最大可能的提交字符数（核心模块+1-2个大模块）
  const coreModuleMatch = modulesContent.match(/\{[\s\S]*?name: ['"]core['"][\s\S]*?\},/);
  if (coreModuleMatch) {
    const coreContentMatch = coreModuleMatch[0].match(/content: `([\s\S]*?)`/);
    if (coreContentMatch) {
      const coreSize = coreContentMatch[1].length;
      const maxPossibleSize = coreSize + maxModuleSize * 2;
      console.log(`核心模块: ${coreSize.toLocaleString()} 字符`);
      console.log(`最大可能提交: ${maxPossibleSize.toLocaleString()} 字符 (核心模块+2个最大模块)`);
    }
  }
} else {
  console.error('未找到模块定义');
}
