import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet, Text } from 'react-native';
import { Colors, Radius } from '@/constants/theme';
import { AuthStore } from '@/lib/auth';

// ─── Icon config per route ────────────────────────────────────────────────────
const ICONS = {
  households: { active: 'location',                inactive: 'location-outline',                label: 'Nearby',   accent: Colors.primary  },
  verify:     { active: 'checkmark-done-circle',   inactive: 'checkmark-done-circle-outline',   label: 'Verify',   accent: '#10B981'        },
  bulk:       { active: 'layers',                  inactive: 'layers-outline',                  label: 'Bulk',     accent: '#3B82F6'        },
  profile:    { active: 'person-circle',           inactive: 'person-circle-outline',           label: 'Profile',  accent: '#F59E0B'        },
  admin:      { active: 'shield',                  inactive: 'shield-outline',                  label: 'Admin',    accent: Colors.gold      },
} as const;

// ─── Regular tab icon with top-line indicator ─────────────────────────────────
function TabIcon({ route, focused }: { route: keyof typeof ICONS; focused: boolean }) {
  const cfg = ICONS[route];
  return (
    <View style={styles.tabItem}>
      {/* Active top line */}
      <View style={[styles.activeLine, focused && { backgroundColor: cfg.accent }]} />

      {/* Icon pill */}
      <View style={[styles.iconPill, focused && { backgroundColor: cfg.accent + '22' }]}>
        <Ionicons
          name={focused ? cfg.active : cfg.inactive}
          size={22}
          color={focused ? cfg.accent : '#6B7280'}
        />
      </View>

      {/* Label */}
      <Text style={[styles.label, { color: focused ? cfg.accent : '#6B7280' }, focused && styles.labelActive]}>
        {cfg.label}
      </Text>
    </View>
  );
}

// ─── Centre FAB — rendered INSIDE the bar, no negative margin tricks ──────────
function CollectFab({ focused }: { focused: boolean }) {
  return (
    <View style={styles.fabContainer}>
      <View style={[styles.fab, focused && styles.fabFocused]}>
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </View>
      <Text style={[styles.fabLabel, focused && { color: Colors.primary, fontWeight: '800' }]}>
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
        tabBarInactiveTintColor: '#6B7280',
      }}
    >
      {/* ① Nearby */}
      <Tabs.Screen
        name="households"
        options={{ tabBarIcon: ({ focused }) => <TabIcon route="households" focused={focused} /> }}
      />

      {/* ② Verify */}
      <Tabs.Screen
        name="verify"
        options={{ tabBarIcon: ({ focused }) => <TabIcon route="verify" focused={focused} /> }}
      />

      {/* ③ Collect — raised FAB in centre */}
      <Tabs.Screen
        name="collect"
        options={{
          tabBarIcon: ({ focused }) => <CollectFab focused={focused} />,
          tabBarItemStyle: styles.fabItemSlot,
        }}
      />

      {/* ④ Bulk */}
      <Tabs.Screen
        name="bulk"
        options={{ tabBarIcon: ({ focused }) => <TabIcon route="bulk" focused={focused} /> }}
      />

      {/* ⑤ Profile */}
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon route="profile" focused={focused} /> }}
      />

      {/* ⑥ Admin — visible ONLY for ADMIN / SUPER_ADMIN */}
      <Tabs.Screen
        name="admin"
        options={{
          href:        isAdmin ? undefined : null,
          tabBarIcon:  ({ focused }) => <TabIcon route="admin" focused={focused} />,
        }}
      />

      {/* Dashboard redirect — completely hidden */}
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
    </Tabs>
  );
}

// ─── Dimensions ───────────────────────────────────────────────────────────────
const BAR_H   = Platform.OS === 'ios' ? 82 : 64;
const FAB_D   = 56;           // FAB diameter
const FAB_LIFT = 18;          // how much the FAB pops above the bar

const styles = StyleSheet.create({

  // ── Tab bar ────────────────────────────────────────────────────────────────
  bar: {
    backgroundColor: '#161616',
    borderTopWidth:  1,
    borderTopColor:  '#2A2A2A',
    height:          BAR_H + FAB_LIFT,          // extra height for FAB lift
    paddingBottom:   Platform.OS === 'ios' ? 20 : 6,
    paddingTop:      FAB_LIFT,                   // push regular icons down
    overflow:        'visible',                  // allow FAB to bleed above
    // Upward shadow
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: -4 },
    shadowOpacity:   0.35,
    shadowRadius:    10,
    elevation:       16,
  },

  barItem: {
    paddingTop:    0,
    paddingBottom: 0,
    overflow:      'visible',
  },

  // ── Regular tab item ───────────────────────────────────────────────────────
  tabItem: {
    alignItems:     'center',
    justifyContent: 'flex-start',
    paddingTop:     4,
    gap:            3,
    minWidth:       52,
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
  },
  label: {
    fontSize:      9,
    fontWeight:    '600',
    letterSpacing: 0.3,
  },
  labelActive: {
    fontWeight: '800',
  },

  // ── FAB slot (the centre tab cell) ────────────────────────────────────────
  fabItemSlot: {
    overflow:      'visible',
    paddingTop:    0,
    paddingBottom: 0,
    // ensure it's centred in the extra-tall bar
    justifyContent: 'flex-start',
    alignItems:     'center',
  },

  // ── FAB button ─────────────────────────────────────────────────────────────
  fabContainer: {
    alignItems:  'center',
    marginTop:   -(FAB_LIFT + FAB_D / 2),       // rise above bar top edge
  },
  fab: {
    width:           FAB_D,
    height:          FAB_D,
    borderRadius:    FAB_D / 2,
    backgroundColor: Colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
    // ring to separate from bar
    borderWidth:     3,
    borderColor:     '#161616',
    // glow
    shadowColor:     Colors.primary,
    shadowOffset:    { width: 0, height: 6 },
    shadowOpacity:   0.55,
    shadowRadius:    14,
    elevation:       20,
  },
  fabFocused: {
    shadowOpacity: 0.8,
    elevation:     26,
    transform:     [{ scale: 1.06 }],
  },
  fabLabel: {
    fontSize:      9,
    fontWeight:    '600',
    color:         '#6B7280',
    marginTop:     5,
    letterSpacing: 0.3,
  },
});