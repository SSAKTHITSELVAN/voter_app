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
import HeaderLanguageSwitcher from '@/components/HeaderLanguageSwitcher';
import { Colors, FontSizes, Radius, Shadows, Spacing } from '@/constants/theme';
import { ThemedButton } from '@/components/ThemedButton';
import { CollectionRecordsPanel } from '@/components/CollectionRecordsPanel';
import { StatusBadge } from '@/components/StatusBadge';
import { usersApi, householdsApi, buildingsApi } from '@/lib/api';
import { AuthStore } from '@/lib/auth';
import { User, UserRole, Household, HouseholdBrief, HouseholdUpdate, HouseType, Building, Unit, BuildingUpdate, UnitUpdate } from '@/lib/types';

type Tab = 'users' | 'create' | 'records' | 'households' | 'buildings';

const CREATABLE_ROLES: Record<string, UserRole[]> = {
  SUPER_ADMIN: ['ADMIN'],
  ADMIN: ['FIELD_USER'],
  FIELD_USER: [],
};

const ADMIN_TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'users', label: 'User List', icon: 'people-outline' },
  { key: 'create', label: 'Create User', icon: 'person-add-outline' },
  { key: 'records', label: 'Collected', icon: 'document-text-outline' },
  { key: 'households', label: 'Households', icon: 'home-outline' },
  { key: 'buildings', label: 'Buildings', icon: 'business-outline' },
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
        <View style={[styles.headerContent, { justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: Spacing.sm }}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="shield-checkmark" size={26} color={Colors.textPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Admin Panel</Text>
              <Text style={styles.subtitle}>
                {tab === 'records'
                  ? 'Collected data, export, and audit view'
                  : tab === 'households'
                    ? 'Manage & edit households'
                    : tab === 'buildings'
                      ? 'Manage & edit buildings'
                      : role === 'SUPER_ADMIN'
                        ? 'Manage Admins'
                        : 'Manage Field Users'}
              </Text>
            </View>
          </View>
          <HeaderLanguageSwitcher />
        </View>
      </View>

      <View style={styles.tabBarWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
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
        </ScrollView>
      </View>

      {tab === 'users' ? <UserList role={role!} /> : null}
      {tab === 'create' ? <CreateUser role={role!} onCreated={() => setTab('users')} /> : null}
      {tab === 'records' ? <CollectionRecordsPanel active /> : null}
      {tab === 'households' ? <HouseholdsPanel /> : null}
      {tab === 'buildings' ? <BuildingsPanel /> : null}
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
      Alert.alert('Created', `${name} has been added as ${selectedRole}.`, [
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

// ── Households Panel ──────────────────────────────────────────────────────────
function HouseholdsPanel() {
  const [households, setHouseholds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchHouseholds = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await householdsApi.list({ search, limit: 100 })) as any;
      setHouseholds(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      fetchHouseholds();
    }, [fetchHouseholds])
  );

  async function openHousehold(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const data = await householdsApi.get(id);
      setDetail(data);
    } catch (err: any) {
      Alert.alert('Error', err.message);
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  }

  if (selectedId) {
    if (detailLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ color: Colors.midGray, marginTop: 10 }}>Loading details...</Text>
        </View>
      );
    }
    if (detail) {
      // Inline simple detail view for admin panel, similar to households.tsx but specialized
      return (
        <View style={[styles.flex, { padding: Spacing.md }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
            <Pressable onPress={() => { setSelectedId(null); setDetail(null); fetchHouseholds(); }} style={{ marginRight: Spacing.md }}>
              <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
            </Pressable>
            <Text style={{ fontSize: FontSizes.lg, fontWeight: '700', color: Colors.textPrimary, flex: 1 }}>
              Household Details
            </Text>
            <Pressable
              onPress={() => {
                Alert.alert('Delete', 'Delete this household?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: async () => {
                      try {
                        await householdsApi.delete(detail.id);
                        setSelectedId(null);
                        setDetail(null);
                        fetchHouseholds();
                      } catch(err: any) {
                        Alert.alert('Error', err.message);
                      }
                  }}
                ]);
              }}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash" size={20} color={Colors.error} />
            </Pressable>
          </View>

          <ScrollView style={styles.createCard}>
            <Text style={styles.userName}>{detail.address_text || 'No address'}</Text>
            <Text style={styles.userPhone}>{detail.house_type}</Text>
            
            <Text style={[styles.title, { fontSize: FontSizes.md, marginTop: Spacing.md, marginBottom: Spacing.sm }]}>Persons ({detail.persons?.length || 0})</Text>
            {detail.persons?.map((p: any) => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.textPrimary }}>{p.name || 'Unnamed'}</Text>
                  <Text style={{ color: Colors.textMuted, fontSize: FontSizes.sm }}>{p.gender} • {p.age} years</Text>
                </View>
                <View style={[styles.roleBtn, { maxWidth: 80, paddingVertical: 4, minHeight: 0, backgroundColor: p.is_voter ? Colors.success+'33' : Colors.bgCard }]}>
                  <Text style={{ color: p.is_voter ? Colors.success : Colors.midGray, fontSize: FontSizes.xs }}>{p.is_voter ? 'Voter' : 'Non-voter'}</Text>
                </View>
                <Pressable
                  onPress={async () => {
                    try {
                      await householdsApi.deletePerson(detail.id, p.id);
                      openHousehold(detail.id); // reload
                    } catch(err: any) {
                      Alert.alert('Error', err.message);
                    }
                  }}
                  style={{ padding: Spacing.md }}
                >
                  <Ionicons name="close-circle" size={20} color={Colors.error} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }
  }

  return (
    <View style={styles.flex}>
      <View style={{ padding: Spacing.md, paddingBottom: 0 }}>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={20} color={Colors.midGray} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="Search address or ID..."
            placeholderTextColor={Colors.midGray}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={fetchHouseholds}
          />
        </View>
      </View>

      <FlatList
        data={households}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchHouseholds}
        renderItem={({ item }) => (
          <Pressable
            style={styles.userCard}
            onPress={() => openHousehold(item.id)}
          >
            <View style={styles.userAvatar}>
              <Ionicons name={item.house_type === 'APARTMENT' ? 'business' : 'home'} size={24} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>{item.address_text || item.id.split('-')[0]}</Text>
              <Text style={styles.userPhone}>{item.house_type} • {item.person_count} persons</Text>
              <Text style={styles.userDate}>{new Date(item.created_at).toLocaleString('en-IN')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.midGray} />
          </Pressable>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="home-outline" size={40} color={Colors.border} />
              <Text style={styles.emptyText}>No households found</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

// ── Buildings Panel ───────────────────────────────────────────────────────────
function BuildingsPanel() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Building | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit building state
  const [editingBuilding, setEditingBuilding] = useState(false);
  const [editBuildingName, setEditBuildingName] = useState('');
  const [editBuildingAddress, setEditBuildingAddress] = useState('');
  const [editBuildingFloors, setEditBuildingFloors] = useState('');

  // Add building state
  const [addingBuilding, setAddingBuilding] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingAddress, setNewBuildingAddress] = useState('');
  const [newBuildingFloors, setNewBuildingFloors] = useState('');

  // Add/Edit unit state
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editUnitFlat, setEditUnitFlat] = useState('');
  const [editUnitFloor, setEditUnitFloor] = useState('');

  const [addingUnit, setAddingUnit] = useState(false);
  const [newUnitFlat, setNewUnitFlat] = useState('');
  const [newUnitFloor, setNewUnitFloor] = useState('');

  const fetchBuildings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await buildingsApi.list({ search, limit: 100 });
      setBuildings(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      fetchBuildings();
    }, [fetchBuildings])
  );

  async function openBuilding(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const bData = await buildingsApi.get(id);
      const uData = await buildingsApi.listUnits(id);
      setDetail(bData);
      setUnits(uData);
      setEditingBuilding(false);
    } catch (err: any) {
      Alert.alert('Error', err.message);
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveBuildingEdits() {
    if (!detail) return;
    try {
      await buildingsApi.update(detail.id, {
        name: editBuildingName,
        address_text: editBuildingAddress,
        total_floors: editBuildingFloors ? parseInt(editBuildingFloors, 10) : null,
      });
      setEditingBuilding(false);
      openBuilding(detail.id);
      fetchBuildings();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  async function createBuilding() {
    if (!newBuildingName) {
      Alert.alert('Error', 'Building name is required');
      return;
    }
    try {
      await buildingsApi.create({
        name: newBuildingName,
        address_text: newBuildingAddress || undefined,
        total_floors: newBuildingFloors ? parseInt(newBuildingFloors, 10) : undefined,
      });
      setAddingBuilding(false);
      setNewBuildingName('');
      setNewBuildingAddress('');
      setNewBuildingFloors('');
      fetchBuildings();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  async function createUnit() {
    if (!detail || !newUnitFlat) return;
    try {
      await buildingsApi.createUnit({
        building_id: detail.id,
        flat_number: newUnitFlat,
        floor_number: newUnitFloor ? parseInt(newUnitFloor, 10) : undefined,
      });
      setAddingUnit(false);
      setNewUnitFlat('');
      setNewUnitFloor('');
      openBuilding(detail.id);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  async function saveUnitEdits() {
    if (!editingUnitId) return;
    try {
      await buildingsApi.updateUnit(editingUnitId, {
        flat_number: editUnitFlat,
        floor_number: editUnitFloor ? parseInt(editUnitFloor, 10) : null,
      });
      setEditingUnitId(null);
      openBuilding(detail!.id);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  if (selectedId) {
    if (detailLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ color: Colors.midGray, marginTop: 10 }}>Loading building details...</Text>
        </View>
      );
    }
    if (detail) {
      return (
        <View style={[styles.flex, { padding: Spacing.md }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
            <Pressable onPress={() => { setSelectedId(null); setDetail(null); fetchBuildings(); }} style={{ marginRight: Spacing.md }}>
              <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
            </Pressable>
            <Text style={{ fontSize: FontSizes.lg, fontWeight: '700', color: Colors.textPrimary, flex: 1 }}>
              Building Details
            </Text>
            <Pressable
              onPress={() => {
                setEditBuildingName(detail.name);
                setEditBuildingAddress(detail.address_text || '');
                setEditBuildingFloors(detail.total_floors ? String(detail.total_floors) : '');
                setEditingBuilding(!editingBuilding);
              }}
              style={[styles.deleteBtn, { marginRight: Spacing.xs, backgroundColor: Colors.white10 }]}
            >
              <Ionicons name={editingBuilding ? "close" : "create"} size={20} color={Colors.primary} />
            </Pressable>
            <Pressable
              onPress={() => {
                Alert.alert('Delete', 'Soft-delete this building? Associated households will still refer to it conceptually but it will be hidden from new searches.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: async () => {
                      try {
                        await buildingsApi.delete(detail.id);
                        setSelectedId(null);
                        setDetail(null);
                        fetchBuildings();
                      } catch(err: any) {
                        Alert.alert('Error', err.message);
                      }
                  }}
                ]);
              }}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash" size={20} color={Colors.error} />
            </Pressable>
          </View>

          <ScrollView>
            <View style={styles.createCard}>
              {editingBuilding ? (
                <>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <View style={[styles.inputWrap, { marginBottom: Spacing.sm }]}><TextInput style={styles.input} value={editBuildingName} onChangeText={setEditBuildingName} placeholderTextColor={Colors.midGray}/></View>
                  <Text style={styles.fieldLabel}>Address</Text>
                  <View style={[styles.inputWrap, { marginBottom: Spacing.sm }]}><TextInput style={styles.input} value={editBuildingAddress} onChangeText={setEditBuildingAddress} placeholderTextColor={Colors.midGray}/></View>
                  <Text style={styles.fieldLabel}>Floors</Text>
                  <View style={[styles.inputWrap, { marginBottom: Spacing.md }]}><TextInput style={styles.input} value={editBuildingFloors} onChangeText={setEditBuildingFloors} keyboardType="numeric" placeholderTextColor={Colors.midGray}/></View>
                  <ThemedButton title="Save Building" onPress={saveBuildingEdits} size="sm" />
                </>
              ) : (
                <>
                  <Text style={[styles.userName, { fontSize: FontSizes.xl }]}>{detail.name}</Text>
                  <Text style={styles.userPhone}>{detail.address_text || 'No address provided'}</Text>
                  <Text style={styles.userPhone}>Floors: {detail.total_floors || 'N/A'}</Text>
                </>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
              <Text style={[styles.title, { fontSize: FontSizes.md, flex: 1 }]}>Units ({units.length})</Text>
              <Pressable onPress={() => setAddingUnit(!addingUnit)} style={[styles.deleteBtn, { padding: Spacing.xs, backgroundColor: Colors.primaryMuted }]}>
                 <Ionicons name={addingUnit ? "close" : "add"} color={Colors.primary} size={20} />
              </Pressable>
            </View>

            {addingUnit && (
               <View style={[styles.createCard, { marginBottom: Spacing.md }]}>
                 <Text style={styles.fieldLabel}>Flat / Unit Number</Text>
                 <View style={[styles.inputWrap, { marginBottom: Spacing.sm }]}><TextInput style={styles.input} value={newUnitFlat} onChangeText={setNewUnitFlat} placeholder="e.g. 101" placeholderTextColor={Colors.midGray}/></View>
                 <Text style={styles.fieldLabel}>Floor</Text>
                 <View style={[styles.inputWrap, { marginBottom: Spacing.sm }]}><TextInput style={styles.input} value={newUnitFloor} onChangeText={setNewUnitFloor} keyboardType="numeric" placeholder="e.g. 1" placeholderTextColor={Colors.midGray}/></View>
                 <ThemedButton title="Add Unit" onPress={createUnit} size="sm" />
               </View>
            )}

            {units.map((u: Unit) => (
              <View key={u.id} style={{ paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
                {editingUnitId === u.id ? (
                  <View>
                     <Text style={styles.fieldLabel}>Flat / Unit</Text>
                     <View style={[styles.inputWrap, { marginBottom: Spacing.sm, height: 40, minHeight:40 }]}><TextInput style={styles.input} value={editUnitFlat} onChangeText={setEditUnitFlat} placeholderTextColor={Colors.midGray}/></View>
                     <Text style={styles.fieldLabel}>Floor</Text>
                     <View style={[styles.inputWrap, { marginBottom: Spacing.sm, height: 40, minHeight:40 }]}><TextInput style={styles.input} value={editUnitFloor} onChangeText={setEditUnitFloor} keyboardType="numeric" placeholderTextColor={Colors.midGray}/></View>
                     <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                        <ThemedButton title="Save" onPress={saveUnitEdits} size="sm" style={{ flex: 1 }} />
                        <ThemedButton title="Cancel" variant="outline" onPress={() => setEditingUnitId(null)} size="sm" style={{ flex: 1 }} />
                     </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Colors.textPrimary, fontSize: FontSizes.md, fontWeight:'bold' }}>Flat {u.flat_number}</Text>
                      <Text style={{ color: Colors.textMuted, fontSize: FontSizes.sm }}>Floor {u.floor_number ?? 'N/A'}</Text>
                    </View>
                    <Pressable
                      onPress={() => { setEditingUnitId(u.id); setEditUnitFlat(u.flat_number); setEditUnitFloor(u.floor_number ? String(u.floor_number) : ''); }}
                      style={{ padding: Spacing.md }}
                    >
                      <Ionicons name="create-outline" size={20} color={Colors.primary} />
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        Alert.alert('Delete', 'Delete this unit?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: async () => {
                              try {
                                await buildingsApi.deleteUnit(u.id);
                                openBuilding(detail.id);
                              } catch(e:any) { Alert.alert('Error', e.message); }
                          }}
                        ]);
                      }}
                      style={{ padding: Spacing.md, paddingRight: 0 }}
                    >
                      <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }
  }

  return (
    <View style={styles.flex}>
      <View style={{ padding: Spacing.md, paddingBottom: 0, flexDirection: 'row', gap: Spacing.sm }}>
        <View style={[styles.inputWrap, { flex: 1 }]}>
          <Ionicons name="search" size={20} color={Colors.midGray} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="Search buildings..."
            placeholderTextColor={Colors.midGray}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={fetchBuildings}
          />
        </View>
        <Pressable onPress={() => setAddingBuilding(!addingBuilding)} style={[styles.detailActionBtn, { width: 52, height: 52, backgroundColor: Colors.primaryMuted, borderColor: Colors.primary }]}>
           <Ionicons name={addingBuilding ? "close" : "add"} size={30} color={Colors.primary} />
        </Pressable>
      </View>

      {addingBuilding && (
        <View style={[styles.createCard, { margin: Spacing.md, marginBottom: 0 }]}>
           <Text style={styles.createTitle}>New Building</Text>
           <Text style={styles.fieldLabel}>Name</Text>
           <View style={[styles.inputWrap, { marginBottom: Spacing.sm }]}><TextInput style={styles.input} value={newBuildingName} onChangeText={setNewBuildingName} placeholder="e.g. Ocean View Towers" placeholderTextColor={Colors.midGray}/></View>
           <Text style={styles.fieldLabel}>Address</Text>
           <View style={[styles.inputWrap, { marginBottom: Spacing.sm }]}><TextInput style={styles.input} value={newBuildingAddress} onChangeText={setNewBuildingAddress} placeholderTextColor={Colors.midGray}/></View>
           <Text style={styles.fieldLabel}>Total Floors</Text>
           <View style={[styles.inputWrap, { marginBottom: Spacing.md }]}><TextInput style={styles.input} value={newBuildingFloors} onChangeText={setNewBuildingFloors} keyboardType="numeric" placeholderTextColor={Colors.midGray}/></View>
           <ThemedButton title="Create Building" onPress={createBuilding} />
        </View>
      )}

      <FlatList
        data={buildings}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchBuildings}
        renderItem={({ item }) => (
          <Pressable
            style={styles.userCard}
            onPress={() => openBuilding(item.id)}
          >
            <View style={styles.userAvatar}>
              <Ionicons name="business" size={24} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.userPhone}>{item.address_text || 'No address'}</Text>
              <Text style={styles.userDate}>{item.total_floors ? `${item.total_floors} floors` : 'N/A'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.midGray} />
          </Pressable>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={40} color={Colors.border} />
              <Text style={styles.emptyText}>No buildings found</Text>
            </View>
          ) : null
        }
      />
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

  tabBarWrap: {
    backgroundColor: Colors.charcoal,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tabBarContent: {
    paddingHorizontal: Spacing.sm,
    gap: 8,
  },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: 12, gap: 6, minHeight: 52,
    borderBottomWidth: 2.5, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.midGray },
  tabTextActive: { color: Colors.primary },
  tabContentWrap: { flex: 1, minHeight: 0 },

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
  detailActionBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1 },

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


