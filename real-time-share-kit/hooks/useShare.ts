
import { useShare as useShareContext } from '../core/ShareProvider';

/**
 * Hook to access real-time sharing functionality
 */
export const useShare = () => {
  const { 
    session, 
    createShare, 
    joinShare, 
    stopSharing, 
    syncData, 
    receivedData 
  } = useShareContext();

  return {
    isSharing: session.isHost && !!session.shareId,
    isViewing: !session.isHost && !!session.shareId,
    shareId: session.shareId,
    status: session.status,
    viewers: session.viewers,
    createShare,
    joinShare,
    stopSharing,
    syncData,
    receivedData
  };
};
