import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { StatusBadge } from '@/components/StatusBadge';
import { ThemedButton } from '@/components/ThemedButton';
import { usersApi } from '@/lib/api';
import { AuthStore } from '@/lib/auth';
import { User } from '@/lib/types';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [])
  );

  async function loadUser() {
    try {
      const me = await usersApi.me();
      setUser(me);
    } catch {}
    setLoading(false);
  }

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          AuthStore.clear();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </Text>
          </View>
          <View style={styles.avatarBadge}>
            <Ionicons name="checkmark" size={10} color={Colors.textPrimary} />
          </View>
        </View>
        <Text style={styles.userName}>{user?.name ?? '—'}</Text>
        <Text style={styles.userPhone}>{user?.phone ?? '—'}</Text>
        {user && <StatusBadge status={user.role} />}
      </View>

      {/* Account Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        <View style={styles.infoCard}>
          <InfoRow icon="person-outline" label="Full Name" value={user?.name ?? '—'} />
          <Separator />
          <InfoRow icon="call-outline" label="Phone" value={user?.phone ?? '—'} />
          <Separator />
          <InfoRow icon="shield-outline" label="Role" value={user?.role ?? '—'} />
          <Separator />
          <InfoRow
            icon="calendar-outline"
            label="Joined"
            value={user ? new Date(user.created_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric'
            }) : '—'}
          />
          <Separator />
          <InfoRow
            icon="ellipse-outline"
            label="Status"
            value={user?.deleted_at ? 'Inactive' : 'Active'}
            valueColor={user?.deleted_at ? Colors.error : Colors.success}
          />
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Info</Text>
        <View style={styles.infoCard}>
          <InfoRow icon="phone-portrait-outline" label="App Version" value="1.0.0" />
          <Separator />
          <InfoRow icon="server-outline" label="Backend" value="FastAPI + PostgreSQL" />
          <Separator />
          <InfoRow icon="navigate-outline" label="Location" value="Haversine (no extensions)" />
        </View>
      </View>

      {/* Help */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Help</Text>
        <View style={styles.infoCard}>
          <MenuRow icon="help-circle-outline" label="How to collect data" />
          <Separator />
          <MenuRow icon="information-circle-outline" label="About ADMK Field App" />
          <Separator />
          <MenuRow icon="chatbubble-outline" label="Contact Admin" />
        </View>
      </View>

      {/* Logout */}
      <View style={styles.logoutWrap}>
        <ThemedButton
          title="Logout"
          onPress={handleLogout}
          variant="outline"
          fullWidth
          size="lg"
        />
      </View>

      <Text style={styles.footer}>
        ADMK Voter Data Platform · Built for Field Operations
      </Text>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value, valueColor }: {
  icon: any; label: string; value: string; valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={16} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor ? { color: valueColor } : undefined]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function MenuRow({ icon, label }: { icon: any; label: string }) {
  return (
    <Pressable style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.7 }]}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={16} color={Colors.primary} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.midGray} />
    </Pressable>
  );
}

function Separator() {
  return <View style={styles.sep} />;
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bgDark },
  container: { paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgDark },

  header: {
    backgroundColor: Colors.primary,
    paddingTop: 60, paddingBottom: Spacing.xl,
    alignItems: 'center', gap: 6,
    overflow: 'hidden',
  },
  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: Colors.textPrimary },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  userName: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.textPrimary },
  userPhone: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },

  section: { paddingHorizontal: Spacing.md, marginTop: Spacing.lg },
  sectionTitle: {
    fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 0.8, marginBottom: Spacing.sm, marginLeft: 4,
  },
  infoCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, gap: 12,
  },
  infoIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.primary + '1A',
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { fontSize: FontSizes.xs, color: Colors.textMuted, marginBottom: 2 },
  infoValue: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textPrimary },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, gap: 12,
  },
  menuLabel: { flex: 1, fontSize: FontSizes.sm, fontWeight: '500', color: Colors.textPrimary },
  sep: { height: 1, backgroundColor: Colors.border, marginLeft: 56 },

  logoutWrap: { padding: Spacing.xl, paddingTop: Spacing.lg },
  footer: {
    textAlign: 'center', fontSize: FontSizes.xs,
    color: Colors.border, paddingBottom: Spacing.lg,
  },
});