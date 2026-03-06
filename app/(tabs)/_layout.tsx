import { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { APP_VERSION } from '@/constants/version';
import { getCurrentUser } from '@/lib/auth';
import { getLinkedPatient } from '@/lib/partners';

type TabIcon = React.ComponentProps<typeof Ionicons>['name'];

const tabs: { name: string; title: string; icon: TabIcon; iconFocused: TabIcon }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', iconFocused: 'home' },
  { name: 'log', title: 'Log', icon: 'calendar-outline', iconFocused: 'calendar' },
  { name: 'trends', title: 'Trends', icon: 'trending-up-outline', iconFocused: 'trending-up' },
  { name: 'news', title: 'News', icon: 'newspaper-outline', iconFocused: 'newspaper' },
  { name: 'settings', title: 'Settings', icon: 'settings-outline', iconFocused: 'settings' },
];

export default function TabLayout() {
  const [patientName, setPatientName] = useState<string | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      getLinkedPatient(user.uid).then((result) => {
        if (result) {
          setPatientName(result.displayName || result.email || 'Patient');
        }
      }).catch(() => {});
    }
  }, []);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 14, gap: 6 }}>
            <Text style={{ color: '#4A90E2', fontSize: 9, fontWeight: '800', backgroundColor: 'rgba(74,144,226,0.15)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, overflow: 'hidden', letterSpacing: 0.5 }}>BETA</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 11 }}>v{APP_VERSION}</Text>
          </View>
        ),
        // Partner banner in header — show patient name on all tabs except news
        headerTitle: () => {
          const tab = tabs.find((t) => t.name === route.name);
          const title = tab?.title || '';
          if (patientName && route.name !== 'news' && route.name !== 'settings') {
            return (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#FF6B6B', fontSize: 17, fontWeight: '700' }}>
                  {patientName}'s {title}
                </Text>
                <Text style={{ color: '#FF6B6B', fontSize: 10, fontWeight: '500', opacity: 0.7 }}>
                  Partner Mode
                </Text>
              </View>
            );
          }
          return <Text style={{ color: Colors.text, fontSize: 17, fontWeight: '600' }}>{title}</Text>;
        },
        tabBarStyle: {
          backgroundColor: Colors.tabBarBg,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 12,
          paddingTop: 6,
        },
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: { fontSize: 11 },
      })}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? tab.iconFocused : tab.icon} size={22} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
