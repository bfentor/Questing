import { DrawerProvider } from '@/components/drawer';
import AppTabs from '@/navigation/app-tabs';

export default function TabLayout() {
  return (
    <DrawerProvider>
      <AppTabs />
    </DrawerProvider>
  );
}
