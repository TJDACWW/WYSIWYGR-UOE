import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium shadow-lg"
      style={{
        backgroundColor: 'var(--bg-panel)',
        borderColor: 'var(--border-strong)',
        color: 'var(--text-primary)',
      }}
    >
      <WifiOff
        className="w-3.5 h-3.5 shrink-0"
        style={{ color: 'var(--accent-fg)' }}
      />
      <span>Offline Mode · Using local cache</span>
    </div>
  );
};
