import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { usersApi, householdsApi } from '@/lib/api';
import { AuthStore } from '@/lib/auth';
import { User } from '@/lib/types';

interface StatCard {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

export default function DashboardScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const role = AuthStore.getRole();

  async function loadData() {
    try {
      const me = await usersApi.me();
      setUser(me);
    } catch {}
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const roleLabel =
    role === 'SUPER_ADMIN' ? 'Super Admin' :
    role === 'ADMIN' ? 'Admin' : 'Field User';

  const roleColor =
    role === 'SUPER_ADMIN' ? Colors.gold :
    role === 'ADMIN' ? Colors.info : Colors.success;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBg} />
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>வணக்கம் 👋</Text>
            <Text style={styles.userName}>{user?.name ?? 'Field User'}</Text>
          </View>
          <View style={[styles.rolePill, { borderColor: roleColor }]}>
            <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
            <Text style={[styles.roleText, { color: roleColor }]}>{roleLabel}</Text>
          </View>
        </View>
        <Text style={styles.headerSub}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
      </View>

      {/* Quick Stats */}
      <Text style={styles.sectionTitle}>Quick Stats</Text>
      <View style={styles.statsGrid}>
        <StatBox label="Phone" value={user?.phone ?? '—'} icon="call" color={Colors.primary} bg="#2A0A0A" />
        <StatBox label="Role" value={roleLabel} icon="shield-checkmark" color={roleColor} bg="#0A1A2A" />
        <StatBox label="Member Since" value={user ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'} icon="calendar" color={Colors.gold} bg="#1A1500" />
        <StatBox label="Status" value={user?.deleted_at ? 'Inactive' : 'Active'} icon="checkmark-circle" color={Colors.success} bg="#0A1A0A" />
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <ActionTile icon="home-outline" label="New Household" color={Colors.primary} />
        <ActionTile icon="location-outline" label="Find Nearby" color={Colors.gold} />
        <ActionTile icon="checkmark-done-outline" label="Verify" color={Colors.success} />
        <ActionTile icon="people-outline" label="Bulk Upload" color={Colors.info} />
      </View>

      {/* About */}
      <View style={styles.aboutCard}>
        <Ionicons name="information-circle" size={20} color={Colors.primary} />
        <Text style={styles.aboutText}>
          Use the tabs below to collect household data, verify records, and manage your profile.
          GPS coordinates are captured automatically on the Collect screen.
        </Text>
      </View>
    </ScrollView>
  );
}

function StatBox({ label, value, icon, color, bg }: {
  label: string; value: string | number;
  icon: keyof typeof Ionicons.glyphMap; color: string; bg: string;
}) {
  return (
    <View style={[styles.statBox, { backgroundColor: bg, borderColor: color + '33' }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionTile({ icon, label, color }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; color: string;
}) {
  return (
    <View style={[styles.actionTile, { borderColor: color + '44' }]}>
      <View style={[styles.actionIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bgDark },
  container: { paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgDark },

  // Header
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: Spacing.xl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  headerBg: {
    position: 'absolute', bottom: -30, right: -20,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: Colors.primaryDark, opacity: 0.4,
  },
  headerContent: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 8,
  },
  greeting: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  userName: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.textPrimary },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.full, borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  roleDot: { width: 7, height: 7, borderRadius: 4 },
  roleText: { fontSize: FontSizes.xs, fontWeight: '700' },
  headerSub: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.65)' },

  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg, gap: 10, marginBottom: Spacing.lg,
  },
  statBox: {
    width: '47%', borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  statLabel: { fontSize: FontSizes.xs, color: Colors.textMuted },

  // Actions grid
  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg, gap: 10, marginBottom: Spacing.xl,
  },
  actionTile: {
    width: '47%', borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1,
    backgroundColor: Colors.bgCard,
    alignItems: 'center', paddingVertical: Spacing.lg,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },

  // About
  aboutCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    marginHorizontal: Spacing.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  aboutText: { flex: 1, fontSize: FontSizes.sm, color: Colors.textMuted, lineHeight: 20 },
});