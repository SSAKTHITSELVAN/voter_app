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
import { Colors, FontSizes, Radius, Shadows, Spacing } from '@/constants/theme';
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
        <View style={styles.headerDecorLeft} />
        <View style={styles.headerDecorRight} />
        <View style={styles.headerDecorTop} />

        <View style={styles.avatarWrap}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </Text>
            </View>
          </View>
          <View style={styles.avatarBadge}>
            <Ionicons name="checkmark" size={10} color={Colors.textPrimary} />
          </View>
        </View>
        <Text style={styles.userName}>{user?.name ?? '—'}</Text>
        <Text style={styles.userPhone}>{user?.phone ?? '—'}</Text>
        <View style={styles.roleChip}>
          {user && <StatusBadge status={user.role} />}
        </View>
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
          icon={<Ionicons name="log-out-outline" size={18} color={Colors.primary} />}
        />
      </View>

      <View style={styles.footerRow}>
        <View style={styles.footerLogoWrap}>
          <View style={styles.footerDot} />
        </View>
        <Text style={styles.footer}>
          AIADMK Voter Data Platform · v1.0
        </Text>
        <View style={styles.footerLogoWrap}>
          <View style={styles.footerDot} />
        </View>
      </View>
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
  container: { paddingBottom: 56 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgDark },

  header: {
    backgroundColor: Colors.primary,
    paddingTop: 64, paddingBottom: Spacing.xl,
    alignItems: 'center', gap: 6,
    overflow: 'hidden',
  },
  headerDecorLeft: {
    position: 'absolute', top: -20, left: -20,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: Colors.primaryDark, opacity: 0.5,
  },
  headerDecorRight: {
    position: 'absolute', bottom: -40, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: Colors.primaryDark, opacity: 0.4,
  },
  headerDecorTop: {
    position: 'absolute', top: 20, right: 30,
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.white10,
  },

  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: Colors.gold,
    padding: 3, alignItems: 'center', justifyContent: 'center',
    ...Shadows.gold,
  },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: Colors.white20,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FontSizes.huge, fontWeight: '900', color: Colors.textPrimary },
  avatarBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.success,
    borderWidth: 2.5, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  userName: { fontSize: FontSizes.xl, fontWeight: '900', color: Colors.textPrimary },
  userPhone: { fontSize: FontSizes.sm, color: Colors.white60, marginBottom: 4 },
  roleChip: { marginTop: 2 },

  section: { paddingHorizontal: Spacing.md, marginTop: Spacing.lg },
  sectionTitle: {
    fontSize: FontSizes.xs, fontWeight: '800', color: Colors.textMuted,
    letterSpacing: 1, marginBottom: Spacing.sm, marginLeft: 4,
    textTransform: 'uppercase',
  },
  infoCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
    ...Shadows.card,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, gap: 12, minHeight: 56,
  },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1, borderColor: Colors.borderRed,
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { fontSize: FontSizes.xs, color: Colors.textMuted, marginBottom: 2 },
  infoValue: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textPrimary },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, gap: 12, minHeight: 56,
  },
  menuLabel: { flex: 1, fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textPrimary },
  sep: { height: 1, backgroundColor: Colors.border, marginLeft: 56 },

  logoutWrap: { padding: Spacing.xl, paddingTop: Spacing.lg },
  footerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingBottom: Spacing.lg,
  },
  footerLogoWrap: { alignItems: 'center' },
  footerDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  footer: {
    fontSize: FontSizes.xs, color: Colors.border,
  },
});