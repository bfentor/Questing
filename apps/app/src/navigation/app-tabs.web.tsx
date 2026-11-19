import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { StyleSheet } from 'react-native';

import { TABS } from './tabs';

/**
 * The tabs on the website. Their buttons are in the sidebar or bottom bar around every page
 * (navigation/web-shell.web.tsx), so this only switches between them, keeping each one's
 * scroll position. The triggers stay, hidden, because they declare the tabs.
 */
export default function AppTabs() {
  return (
    <Tabs style={styles.tabs}>
      <TabList style={styles.hidden}>
        {TABS.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} href={tab.href} />
        ))}
      </TabList>
      <TabSlot style={styles.tabs} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabs: { flex: 1 },
  hidden: { display: 'none' },
});
