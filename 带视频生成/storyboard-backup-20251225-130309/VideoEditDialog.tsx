import React, { useState, useEffect } from 'react';
import { VideoItem } from '../types';

interface VideoEditDialogProps {
  video: VideoItem;
  onEdit: (newPrompt: string) => void;
  onCancel: () => void;
  lang?: 'zh' | 'en';
  isLoading?: boolean;
}

export default function VideoEditDialog({
  video,
  onEdit,
  onCancel,
  lang = 'zh',
  isLoading = false
}: VideoEditDialogProps) {
  const [editedPrompt, setEditedPrompt] = useState(video.prompt);

  useEffect(() => {
    setEditedPrompt(video.prompt);
  }, [video.prompt]);

  const handleEdit = () => {
    if (!editedPrompt.trim()) {
      alert(lang === 'zh' ? '请输入视频提示词' : 'Please enter video prompt');
      return;
    }

    if (editedPrompt.length > 760) {
      alert(lang === 'zh' ? '提示词不能超过760个字符' : 'Prompt cannot exceed 760 characters');
      return;
    }

    onEdit(editedPrompt);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '30px',
          maxWidth: '600px',
          width: '90%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>
          {lang === 'zh' ? '编辑视频' : 'Edit Video'}
        </h2>

        {/* Video Preview */}
        {video.videoUrl && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              {lang === 'zh' ? '视频预览' : 'Video Preview'}
            </label>
            <video
              src={video.videoUrl}
              controls
              crossOrigin="anonymous"
              style={{
                width: '100%',
                maxHeight: '300px',
                borderRadius: '4px',
                backgroundColor: '#000'
              }}
            />
          </div>
        )}

        {/* Prompt Editor */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            {lang === 'zh' ? '编辑提示词' : 'Edit Prompt'}
          </label>
          <textarea
            value={editedPrompt}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedPrompt(e.target.value.slice(0, 760))}
            placeholder={lang === 'zh' ? '编辑视频提示词...' : 'Edit video prompt...'}
            style={{
              width: '100%',
              height: '120px',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
              fontFamily: 'Arial, sans-serif',
              backgroundColor: '#fff',
              cursor: 'text'
            }}
          />
          <div style={{ marginTop: '4px', fontSize: '12px', color: editedPrompt.length > 700 ? '#ff6b6b' : '#999' }}>
            {editedPrompt.length} / 760
          </div>
        </div>

        {/* Info */}
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
          {lang === 'zh' ? '修改提示词后，点击"重新生成"将使用新的提示词重新生成视频。' : 'After modifying the prompt, click "Regenerate" to regenerate the video with the new prompt.'}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleEdit}
            disabled={isLoading || !editedPrompt.trim()}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: isLoading ? '#ccc' : '#2196F3',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {isLoading ? (lang === 'zh' ? '生成中...' : 'Generating...') : (lang === 'zh' ? '重新生成' : 'Regenerate')}
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#999',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {lang === 'zh' ? '取消' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
