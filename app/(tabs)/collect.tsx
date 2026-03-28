import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors, FontSizes, Radius, Shadows, Spacing } from '@/constants/theme';
import { ThemedButton } from '@/components/ThemedButton';
import { householdsApi } from '@/lib/api';
import { GenderType, HouseType, Person } from '@/lib/types';

const HOUSE_TYPES: HouseType[] = ['INDIVIDUAL', 'APARTMENT'];
const GENDERS: GenderType[] = ['MALE', 'FEMALE', 'OTHER'];

interface PersonForm {
  age: string;
  gender: GenderType | null;
  is_voter: boolean;
}

type BannerType = 'success' | 'error' | 'warning' | 'info' | null;

interface Banner {
  type: BannerType;
  message: string;
}

function blankPerson(): PersonForm {
  return { age: '', gender: null, is_voter: false };
}

export default function CollectScreen() {
  const scrollRef = useRef<ScrollView>(null);

  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsAcquired, setGpsAcquired] = useState(false);

  const [addressText, setAddressText] = useState('');
  const [landmark, setLandmark] = useState('');
  const [houseType, setHouseType] = useState<HouseType>('INDIVIDUAL');
  const [unitId, setUnitId] = useState('');

  const [persons, setPersons] = useState<PersonForm[]>([blankPerson()]);
  const [submitting, setSubmitting] = useState(false);

  // Inline banner instead of just Alerts
  const [banner, setBanner] = useState<Banner>({ type: null, message: '' });
  const bannerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showBanner(type: Exclude<BannerType, null>, message: string, autoDismissMs = 4000) {
    if (bannerTimeout.current) clearTimeout(bannerTimeout.current);
    setBanner({ type, message });
    if (autoDismissMs > 0) {
      bannerTimeout.current = setTimeout(() => setBanner({ type: null, message: '' }), autoDismissMs);
    }
  }

  function hideBanner() {
    if (bannerTimeout.current) clearTimeout(bannerTimeout.current);
    setBanner({ type: null, message: '' });
  }

  // Auto-get GPS on mount
  useEffect(() => {
    getLocation();
    return () => {
      if (bannerTimeout.current) clearTimeout(bannerTimeout.current);
    };
  }, []);

  async function getLocation() {
    setGpsLoading(true);
    setGpsAcquired(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is needed for GPS coordinates.');
        setGpsLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatitude(loc.coords.latitude.toFixed(7));
      setLongitude(loc.coords.longitude.toFixed(7));
      setGpsAcquired(true);
    } catch {
      Alert.alert('GPS Error', 'Could not get location. Please retry or enter manually.');
    } finally {
      setGpsLoading(false);
    }
  }

  function addPerson() {
    if (persons.length >= 20) return;
    setPersons(prev => [...prev, blankPerson()]);
  }

  function removePerson(idx: number) {
    setPersons(prev => prev.filter((_, i) => i !== idx));
  }

  function updatePerson(idx: number, field: keyof PersonForm, value: any) {
    setPersons(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }

  async function handleSubmit() {
    hideBanner();
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      showBanner('error', 'Please get GPS coordinates before submitting.');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    if (houseType === 'APARTMENT' && !unitId.trim()) {
      showBanner('error', 'Please enter Unit ID for apartment households.');
      return;
    }

    setSubmitting(true);
    try {
      // Duplicate check first
      const check = await householdsApi.duplicateCheck(lat, lon, 20);
      if (check.has_duplicates) {
        // Stop submitting while user decides — they can still cancel
        setSubmitting(false);
        Alert.alert(
          '⚠️ Duplicate Detected',
          `${check.duplicates.length} similar household(s) found within 20m.\n\nDo you want to proceed anyway?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => {
              showBanner('info', `${check.duplicates.length} duplicate(s) found nearby. Submission cancelled.`);
            }},
            { text: 'Proceed', style: 'destructive', onPress: () => {
              setSubmitting(true);
              doCreate(lat, lon);
            }},
          ]
        );
        return;
      }
      await doCreate(lat, lon);
    } catch (err: any) {
      showBanner('error', err.message ?? 'Failed to submit. Please try again.');
      setSubmitting(false);
    }
  }

  async function doCreate(lat: number, lon: number) {
    try {
      await householdsApi.create({
        latitude: lat,
        longitude: lon,
        address_text: addressText.trim() || undefined,
        landmark_description: landmark.trim() || undefined,
        house_type: houseType,
        unit_id: houseType === 'APARTMENT' ? unitId.trim() : undefined,
        persons: persons.map(p => ({
          age: p.age ? parseInt(p.age) : null,
          gender: p.gender,
          is_voter: p.is_voter,
        })),
        image_urls: [],
      });

      // Always clear the form immediately after success (keepBanner=true so success banner stays visible)
      resetForm(true);

      // Show inline success banner (called after resetForm so hideBanner inside resetForm doesn't wipe it)
      showBanner('success', '✅ Household recorded successfully! Form cleared.', 6000);

      // Simple confirmation — form is already reset either way
      Alert.alert('✅ Submitted!', 'Household recorded successfully. Form has been cleared for the next entry.');
    } catch (err: any) {
      // Handle 409 Conflict (duplicate from server side)
      if (err.status === 409) {
        showBanner('warning', 'Duplicate household detected by server. Submission blocked.');
      } else {
        showBanner('error', err.message ?? 'Unknown error. Please retry.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm(keepBanner = false) {
    setAddressText('');
    setLandmark('');
    setHouseType('INDIVIDUAL');
    setUnitId('');
    setPersons([blankPerson()]);
    setGpsAcquired(false);
    setLatitude('');
    setLongitude('');
    if (!keepBanner) hideBanner();
    getLocation();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  const voterCount = persons.filter(p => p.is_voter).length;

  // Banner colors
  const bannerStyles: Record<Exclude<BannerType, null>, { bg: string; border: string; icon: any; color: string }> = {
    success: { bg: '#0D2318', border: Colors.success, icon: 'checkmark-circle', color: Colors.success },
    error:   { bg: '#200D0D', border: Colors.error,   icon: 'close-circle',     color: Colors.error   },
    warning: { bg: '#1A1400', border: Colors.warning,  icon: 'warning',          color: Colors.warning  },
    info:    { bg: '#0D1A2A', border: Colors.info,    icon: 'information-circle', color: Colors.info   },
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* Header */}
        <View style={styles.pageHeader}>
          <View style={styles.headerDecorLeft} />
          <View style={styles.headerDecorRight} />
          <View style={styles.headerContent}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="add-circle" size={28} color={Colors.textPrimary} />
            </View>
            <View>
              <Text style={styles.pageTitle}>Collect Household</Text>
              <Text style={styles.pageSub}>Record voter data at this location</Text>
            </View>
          </View>
          {/* Progress chip */}
          <View style={styles.progressChip}>
            <Ionicons name="people" size={12} color={Colors.gold} />
            <Text style={styles.progressChipText}>{persons.length} persons · {voterCount} voters</Text>
          </View>
        </View>

        {/* ── Inline Banner ── */}
        {banner.type && (
          <View style={[
            styles.banner,
            {
              backgroundColor: bannerStyles[banner.type].bg,
              borderColor: bannerStyles[banner.type].border,
            }
          ]}>
            <Ionicons
              name={bannerStyles[banner.type].icon}
              size={18}
              color={bannerStyles[banner.type].color}
            />
            <Text style={[styles.bannerText, { color: bannerStyles[banner.type].color }]}>
              {banner.message}
            </Text>
            <Pressable onPress={hideBanner} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={16} color={bannerStyles[banner.type].color} />
            </Pressable>
          </View>
        )}

        {/* GPS Card */}
        <View style={[styles.card, gpsAcquired ? styles.cardSuccess : styles.cardNeutral]}>
          <View style={styles.cardRow}>
            <View style={[
              styles.cardIconWrap,
              { backgroundColor: gpsAcquired ? Colors.successMuted : Colors.primaryMuted }
            ]}>
              <Ionicons name="navigate" size={20} color={gpsAcquired ? Colors.success : Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>GPS Location</Text>
              {gpsLoading ? (
                <View style={styles.row}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.gpsLoading}>Acquiring GPS…</Text>
                </View>
              ) : gpsAcquired ? (
                <Text style={styles.gpsCoords}>{latitude},  {longitude}</Text>
              ) : (
                <Text style={styles.gpsError}>Tap refresh to get location</Text>
              )}
            </View>
            <Pressable onPress={getLocation} style={styles.refreshBtn} disabled={gpsLoading}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="refresh" size={20} color={gpsLoading ? Colors.midGray : Colors.primary} />
            </Pressable>
          </View>

          {/* Manual override */}
          <View style={styles.coordRow}>
            <View style={styles.coordField}>
              <Text style={styles.coordLabel}>Latitude</Text>
              <TextInput
                style={styles.coordInput}
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="numeric"
                placeholder="13.0827"
                placeholderTextColor={Colors.midGray}
              />
            </View>
            <View style={styles.coordField}>
              <Text style={styles.coordLabel}>Longitude</Text>
              <TextInput
                style={styles.coordInput}
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="numeric"
                placeholder="80.2707"
                placeholderTextColor={Colors.midGray}
              />
            </View>
          </View>
        </View>

        {/* House Details */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>House Details</Text>

          {/* House Type Toggle */}
          <Text style={styles.fieldLabel}>House Type</Text>
          <View style={styles.toggleRow}>
            {HOUSE_TYPES.map(type => (
              <Pressable
                key={type}
                onPress={() => setHouseType(type)}
                style={[styles.toggleBtn, houseType === type && styles.toggleBtnActive]}
              >
                <Ionicons
                  name={type === 'APARTMENT' ? 'business-outline' : 'home-outline'}
                  size={16}
                  color={houseType === type ? Colors.textPrimary : Colors.midGray}
                />
                <Text style={[styles.toggleText, houseType === type && styles.toggleTextActive]}>
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>

          {houseType === 'APARTMENT' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Unit ID</Text>
              <TextInput
                style={styles.textInput}
                value={unitId}
                onChangeText={setUnitId}
                placeholder="Enter Unit UUID"
                placeholderTextColor={Colors.midGray}
              />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput
              style={[styles.textInput, styles.multiline]}
              value={addressText}
              onChangeText={setAddressText}
              placeholder="House number, street, area…"
              placeholderTextColor={Colors.midGray}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Landmark / Description</Text>
            <TextInput
              style={styles.textInput}
              value={landmark}
              onChangeText={setLandmark}
              placeholder="Near the school, opposite temple…"
              placeholderTextColor={Colors.midGray}
            />
          </View>
        </View>

        {/* Persons */}
        <View style={styles.card}>
          <View style={styles.personsHeader}>
            <View>
              <Text style={styles.sectionLabel}>Persons</Text>
              <Text style={styles.personsCount}>
                {persons.length} person{persons.length !== 1 ? 's' : ''} · {voterCount} voter{voterCount !== 1 ? 's' : ''}
              </Text>
            </View>
            <Pressable onPress={addPerson} style={styles.addPersonBtn}>
              <Ionicons name="person-add-outline" size={16} color={Colors.primary} />
              <Text style={styles.addPersonText}>Add</Text>
            </Pressable>
          </View>

          {persons.map((person, idx) => (
            <View key={idx} style={styles.personCard}>
              <View style={styles.personHeader}>
                <View style={styles.personNumBadge}>
                  <Text style={styles.personNum}>{idx + 1}</Text>
                </View>
                <Text style={styles.personTitle}>Person {idx + 1}</Text>
                {persons.length > 1 && (
                  <Pressable onPress={() => removePerson(idx)}>
                    <Ionicons name="close-circle" size={20} color={Colors.error} />
                  </Pressable>
                )}
              </View>

              <View style={styles.personRow}>
                <View style={[styles.fieldGroup, { flex: 1, marginRight: Spacing.sm }]}>
                  <Text style={styles.fieldLabel}>Age</Text>
                  <TextInput
                    style={styles.textInput}
                    value={person.age}
                    onChangeText={v => updatePerson(idx, 'age', v)}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={Colors.midGray}
                    maxLength={3}
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 2 }]}>
                  <Text style={styles.fieldLabel}>Gender</Text>
                  <View style={styles.genderRow}>
                    {GENDERS.map(g => (
                      <Pressable
                        key={g}
                        onPress={() => updatePerson(idx, 'gender', g)}
                        style={[styles.genderBtn, person.gender === g && styles.genderBtnActive]}
                      >
                        <Text style={[styles.genderText, person.gender === g && styles.genderTextActive]}>
                          {g[0]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.voterRow}>
                <View>
                  <Text style={styles.fieldLabel}>Voter</Text>
                  <Text style={styles.voterSub}>Registered voter?</Text>
                </View>
                <Switch
                  value={person.is_voter}
                  onValueChange={v => updatePerson(idx, 'is_voter', v)}
                  trackColor={{ false: Colors.border, true: Colors.primaryDark }}
                  thumbColor={person.is_voter ? Colors.primary : Colors.midGray}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Submit */}
        <View style={styles.submitWrap}>
          <ThemedButton
            title={submitting ? 'Submitting…' : 'Submit Household'}
            onPress={handleSubmit}
            loading={submitting}
            fullWidth
            size="lg"
            icon={!submitting ? <Ionicons name="cloud-upload" size={18} color={Colors.textPrimary} /> : undefined}
            style={Shadows.button}
          />
          <Text style={styles.submitHint}>
            {voterCount} voter{voterCount !== 1 ? 's' : ''} in {persons.length} person{persons.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bgDark },
  scroll: { flex: 1 },
  container: { paddingBottom: 56 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // ── Inline Banner ──────────────────────────────────────────────────────────
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1.5,
  },
  bannerText: { flex: 1, fontSize: FontSizes.sm, fontWeight: '600', lineHeight: 18 },

  // ── Header ────────────────────────────────────────────────────────────────
  pageHeader: {
    backgroundColor: Colors.primary,
    paddingTop: 64,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
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
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  headerIconWrap: {
    width: 48, height: 48, borderRadius: Radius.md,
    backgroundColor: Colors.white10,
    alignItems: 'center', justifyContent: 'center',
  },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: '900', color: Colors.textPrimary },
  pageSub: { fontSize: FontSizes.xs, color: Colors.white60, marginTop: 2 },
  progressChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.white10,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full, alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  progressChipText: { fontSize: FontSizes.xs, color: Colors.gold, fontWeight: '700' },

  // ── Cards ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.bgCard,
    margin: Spacing.md,
    marginBottom: 0,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  cardSuccess: { borderColor: Colors.success + '66', backgroundColor: Colors.successMuted + '22' },
  cardNeutral: { borderColor: Colors.border },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.sm },
  cardIconWrap: {
    width: 44, height: 44, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  cardLabel: { fontSize: FontSizes.xs, color: Colors.textMuted, marginBottom: 2, fontWeight: '700', letterSpacing: 0.4 },
  gpsLoading: { fontSize: FontSizes.sm, color: Colors.textMuted },
  gpsCoords: { fontSize: FontSizes.sm, color: Colors.success, fontWeight: '700' },
  gpsError: { fontSize: FontSizes.sm, color: Colors.error },
  refreshBtn: { padding: Spacing.sm, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },

  coordRow: { flexDirection: 'row', gap: Spacing.sm },
  coordField: { flex: 1 },
  coordLabel: { fontSize: FontSizes.xs, color: Colors.textMuted, marginBottom: 4, fontWeight: '600' },
  coordInput: {
    backgroundColor: Colors.bgCardRaised,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  sectionLabel: {
    fontSize: FontSizes.md, fontWeight: '800', color: Colors.textPrimary,
    marginBottom: Spacing.md, letterSpacing: 0.2,
  },
  fieldLabel: {
    fontSize: FontSizes.xs, fontWeight: '700',
    color: Colors.textMuted, marginBottom: 6, letterSpacing: 0.4,
  },
  fieldGroup: { marginBottom: Spacing.md },

  textInput: {
    backgroundColor: Colors.bgCardRaised,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 48,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },

  toggleRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.bgCardRaised,
    minHeight: 48,
  },
  toggleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleText: { fontSize: FontSizes.sm, color: Colors.midGray, fontWeight: '700' },
  toggleTextActive: { color: Colors.textPrimary },

  personsHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.md,
  },
  personsCount: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  addPersonBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
    minHeight: 44,
  },
  addPersonText: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: '700' },

  personCard: {
    backgroundColor: Colors.bgCardRaised, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.borderLight,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  personHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.md,
  },
  personNumBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    ...Shadows.button,
  },
  personNum: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.textPrimary },
  personTitle: { flex: 1, fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary },
  personRow: { flexDirection: 'row', alignItems: 'flex-start' },

  genderRow: { flexDirection: 'row', gap: 6 },
  genderBtn: {
    flex: 1, height: 44, alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.sm, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  genderBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  genderText: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.midGray },
  genderTextActive: { color: Colors.textPrimary },

  voterRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.sm,
  },
  voterSub: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },

  submitWrap: { padding: Spacing.xl, paddingTop: Spacing.lg },
  submitHint: {
    textAlign: 'center', fontSize: FontSizes.xs,
    color: Colors.textMuted, marginTop: Spacing.sm,
  },
});