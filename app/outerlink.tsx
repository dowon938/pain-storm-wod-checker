import { useLocalSearchParams } from 'expo-router';

import OuterLinkWebview from '@/components/ui/OuterLinkWebview';

export default function OuterLinkScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  if (!url) return null;
  return <OuterLinkWebview url={url} />;
}
