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
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
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

function blankPerson(): PersonForm {
  return { age: '', gender: null, is_voter: false };
}

export default function CollectScreen() {
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

  // Auto-get GPS on mount
  useEffect(() => {
    getLocation();
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
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      Alert.alert('Location Required', 'Please get GPS coordinates before submitting.');
      return;
    }
    if (houseType === 'APARTMENT' && !unitId.trim()) {
      Alert.alert('Unit Required', 'Please enter Unit ID for apartment households.');
      return;
    }

    setSubmitting(true);
    try {
      // Duplicate check first
      const check = await householdsApi.duplicateCheck(lat, lon, 20);
      if (check.has_duplicates) {
        Alert.alert(
          'Duplicate Detected',
          `${check.duplicates.length} similar household(s) found within 20m. Do you want to proceed?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setSubmitting(false) },
            { text: 'Proceed', style: 'destructive', onPress: () => doCreate(lat, lon) },
          ]
        );
        return;
      }
      await doCreate(lat, lon);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to submit.');
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
      Alert.alert('✅ Success', 'Household recorded successfully!', [
        { text: 'Add Another', onPress: resetForm },
        { text: 'Done' },
      ]);
    } catch (err: any) {
      Alert.alert('Submit Failed', err.message ?? 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setAddressText('');
    setLandmark('');
    setHouseType('INDIVIDUAL');
    setUnitId('');
    setPersons([blankPerson()]);
    getLocation();
  }

  const voterCount = persons.filter(p => p.is_voter).length;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Collect Household</Text>
          <Text style={styles.pageSub}>Record voter data at this location</Text>
        </View>

        {/* GPS Card */}
        <View style={[styles.card, gpsAcquired && styles.cardSuccess]}>
          <View style={styles.cardRow}>
            <View style={styles.cardIconWrap}>
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
                <Text style={styles.gpsError}>Not acquired</Text>
              )}
            </View>
            <Pressable onPress={getLocation} style={styles.refreshBtn} disabled={gpsLoading}>
              <Ionicons name="refresh" size={18} color={Colors.primary} />
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
            title={submitting ? 'Submitting…' : `Submit Household (${voterCount} voters)`}
            onPress={handleSubmit}
            loading={submitting}
            fullWidth
            size="lg"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bgDark },
  scroll: { flex: 1 },
  container: { paddingBottom: 48 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  pageHeader: {
    backgroundColor: Colors.primary,
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.textPrimary },
  pageSub: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  card: {
    backgroundColor: Colors.bgCard,
    margin: Spacing.md,
    marginBottom: 0,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardSuccess: { borderColor: Colors.success + '66' },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.sm },
  cardIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: Colors.darkGray, alignItems: 'center', justifyContent: 'center',
  },
  cardLabel: { fontSize: FontSizes.xs, color: Colors.textMuted, marginBottom: 2, fontWeight: '600' },
  gpsLoading: { fontSize: FontSizes.sm, color: Colors.textMuted },
  gpsCoords: { fontSize: FontSizes.sm, color: Colors.success, fontFamily: 'monospace', fontWeight: '600' },
  gpsError: { fontSize: FontSizes.sm, color: Colors.error },
  refreshBtn: { padding: Spacing.sm },

  coordRow: { flexDirection: 'row', gap: Spacing.sm },
  coordField: { flex: 1 },
  coordLabel: { fontSize: FontSizes.xs, color: Colors.textMuted, marginBottom: 4 },
  coordInput: {
    backgroundColor: Colors.darkGray,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  sectionLabel: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  fieldLabel: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.textMuted, marginBottom: 6, letterSpacing: 0.3 },
  fieldGroup: { marginBottom: Spacing.md },

  textInput: {
    backgroundColor: Colors.darkGray,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  multiline: { minHeight: 60, textAlignVertical: 'top' },

  toggleRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.darkGray,
  },
  toggleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleText: { fontSize: FontSizes.sm, color: Colors.midGray, fontWeight: '600' },
  toggleTextActive: { color: Colors.textPrimary },

  personsHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.md,
  },
  personsCount: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  addPersonBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.primary,
  },
  addPersonText: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: '600' },

  personCard: {
    backgroundColor: Colors.darkGray, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  personHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md,
  },
  personNumBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  personNum: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textPrimary },
  personTitle: { flex: 1, fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary },
  personRow: { flexDirection: 'row', alignItems: 'flex-start' },

  genderRow: { flexDirection: 'row', gap: 6 },
  genderBtn: {
    width: 40, height: 36, alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  genderBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  genderText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.midGray },
  genderTextActive: { color: Colors.textPrimary },

  voterRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  voterSub: { fontSize: FontSizes.xs, color: Colors.textMuted },

  submitWrap: { padding: Spacing.xl, paddingTop: Spacing.lg },
});