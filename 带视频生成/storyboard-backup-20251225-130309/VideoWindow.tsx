import React, { useState, useRef } from 'react';
import { VideoItem } from '../types';

interface VideoWindowProps {
  item: VideoItem;
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
  onEdit: (id: string) => void;
  onDragStart: (id: string, e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function VideoWindow({
  item,
  onDelete,
  onDownload,
  onEdit,
  onDragStart
}: VideoWindowProps) {
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getStatusColor = () => {
    switch (item.status) {
      case 'loading':
        return '#2196F3';
      case 'completed':
        return '#4CAF50';
      case 'failed':
        return '#f44336';
      default:
        return '#999';
    }
  };

  const getStatusText = () => {
    switch (item.status) {
      case 'loading':
        return `生成中... ${item.progress}%`;
      case 'completed':
        return '生成完成';
      case 'failed':
        return '生成失败';
      default:
        return '未知状态';
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        backgroundColor: '#fff',
        border: '2px solid #ddd',
        borderRadius: '8px',
        boxShadow: isHovering ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        cursor: 'move',
        transition: 'box-shadow 0.2s',
        zIndex: isHovering ? 100 : 1
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseDown={(e) => onDragStart(item.id, e)}
    >
      {/* 标题栏 */}
      <div
        style={{
          padding: '10px',
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'grab'
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>
          视频 #{item.taskId.slice(0, 8)}
        </span>
        {item.status === 'completed' && (
          <button
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              onEdit(item.id);
            }}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#2196F3',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            编辑
          </button>
        )}
      </div>

      {/* 内容区域 */}
      <div
        style={{
          width: '100%',
          height: item.height - 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fafafa',
          position: 'relative'
        }}
      >
        {/* 加载状态 */}
        {(item.status === 'loading') && (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '80%',
                height: '4px',
                backgroundColor: '#eee',
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: '10px'
              }}
            >
              <div
                style={{
                  width: `${item.progress}%`,
                  height: '100%',
                  backgroundColor: getStatusColor(),
                  transition: 'width 0.3s'
                }}
              />
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {getStatusText()}
            </div>
          </div>
        )}

        {/* 完成状态 - 显示视频 */}
        {item.status === 'completed' && item.videoUrl && (
          <video
            src={item.videoUrl}
            controls
            crossOrigin="anonymous"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        )}

        {/* 失败状态 */}
        {item.status === 'failed' && (
          <div style={{ textAlign: 'center', color: '#f44336' }}>
            <div style={{ fontSize: '14px', marginBottom: '10px' }}>
              ❌ 生成失败
            </div>
            {item.error && (
              <div style={{ fontSize: '12px', color: '#999' }}>
                {item.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      {item.status === 'completed' && (
        <div
          style={{
            display: 'flex',
            gap: '5px',
            padding: '8px',
            backgroundColor: '#f5f5f5',
            borderTop: '1px solid #eee'
          }}
        >
          <button
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              onDownload(item.id);
            }}
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '12px',
              backgroundColor: '#4CAF50',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            下载
          </button>
          <button
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '12px',
              backgroundColor: '#f44336',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            删除
          </button>
        </div>
      )}
    </div>
  );
}
