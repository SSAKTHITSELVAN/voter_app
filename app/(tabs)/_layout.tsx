import { Colors, Radius } from '@/constants/theme';
import { AuthStore } from '@/lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';

// ─── Clean icon config using theme constants ─────────────────────────────────
const ICONS = {
  households: { active: 'location',                inactive: 'location-outline',                label: 'Nearby',   accent: Colors.primary     },
  verify:     { active: 'checkmark-done-circle',   inactive: 'checkmark-done-circle-outline',   label: 'Verify',   accent: Colors.success     },
  bulk:       { active: 'layers',                  inactive: 'layers-outline',                  label: 'Bulk',     accent: Colors.info        },
  profile:    { active: 'person-circle',           inactive: 'person-circle-outline',           label: 'Profile',  accent: Colors.warning     },
  admin:      { active: 'shield',                  inactive: 'shield-outline',                  label: 'Admin',    accent: Colors.gold        },
} as const;

// ─── Simple tab icon with modern styling ─────────────────────────────────────
function TabIcon({ route, focused }: { route: keyof typeof ICONS; focused: boolean }) {
  const cfg = ICONS[route];
  return (
    <View style={[styles.tabItem, focused && styles.tabItemFocused]}>
      {/* Modern active indicator */}
      <View style={[
        styles.activeLine,
        focused && {
          backgroundColor: cfg.accent,
          shadowColor: cfg.accent,
          shadowOpacity: 0.4,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 0 },
          elevation: 2,
        }
      ]} />

      {/* Modern icon container */}
      <View style={[
        styles.iconPill,
        focused && {
          backgroundColor: cfg.accent + '18',
          borderColor: cfg.accent + '30',
          borderWidth: 1,
        }
      ]}>
        <Ionicons
          name={focused ? cfg.active : cfg.inactive}
          size={22}
          color={focused ? cfg.accent : Colors.textMuted}
        />
      </View>

      {/* Modern label */}
      <Text style={[
        styles.label,
        { color: focused ? cfg.accent : Colors.textMuted },
        focused && styles.labelActive
      ]}>
        {cfg.label}
      </Text>
    </View>
  );
}

// ─── Modern FAB with clean animations ────────────────────────────────────────
function CollectFab({ focused }: { focused: boolean }) {
  return (
    <View style={styles.fabContainer}>
      <View style={[
        styles.fab,
        focused && {
          backgroundColor: Colors.primaryDark,
          shadowOpacity: 0.7,
          elevation: 24,
        }
      ]}>
        <Ionicons
          name="add"
          size={30}
          color={Colors.white}
        />
      </View>
      <Text style={[
        styles.fabLabel,
        focused && {
          color: Colors.primary,
          fontWeight: '700'
        }
      ]}>
        Collect
      </Text>
    </View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function TabLayout() {
  const role = AuthStore.getRole();
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';

  return (
    <Tabs
      screenOptions={{
        headerShown:             false,
        tabBarShowLabel:         false,
        tabBarStyle:             styles.bar,
        tabBarItemStyle:         styles.barItem,
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="households"
        options={{ tabBarIcon: ({ focused }) => <TabIcon route="households" focused={focused} /> }}
      />
      <Tabs.Screen
        name="verify"
        options={{ tabBarIcon: ({ focused }) => <TabIcon route="verify" focused={focused} /> }}
      />
      <Tabs.Screen
        name="collect"
        options={{
          tabBarIcon: ({ focused }) => <CollectFab focused={focused} />,
          tabBarItemStyle: styles.fabItemSlot,
        }}
      />
      <Tabs.Screen
        name="bulk"
        options={{ tabBarIcon: ({ focused }) => <TabIcon route="bulk" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon route="profile" focused={focused} /> }}
      />
      <Tabs.Screen
        name="admin/index"
        options={{
          href:        isAdmin ? undefined : null,
          tabBarIcon:  ({ focused }) => <TabIcon route="admin" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
    </Tabs>
  );
}

// ─── Modern styles using theme constants ─────────────────────────────────────
const BAR_H   = Platform.OS === 'ios' ? 82 : 64;
const FAB_D   = 56;
const FAB_LIFT = 18;

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.bgCard,
    borderTopWidth:  1,
    borderTopColor:  Colors.border,
    height:          BAR_H + FAB_LIFT,
    paddingBottom:   Platform.OS === 'ios' ? 20 : 6,
    paddingTop:      FAB_LIFT,
    overflow:        'visible',
    shadowColor:     Colors.black,
    shadowOffset:    { width: 0, height: -4 },
    shadowOpacity:   0.1,
    shadowRadius:    8,
    elevation:       12,
  },
  barItem: {
    paddingTop:    0,
    paddingBottom: 0,
    overflow:      'visible',
  },
  tabItem: {
    alignItems:     'center',
    justifyContent: 'flex-start',
    paddingTop:     4,
    gap:            3,
    minWidth:       52,
  },
  tabItemFocused: {
    // Clean focused state without transforms
  },
  activeLine: {
    width:           28,
    height:          3,
    borderRadius:    2,
    backgroundColor: 'transparent',
    marginBottom:    2,
  },
  iconPill: {
    width:           44,
    height:          28,
    borderRadius:    Radius.md,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: Colors.white05,
  },
  label: {
    fontSize:      9,
    fontWeight:    '600',
    letterSpacing: 0.3,
  },
  labelActive: {
    fontWeight: '700',
  },
  fabItemSlot: {
    overflow:      'visible',
    paddingTop:    0,
    paddingBottom: 0,
    justifyContent: 'flex-start',
    alignItems:     'center',
  },
  fabContainer: {
    alignItems:  'center',
    marginTop:   -(FAB_LIFT + FAB_D / 2),
  },
  fab: {
    width:           FAB_D,
    height:          FAB_D,
    borderRadius:    FAB_D / 2,
    backgroundColor: Colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     3,
    borderColor:     Colors.bgCard,
    shadowColor:     Colors.primary,
    shadowOffset:    { width: 0, height: 6 },
    shadowOpacity:   0.4,
    shadowRadius:    12,
    elevation:       18,
  },
  fabLabel: {
    fontSize:      9,
    fontWeight:    '600',
    color:         Colors.textMuted,
    marginTop:     5,
    letterSpacing: 0.3,
  },
});