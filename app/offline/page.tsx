import type { Metadata } from 'next';
import OfflineClientView from './OfflineClientView';

export const metadata: Metadata = {
  title: 'Offline Mode | Break Hub Arcade',
  description: 'Connection lost? Play the offline Cyber Runner mini-game, check your connection status, and reconnect to Break Hub Arcade.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflinePage() {
  return <OfflineClientView />;
}
