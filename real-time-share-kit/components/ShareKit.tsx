
import React, { useEffect } from 'react';
import { ShareProvider } from '../core/ShareProvider';
import { ShareButton } from './ShareButton';
import { ViewerLayer } from './ViewerLayer';
import { useShare } from '../hooks/useShare';
import { ShareConfig } from '../types';

interface ShareKitProps {
  data: any;
  onDataChange: (data: any) => void;
  appName: string;
  config?: Partial<ShareConfig>;
}

const ShareKitInternal: React.FC<{ data: any; onDataChange: (data: any) => void }> = ({ data, onDataChange }) => {
  const { isSharing, isViewing, syncData, receivedData } = useShare();

  // Sync outgoing data when it changes and we are the host
  useEffect(() => {
    if (isSharing) {
      syncData(data);
    }
  }, [data, isSharing, syncData]);

  // Handle incoming data when we are a viewer
  useEffect(() => {
    if (isViewing && receivedData) {
      onDataChange(receivedData);
    }
  }, [receivedData, isViewing, onDataChange]);

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <ShareButton />
      {isViewing && (
        <div className="absolute bottom-full right-0 mb-4 pointer-events-none">
           <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 whitespace-nowrap">
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

export const ShareKit: React.FC<ShareKitProps> = ({ data, onDataChange, appName, config }) => {
  return (
    <ShareProvider config={{ appName, ...config }}>
      <ShareKitInternal data={data} onDataChange={onDataChange} />
    </ShareProvider>
  );
};
