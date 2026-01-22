
import React, { useEffect } from 'react';
import { useShare } from '../core/ShareProvider';

interface ViewerLayerProps {
  children: (data: any, isViewing: boolean) => React.ReactNode;
}

export const ViewerLayer: React.FC<ViewerLayerProps> = ({ children }) => {
  const { session, receivedData } = useShare();
  const isViewing = !session.isHost && !!session.shareId;

  return (
    <div className="relative w-full h-full">
      {children(receivedData, isViewing)}
      
      {isViewing && (
        <div className="absolute top-4 left-4 z-50 pointer-events-none">
          <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            LIVE: WATCHING MODE
          </div>
        </div>
      )}
    </div>
  );
};
