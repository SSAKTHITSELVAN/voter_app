import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Colors, FontSizes, Radius, Shadows, Spacing } from '@/constants/theme';
import { ThemedButton } from '@/components/ThemedButton';
import { CollectionRecordsPanel } from '@/components/CollectionRecordsPanel';
import { StatusBadge } from '@/components/StatusBadge';
import { usersApi } from '@/lib/api';
import { AuthStore } from '@/lib/auth';
import { User, UserRole } from '@/lib/types';

type Tab = 'users' | 'create' | 'records';

const CREATABLE_ROLES: Record<string, UserRole[]> = {
  SUPER_ADMIN: ['ADMIN'],
  ADMIN: ['FIELD_USER'],
  FIELD_USER: [],
};

const ADMIN_TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'users', label: 'User List', icon: 'people-outline' },
  { key: 'create', label: 'Create User', icon: 'person-add-outline' },
  { key: 'records', label: 'Collected', icon: 'document-text-outline' },
];

export default function AdminScreen() {
  const [tab, setTab] = useState<Tab>('users');
  const role = AuthStore.getRole();

  if (role === 'FIELD_USER') {
    return (
      <View style={styles.noAccess}>
        <Ionicons name="lock-closed" size={48} color={Colors.border} />
        <Text style={styles.noAccessText}>Admin access only</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View style={styles.headerDecorLeft} />
        <View style={styles.headerDecorRight} />
        <View style={styles.headerContent}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="shield-checkmark" size={26} color={Colors.textPrimary} />
          </View>
          <View>
            <Text style={styles.title}>Admin Panel</Text>
            <Text style={styles.subtitle}>
              {tab === 'records'
                ? 'Collected data, export, and audit view'
                : role === 'SUPER_ADMIN'
                  ? 'Manage Admins'
                  : 'Manage Field Users'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.tabBar}>
        {ADMIN_TABS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setTab(item.key)}
            style={[styles.tabBtn, tab === item.key && styles.tabBtnActive]}
          >
            <Ionicons
              name={item.icon as any}
              size={16}
              color={tab === item.key ? Colors.primary : Colors.midGray}
            />
            <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'users' ? <UserList role={role!} /> : null}
      {tab === 'create' ? <CreateUser role={role!} onCreated={() => setTab('users')} /> : null}
      {tab === 'records' ? <CollectionRecordsPanel active /> : null}
    </View>
  );
}

