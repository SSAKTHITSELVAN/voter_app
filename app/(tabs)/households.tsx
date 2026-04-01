import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { HouseholdCard } from '@/components/HouseholdCard';
import { LandmarkImageGallery } from '@/components/LandmarkImageGallery';
import { ThemedButton } from '@/components/ThemedButton';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { householdsApi, resolveApiUrl } from '@/lib/api';
import { Household, HouseholdBrief, HouseholdUpdate, GenderType, HouseType } from '@/lib/types';
import HeaderLanguageSwitcher from '@/components/HeaderLanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { AuthStore } from '@/lib/auth';

const RADII = [100, 250, 500, 1000, 5000];
export default function HouseholdsScreen() {
  const { t } = useTranslation();
  const [households, setHouseholds] = useState<HouseholdBrief[]>([]);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(500);
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLon, setMyLon] = useState<number | null>(null);
  const [selected, setSelected] = useState<Household | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchNearby = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('Permission denied'), t('Location is needed to find nearby households.'));
        return;
      }
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('GPS timeout')), 10000)
      );
      const loc = await Promise.race([
        Location.getCurrentPositionAsync({ 
          accuracy: Location.Accuracy.High,
        }),
        timeoutPromise
      ]) as Awaited<ReturnType<typeof Location.getCurrentPositionAsync>>;
      
      // Validate GPS accuracy
      const horizontalAccuracy = loc.coords.accuracy ?? 999;
      if (horizontalAccuracy > 100) {
        Alert.alert(
          t('Warning'),
          t('GPS accuracy is low ({{accuracy}}m). Results may be inaccurate. Please try in an open area.', { accuracy: Math.round(horizontalAccuracy) })
        );
      }
      
      setMyLat(loc.coords.latitude);
      setMyLon(loc.coords.longitude);
      const results = await householdsApi.nearby(
        loc.coords.latitude,
        loc.coords.longitude,
        radius,
        100,
      );
      setHouseholds(results);
    } catch (err: any) {
      const msg = err?.message?.includes('timeout')
        ? t('GPS timeout. Ensure location is enabled and you are in an open area.')
        : err.message ?? t('Could not load households.');
      Alert.alert(t('Error'), msg);
    } finally {
      setLoading(false);
    }
  }, [radius, t]);

  useFocusEffect(
    useCallback(() => {
      void fetchNearby();
    }, [fetchNearby]),
  );

  async function openHousehold(id: string) {
    setDetailLoading(true);
    try {
      const household = await householdsApi.get(id);
      setSelected(household);
    } catch (err: any) {
      Alert.alert(t('Error'), err.message ?? t('Could not load household details.'));
    } finally {
      setDetailLoading(false);
    }
  }

  if (selected) {
    return (
      <HouseholdDetail
        household={selected}
        onBack={() => setSelected(null)}
        onRefresh={() => {
          void fetchNearby();
          // Also reload the detail if still viewing it
          void openHousehold(selected.id).catch(() => setSelected(null));
        }}
      />
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View style={styles.headerDecorLeft} />
        <View style={styles.headerDecorRight} />
        <View style={[styles.headerContent, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="home" size={26} color={Colors.textPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('Nearby Households')}</Text>
              {myLat !== null ? (
                <Text style={styles.subtitle}>{myLat.toFixed(4)}, {myLon?.toFixed(4)}</Text>
              ) : null}
            </View>
            <Pressable onPress={() => void fetchNearby()} style={styles.refreshHeaderBtn} disabled={loading}>
              <Ionicons name="refresh" size={20} color={loading ? Colors.white20 : Colors.textPrimary} />
            </Pressable>
          </View>
          <HeaderLanguageSwitcher />
        </View>
      </View>

      <View style={styles.radiusRow}>
        <Text style={styles.radiusLabel}>{t('Radius:')}</Text>
        {RADII.map((value) => (
          <Pressable
            key={value}
            onPress={() => setRadius(value)}
            style={[styles.radiusBtn, radius === value && styles.radiusBtnActive]}
          >
            <Text style={[styles.radiusBtnText, radius === value && styles.radiusBtnTextActive]}>
              {value >= 1000 ? `${value / 1000}km` : `${value}m`}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading || detailLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>{t('Finding households...')}</Text>
        </View>
      ) : (
        <FlatList
          data={households}
          keyExtractor={(household) => household.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <HouseholdCard household={item} onPress={() => void openHousehold(item.id)} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="home-outline" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>
                {t('No households found within {{radius}}m', { radius: radius >= 1000 ? radius / 1000 + 'km' : radius })}
              </Text>
              <ThemedButton title={t('Refresh')} onPress={() => void fetchNearby()} variant="outline" size="sm" style={{ marginTop: 16 }} />
            </View>
          }
          ListHeaderComponent={
            households.length > 0 ? (
              <Text style={styles.countText}>
                {t(households.length === 1 ? '{{count}} household found' : '{{count}} households found', { count: households.length })}
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

function HouseholdDetail({
  household,
  onBack,
  onRefresh,
}: {
  household: Household;
  onBack: () => void;
  onRefresh?: () => void;
}) {
  const { t } = useTranslation();
  const role = AuthStore.getRole();
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingPersonId, setDeletingPersonId] = useState<string | null>(null);

  // Person editing state
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editPersonName, setEditPersonName] = useState('');
  const [editPersonAge, setEditPersonAge] = useState('');
  const [editPersonGender, setEditPersonGender] = useState<GenderType | null>(null);
  const [savingPersonId, setSavingPersonId] = useState<string | null>(null);
  const [addingPerson, setAddingPerson] = useState(false);

  // Edit form state
  const [editAddress, setEditAddress] = useState(household.address_text ?? '');
  const [editHouseType, setEditHouseType] = useState<HouseType>(household.house_type);

  const voterCount = household.persons.filter((person) => person.is_voter).length;
  const galleryImages = household.landmark_images.map((image) => ({
    id: image.id,
    uri: resolveApiUrl(image.image_url),
  }));

  async function handleSave() {
    setSaving(true);
    try {
      const payload: HouseholdUpdate = {};
      if (editAddress.trim() !== (household.address_text ?? '')) {
        payload.address_text = editAddress.trim() || null;
      }
      if (editHouseType !== household.house_type) {
        payload.house_type = editHouseType;
        if (editHouseType === 'INDIVIDUAL') payload.unit_id = null;
      }
      await householdsApi.update(household.id, payload);
      Alert.alert(t('Updated'), t('Household updated successfully.'));
      setEditing(false);
      onRefresh?.();
    } catch (err: any) {
      Alert.alert(t('Error'), err.message ?? t('Failed to update.'));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      t('Delete Household'),
      t('This will permanently remove the household. Continue?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await householdsApi.delete(household.id);
              Alert.alert(t('Deleted'), t('Household removed.'));
              onBack();
              onRefresh?.();
            } catch (err: any) {
              Alert.alert(t('Error'), err.message ?? t('Failed to delete.'));
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  function confirmDeletePerson(personId: string, personName: string | null | undefined) {
    Alert.alert(
      t('Remove Person'),
      t('Remove {{name}} from this household?', { name: personName?.trim() || t('Unknown') }),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Remove'),
          style: 'destructive',
          onPress: async () => {
            setDeletingPersonId(personId);
            try {
              await householdsApi.deletePerson(household.id, personId);
              onRefresh?.();
            } catch (err: any) {
              Alert.alert(t('Error'), err.message ?? t('Failed to remove person.'));
            } finally {
              setDeletingPersonId(null);
            }
          },
        },
      ],
    );
  }

  function startEditPerson(person: typeof household.persons[0]) {
    setEditingPersonId(person.id!);
    setEditPersonName(person.name || '');
    setEditPersonAge(person.age ? person.age.toString() : '');
    setEditPersonGender(person.gender);
  }

  async function savePersonChanges(personId: string) {
    setSavingPersonId(personId);
    try {
      const ageNum = editPersonAge ? parseInt(editPersonAge, 10) : null;
      const isVoter = ageNum ? ageNum >= 18 : false;

      await householdsApi.update(household.id, {
        persons: household.persons.map((p) =>
          p.id === personId
            ? {
                name: editPersonName.trim() || null,
                age: ageNum,
                gender: editPersonGender,
                is_voter: isVoter,
              }
            : {
                name: p.name,
                age: p.age,
                gender: p.gender,
                is_voter: p.is_voter,
              }
        ),
      });

      Alert.alert(t('Updated'), t('Person details updated successfully.'));
      setEditingPersonId(null);
      onRefresh?.();
    } catch (err: any) {
      Alert.alert(t('Error'), err.message ?? t('Failed to update person.'));
    } finally {
      setSavingPersonId(null);
    }
  }

  async function addNewPerson() {
    setAddingPerson(true);
    try {
      await householdsApi.update(household.id, {
        persons: [
          ...household.persons.map((p) => ({
            name: p.name,
            age: p.age,
            gender: p.gender,
            is_voter: p.is_voter,
          })),
          {
            name: null,
            age: null,
            gender: null,
            is_voter: false,
          },
        ],
      });

      Alert.alert(t('Added'), t('New person added. Edit to add details.'));
      onRefresh?.();
    } catch (err: any) {
      Alert.alert(t('Error'), err.message ?? t('Failed to add person.'));
    } finally {
      setAddingPerson(false);
    }
  }

  return (
    <View style={styles.flex}>
      {/* Header */}
      <View style={styles.detailHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.detailTitle}>{t('Household Details')}</Text>
        {isAdmin && (
          <View style={{ flexDirection: 'row', gap: 8, marginLeft: 'auto' }}>
            <Pressable
              onPress={() => {
                setEditAddress(household.address_text ?? '');
                setEditHouseType(household.house_type);
                setEditing((e) => !e);
              }}
              style={[styles.detailActionBtn, { borderColor: Colors.primary }]}
            >
              <Ionicons name={editing ? 'close' : 'create-outline'} size={18} color={Colors.primary} />
            </Pressable>
            <Pressable
              onPress={confirmDelete}
              disabled={deleting}
              style={[styles.detailActionBtn, { borderColor: Colors.error }]}
            >
              {deleting
                ? <ActivityIndicator size="small" color={Colors.error} />
                : <Ionicons name="trash-outline" size={18} color={Colors.error} />}
            </Pressable>
          </View>
        )}
      </View>

      {/* Inline Edit Form */}
      {editing && isAdmin && (
        <View style={styles.editCard}>
          <Text style={styles.editTitle}>{t('Edit Household')}</Text>

          <Text style={styles.editLabel}>{t('House Type')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.md }}>
            {(['INDIVIDUAL', 'APARTMENT'] as HouseType[]).map((type) => (
              <Pressable
                key={type}
                onPress={() => setEditHouseType(type)}
                style={[
                  styles.editTypeBtn,
                  editHouseType === type && styles.editTypeBtnActive,
                ]}
              >
                <Ionicons
                  name={type === 'APARTMENT' ? 'business-outline' : 'home-outline'}
                  size={15}
                  color={editHouseType === type ? Colors.textPrimary : Colors.midGray}
                />
                <Text
                  style={[
                    styles.editTypeBtnText,
                    editHouseType === type && { color: Colors.textPrimary },
                  ]}
                >
                  {t(type)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.editLabel}>{t('Address')}</Text>
          <TextInput
            style={styles.editInput}
            value={editAddress}
            onChangeText={setEditAddress}
            placeholder={t('House number, street...')}
            placeholderTextColor={Colors.midGray}
            multiline
          />

          <View style={{ flexDirection: 'row', gap: 8, marginTop: Spacing.sm }}>
            <ThemedButton
              title={saving ? t('Saving...') : t('Save Changes')}
              onPress={handleSave}
              loading={saving}
              size="sm"
              style={{ flex: 1 }}
            />
            <ThemedButton
              title={t('Cancel')}
              onPress={() => setEditing(false)}
              variant="outline"
              size="sm"
              style={{ flex: 1 }}
            />
          </View>
        </View>
      )}

      <FlatList
        data={household.persons}
        keyExtractor={(item, index) => item.id ?? String(index)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <View
              style={[
                styles.typeBadge,
                { borderColor: household.house_type === 'APARTMENT' ? Colors.gold : Colors.primary },
              ]}
            >
              <Ionicons
                name={household.house_type === 'APARTMENT' ? 'business' : 'home'}
                size={14}
                color={household.house_type === 'APARTMENT' ? Colors.gold : Colors.primary}
              />
              <Text
                style={[
                  styles.typeBadgeText,
                  { color: household.house_type === 'APARTMENT' ? Colors.gold : Colors.primary },
                ]}
              >
                {t(household.house_type)}
              </Text>
            </View>

            <View style={styles.detailCard}>
              <Row icon="location-outline" label={t('Address')} value={household.address_text ?? t('No address')} />
              <Row
                icon="navigate-outline"
                label={t('Coordinates')}
                value={`${household.latitude.toFixed(6)}, ${household.longitude.toFixed(6)}`}
                mono
              />
              <Row
                icon="calendar-outline"
                label={t('Recorded On')}
                value={new Date(household.created_at).toLocaleString('en-IN')}
              />
            </View>

            <View style={styles.gallerySection}>
              <View style={styles.galleryHeader}>
                <Text style={styles.galleryTitle}>{t('Landmark Images')}</Text>
                <Text style={styles.galleryCount}>
                  {t(household.landmark_images.length === 1 ? '{{count}} image' : '{{count}} images', { count: household.landmark_images.length })}
                </Text>
              </View>
              <LandmarkImageGallery
                images={galleryImages}
                emptyText={t('No landmark images were uploaded for this household.')}
              />
            </View>

            <View style={styles.statsRow}>
              <StatMini label={t('Total People')} value={household.persons.length} color={Colors.info} />
              <StatMini label={t('Voters')} value={voterCount} color={Colors.success} />
              <StatMini label={t('Non-Voters')} value={household.persons.length - voterCount} color={Colors.lightGray} />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: Spacing.md, marginBottom: Spacing.sm }}>
              <Text style={styles.personsTitle}>{t('Persons')} ({household.persons.length})</Text>
              {isAdmin && (
                <Pressable onPress={addNewPerson} disabled={addingPerson} style={styles.addPersonMiniBtn}>
                  {addingPerson ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="person-add-outline" size={14} color={Colors.primary} />
                      <Text style={styles.addPersonMiniBtnText}>{t('Add')}</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          </>
        }
        renderItem={({ item, index }) => {
          const isEditing = editingPersonId === item.id;
          const ageNum = editPersonAge ? parseInt(editPersonAge, 10) : null;
          const voterStatus = ageNum ? (ageNum >= 18 ? t('Eligible') : t('Not eligible')) : t('Unknown age');

          if (isEditing && item.id) {
            return (
              <View style={[styles.personRow, { backgroundColor: Colors.primaryMuted + '22', borderColor: Colors.primary }]}>
                <View style={styles.editPersonForm}>
                  <Text style={styles.editPersonLabel}>{t('Name')}</Text>
                  <TextInput
                    style={styles.editPersonInput}
                    value={editPersonName}
                    onChangeText={setEditPersonName}
                    placeholder={t('Person name')}
                    placeholderTextColor={Colors.midGray}
                    maxLength={120}
                  />

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.editPersonLabel}>{t('Age')}</Text>
                      <TextInput
                        style={styles.editPersonInput}
                        value={editPersonAge}
                        onChangeText={setEditPersonAge}
                        keyboardType="numeric"
                        placeholder="-"
                        placeholderTextColor={Colors.midGray}
                        maxLength={3}
                      />
                      <Text style={styles.editPersonHint}>{voterStatus}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.editPersonLabel}>{t('Gender')}</Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {(['MALE', 'FEMALE', 'OTHER'] as GenderType[]).map((gender) => (
                          <Pressable
                            key={gender}
                            onPress={() => setEditPersonGender(gender)}
                            style={[
                              styles.genderSelectBtn,
                              editPersonGender === gender && styles.genderSelectBtnActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.genderSelectText,
                                editPersonGender === gender && styles.genderSelectTextActive,
                              ]}
                            >
                              {t(gender[0])}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: Spacing.sm }}>
                    <ThemedButton
                      title={savingPersonId === item.id ? t('Saving...') : t('Save')}
                      onPress={() => savePersonChanges(item.id!)}
                      loading={savingPersonId === item.id}
                      size="sm"
                      style={{ flex: 1 }}
                    />
                    <ThemedButton
                      title={t('Cancel')}
                      onPress={() => setEditingPersonId(null)}
                      variant="outline"
                      size="sm"
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              </View>
            );
          }

          return (
            <View style={styles.personRow}>
              <View style={styles.personBadge}>
                <Text style={styles.personBadgeText}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.personInfo}>
                  {item.name?.trim() ? item.name.trim() : ''}{item.name?.trim() ? ' | ' : ''}{t(item.gender ?? 'Unknown')} | {t('Age')} {item.age ?? '?'}
                </Text>
              </View>
              <View style={[styles.voterTag, { backgroundColor: item.is_voter ? '#16382A' : Colors.darkGray }]}>
                <Ionicons
                  name={item.is_voter ? 'checkmark-circle' : 'close-circle'}
                  size={13}
                  color={item.is_voter ? Colors.success : Colors.midGray}
                />
                <Text style={[styles.voterTagText, { color: item.is_voter ? Colors.success : Colors.midGray }]}>
                  {item.is_voter ? t('Voter') : t('Non-voter')}
                </Text>
              </View>
              {isAdmin && item.id && (
                <>
                  <Pressable
                    onPress={() => startEditPerson(item)}
                    style={{ padding: 4, marginLeft: 4 }}
                  >
                    <Ionicons name="create-outline" size={18} color={Colors.primary} />
                  </Pressable>
                  <Pressable
                    onPress={() => confirmDeletePerson(item.id!, item.name)}
                    disabled={deletingPersonId === item.id}
                    style={{ padding: 4 }}
                  >
                    {deletingPersonId === item.id
                      ? <ActivityIndicator size="small" color={Colors.error} />
                      : <Ionicons name="close-circle" size={18} color={Colors.error} />}
                  </Pressable>
                </>
              )}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.noPerson}>{t('No persons recorded.')}</Text>}
      />
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  mono,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.rowItem}>
      <Ionicons name={icon} size={15} color={Colors.primary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, mono && { fontFamily: 'monospace', fontSize: FontSizes.xs }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function StatMini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statMini, { borderColor: color + '44' }]}>
      <Text style={[styles.statMiniValue, { color }]}>{value}</Text>
      <Text style={styles.statMiniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bgDark },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 64,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    overflow: 'hidden',
  },
  headerDecorLeft: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primaryDark,
    opacity: 0.5,
  },
  headerDecorRight: {
    position: 'absolute',
    bottom: -30,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.primaryDark,
    opacity: 0.4,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: FontSizes.xxl, fontWeight: '900', color: Colors.textPrimary },
  subtitle: { fontSize: FontSizes.xs, color: Colors.white60, marginTop: 2 },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.charcoal,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  radiusLabel: { fontSize: FontSizes.xs, color: Colors.textMuted, fontWeight: '600' },
  radiusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  radiusBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  radiusBtnText: { fontSize: FontSizes.xs, color: Colors.midGray, fontWeight: '600' },
  radiusBtnTextActive: { color: Colors.textPrimary },
  list: { padding: Spacing.md, paddingBottom: 32 },
  countText: { fontSize: FontSizes.xs, color: Colors.textMuted, marginBottom: Spacing.sm, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.textMuted, marginTop: Spacing.md, fontSize: FontSizes.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { color: Colors.textMuted, marginTop: Spacing.md, textAlign: 'center', fontSize: FontSizes.sm },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.charcoal,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  detailTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.textPrimary },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  typeBadgeText: { fontSize: FontSizes.xs, fontWeight: '700' },
  detailCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    margin: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowItem: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  rowLabel: { fontSize: FontSizes.xs, color: Colors.textMuted, marginBottom: 2 },
  rowValue: { fontSize: FontSizes.sm, color: Colors.textPrimary, fontWeight: '500' },
  gallerySection: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  galleryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  galleryTitle: { fontSize: FontSizes.sm, color: Colors.textPrimary, fontWeight: '700' },
  galleryCount: { fontSize: FontSizes.xs, color: Colors.gold, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  statMini: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  statMiniValue: { fontSize: FontSizes.xl, fontWeight: '800' },
  statMiniLabel: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },
  personsTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.textPrimary, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  personBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personBadgeText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textPrimary },
  personInfo: { fontSize: FontSizes.sm, color: Colors.textPrimary, fontWeight: '500' },
  voterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  voterTagText: { fontSize: FontSizes.xs, fontWeight: '600' },
  noPerson: { textAlign: 'center', color: Colors.textMuted, padding: Spacing.xl },
  // ── Detail action buttons (edit / delete in header) ──
  detailActionBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgCard,
  },
  // ── Inline edit form ──
  editCard: {
    backgroundColor: Colors.bgCard,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '55',
  },
  editTitle: {
    fontSize: FontSizes.md,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  editLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  editTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCardRaised,
  },
  editTypeBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  editTypeBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.midGray,
  },
  editInput: {
    backgroundColor: Colors.bgCardRaised,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: Spacing.sm,
  },
  // ── Person edit form ──
  editPersonForm: {
    width: '100%',
  },
  editPersonLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  editPersonInput: {
    backgroundColor: Colors.bgCardRaised,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  editPersonHint: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },
  genderSelectBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCardRaised,
  },
  genderSelectBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  genderSelectText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  genderSelectTextActive: {
    color: Colors.textPrimary,
  },
  addPersonMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryMuted,
  },
  addPersonMiniBtnText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '700',
  },
});