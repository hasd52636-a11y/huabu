#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始部署到 Vercel...');

try {
  // 检查是否已登录 Vercel
  console.log('📋 检查 Vercel 登录状态...');
  
  // 构建项目
  console.log('🔨 构建项目...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // 部署到 Vercel
  console.log('🌐 部署到 Vercel...');
  const deployResult = execSync('vercel --prod --yes', { 
    stdio: 'pipe',
    encoding: 'utf8'
  });
  
  console.log('✅ 部署成功！');
  console.log('🔗 部署URL:', deployResult.trim());
  
  // 保存部署信息
  const deployInfo = {
    url: deployResult.trim(),
    timestamp: new Date().toISOString(),
    version: require('./package.json').version
  };
  
  fs.writeFileSync('deployment-info.json', JSON.stringify(deployInfo, null, 2));
  console.log('📝 部署信息已保存到 deployment-info.json');
  
} catch (error) {
  console.error('❌ 部署失败:', error.message);
  
  if (error.message.includes('not authenticated')) {
    console.log('🔐 请先登录 Vercel:');
    console.log('   vercel login');
  }
  
  process.exit(1);
}