function UserList({ role }: { role: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    setLoading(true);
    try {
      const res = await usersApi.list(100, 0);
      setUsers(res.items);
      setTotal(res.total);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  function confirmDelete(user: User) {
    Alert.alert(
      'Deactivate User',
      `Deactivate ${user.name} (${user.phone})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            setDeleting(user.id);
            try {
              await usersApi.delete(user.id);
              setUsers(prev => prev.filter(u => u.id !== user.id));
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={users}
      keyExtractor={u => u.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Text style={styles.countLabel}>
          {total} user{total !== 1 ? 's' : ''} found
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userPhone}>{item.phone}</Text>
            <View style={styles.userMeta}>
              <StatusBadge status={item.role} />
              <Text style={styles.userDate}>
                {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => confirmDelete(item)}
            style={styles.deleteBtn}
            disabled={deleting === item.id}
          >
            {deleting === item.id
              ? <ActivityIndicator size="small" color={Colors.error} />
              : <Ionicons name="person-remove-outline" size={18} color={Colors.error} />
            }
          </Pressable>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={40} color={Colors.border} />
          <Text style={styles.emptyText}>No users found</Text>
        </View>
      }
    />
  );
}

// ── Create User ───────────────────────────────────────────────────────────────
function CreateUser({ role, onCreated }: { role: string; onCreated: () => void }) {
  const allowedRoles = CREATABLE_ROLES[role] ?? [];
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(allowedRoles[0] ?? 'FIELD_USER');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Required', 'All fields are required.');
      return;
    }
    if (!/^\d{10,15}$/.test(phone.trim())) {
      Alert.alert('Invalid Phone', 'Phone must be 10–15 digits.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await usersApi.create({
        name: name.trim(),
        phone: phone.trim(),
        password,
        role: selectedRole,
      });
      Alert.alert('✅ Created', `${name} has been added as ${selectedRole}.`, [
        { text: 'OK', onPress: () => {
          setName(''); setPhone(''); setPassword('');
          onCreated();
        }},
      ]);
    } catch (err: any) {
      Alert.alert('Failed', err.message ?? 'Could not create user.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.createContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.createCard}>
          <Text style={styles.createTitle}>New User</Text>

          <Field label="Full Name" icon="person-outline">
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter full name"
              placeholderTextColor={Colors.midGray}
              autoCapitalize="words"
            />
          </Field>

          <Field label="Phone Number" icon="call-outline">
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="9XXXXXXXXX"
              placeholderTextColor={Colors.midGray}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </Field>

          <Field label="Password" icon="lock-closed-outline">
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Min 6 characters"
              placeholderTextColor={Colors.midGray}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(v => !v)} style={{ padding: 4 }}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={Colors.midGray}
              />
            </Pressable>
          </Field>

          <Text style={styles.fieldLabel}>Role</Text>
          <View style={styles.roleRow}>
            {allowedRoles.map(r => (
              <Pressable
                key={r}
                onPress={() => setSelectedRole(r)}
                style={[styles.roleBtn, selectedRole === r && styles.roleBtnActive]}
              >
                <Ionicons
                  name={r === 'ADMIN' ? 'shield-checkmark-outline' : 'person-outline'}
                  size={16}
                  color={selectedRole === r ? Colors.textPrimary : Colors.midGray}
                />
                <Text style={[styles.roleBtnText, selectedRole === r && styles.roleBtnTextActive]}>
                  {r}
                </Text>
              </Pressable>
            ))}
          </View>

          <ThemedButton
            title="Create User"
            onPress={handleCreate}
            loading={loading}
            fullWidth
            size="lg"
            style={{ marginTop: Spacing.md }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, icon, children }: { label: string; icon: any; children: React.ReactNode }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={17} color={Colors.primary} style={{ marginRight: 8 }} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bgDark },
  noAccess: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgDark, gap: 12 },
  noAccessText: { fontSize: FontSizes.md, color: Colors.textMuted },

  header: {
    backgroundColor: Colors.primary,
    paddingTop: 64, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg,
    overflow: 'hidden',
  },
  headerDecorLeft: {
    position: 'absolute', top: -20, left: -20,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.primaryDark, opacity: 0.5,
  },
  headerDecorRight: {
    position: 'absolute', bottom: -30, right: -20,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: Colors.primaryDark, opacity: 0.4,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerIconWrap: {
    width: 48, height: 48, borderRadius: Radius.md,
    backgroundColor: Colors.white10,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: FontSizes.xxl, fontWeight: '900', color: Colors.textPrimary },
  subtitle: { fontSize: FontSizes.xs, color: Colors.white60, marginTop: 2 },

  tabBar: {
    flexDirection: 'row', backgroundColor: Colors.charcoal,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 6, minHeight: 52,
    borderBottomWidth: 2.5, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.midGray },
  tabTextActive: { color: Colors.primary },

  list: { padding: Spacing.md, paddingBottom: 32 },
  countLabel: { fontSize: FontSizes.xs, color: Colors.textMuted, marginBottom: Spacing.sm, fontWeight: '700', letterSpacing: 0.3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { color: Colors.textMuted, fontSize: FontSizes.sm },

  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm, gap: 12,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadows.card,
  },
  userAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 2, borderColor: Colors.borderRed,
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { fontSize: FontSizes.lg, fontWeight: '900', color: Colors.primary },
  userName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.textPrimary },
  userPhone: { fontSize: FontSizes.sm, color: Colors.textMuted, marginBottom: 6 },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userDate: { fontSize: FontSizes.xs, color: Colors.textMuted },
  deleteBtn: { padding: Spacing.sm, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },

  createContainer: { padding: Spacing.md, paddingBottom: 48 },
  createCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border,
    ...Shadows.card,
  },
  createTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg },

  fieldGroup: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textMuted, marginBottom: 6, letterSpacing: 0.4 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgCardRaised, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, minHeight: 52,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  input: { flex: 1, fontSize: FontSizes.md, color: Colors.textPrimary },

  roleRow: { flexDirection: 'row', gap: Spacing.sm },
  roleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: Radius.md, minHeight: 50,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.bgCardRaised,
  },
  roleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.midGray },
  roleBtnTextActive: { color: Colors.textPrimary },
});


