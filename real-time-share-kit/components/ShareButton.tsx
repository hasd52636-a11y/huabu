import React, { useState } from 'react';
import { useShare } from '../core/ShareProvider';
import { createShareUrl } from '../utils';
import { Share2, StopCircle, Copy, Check, Users } from 'lucide-react';

export const ShareButton: React.FC = () => {
  // Fix: useShare returns 'createShare', not 'startSharing'
  const { session, createShare, stopSharing } = useShare();
  const [copied, setCopied] = useState(false);

  const handleToggle = async () => {
    if (session.shareId) {
      stopSharing();
    } else {
      // Fix: Use createShare instead of the non-existent startSharing
      await createShare('Shared Workspace');
    }
  };

  const copyUrl = () => {
    if (session.shareId) {
      const url = createShareUrl(session.shareId);
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="flex items-center gap-2">
        {session.shareId && (
           <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium animate-pulse">
            <Users size={14} />
            <span>{session.viewers.length} Viewers</span>
          </div>
        )}
        <button
          onClick={handleToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all shadow-sm ${
            session.shareId 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {session.shareId ? <StopCircle size={18} /> : <Share2 size={18} />}
          {session.shareId ? 'Stop Sharing' : 'Share Link'}
        </button>
      </div>

      {session.shareId && (
        <div className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <input 
            readOnly 
            value={createShareUrl(session.shareId)} 
            className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100 w-48 outline-none"
          />
          <button 
            onClick={copyUrl}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          </button>
        </div>
      )}
    </div>
  );
};