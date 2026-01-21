import React from 'react';

interface SimpleViewerModeProps {
  shareId: string;
}

const SimpleViewerMode: React.FC<SimpleViewerModeProps> = ({ shareId }) => {
  console.log('[SimpleViewerMode] Rendering with shareId:', shareId);
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f0f0f0', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>观看模式测试</h1>
      <p>分享ID: {shareId}</p>
      <p>当前时间: {new Date().toLocaleString()}</p>
      <p>URL: {window.location.href}</p>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '10px', 
        marginTop: '20px',
        border: '1px solid #ccc',
        borderRadius: '5px'
      }}>
        <h3>调试信息:</h3>
        <p>React正在正常工作</p>
        <p>组件已成功渲染</p>
        <p>Props接收正常</p>
      </div>
    </div>
  );
};

export default SimpleViewerMode;