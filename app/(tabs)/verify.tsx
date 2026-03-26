import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import * as Location from 'expo-location';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ThemedButton } from '@/components/ThemedButton';
import { householdsApi, verificationApi } from '@/lib/api';
import { HouseholdBrief, VerificationStatus } from '@/lib/types';

export default function VerifyScreen() {
  // Step 1: find by GPS
  const [step, setStep] = useState<'search' | 'pick' | 'verify' | 'done'>('search');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [nearbyHouseholds, setNearbyHouseholds] = useState<HouseholdBrief[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<HouseholdBrief | null>(null);

  // Step 2: verify
  const [verifyStatus, setVerifyStatus] = useState<VerificationStatus>('MATCHED');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function searchNearby() {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission required.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const results = await householdsApi.nearby(loc.coords.latitude, loc.coords.longitude, 200, 20);
      setNearbyHouseholds(results);
      setStep('pick');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not get location.');
    } finally {
      setGpsLoading(false);
    }
  }

  function pickHousehold(h: HouseholdBrief) {
    setSelectedHousehold(h);
    setStep('verify');
  }

  async function submitVerification() {
    if (!selectedHousehold) return;
    setSubmitting(true);
    try {
      await verificationApi.submit({
        household_id: selectedHousehold.id,
        status: verifyStatus,
        notes: notes.trim() || undefined,
      });
      setStep('done');
    } catch (err: any) {
      Alert.alert('Failed', err.message ?? 'Submission error.');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setStep('search');
    setNearbyHouseholds([]);
    setSelectedHousehold(null);
    setVerifyStatus('MATCHED');
    setNotes('');
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Verify Household</Text>
          <Text style={styles.subtitle}>Confirm collected data at a location</Text>
        </View>

        {/* Step indicators */}
        <View style={styles.steps}>
          {['Search', 'Select', 'Verify'].map((label, i) => {
            const stepIdx = ['search', 'pick', 'verify'].indexOf(step);
            const done = i < stepIdx || step === 'done';
            const active = i === stepIdx && step !== 'done';
            return (
              <React.Fragment key={label}>
                <View style={styles.stepItem}>
                  <View style={[styles.stepCircle,
                    active && styles.stepCircleActive,
                    done && styles.stepCircleDone,
                  ]}>
                    {done ? (
                      <Ionicons name="checkmark" size={14} color={Colors.textPrimary} />
                    ) : (
                      <Text style={[styles.stepNum, active && styles.stepNumActive]}>{i + 1}</Text>
                    )}
                  </View>
                  <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
                </View>
                {i < 2 && <View style={[styles.stepLine, done && styles.stepLineDone]} />}
              </React.Fragment>
            );
          })}
        </View>

        {/* STEP 1: Search */}
        {step === 'search' && (
          <View style={styles.card}>
            <View style={styles.iconBlock}>
              <Ionicons name="search-circle" size={56} color={Colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Find Nearby Household</Text>
            <Text style={styles.cardDesc}>
              We'll use your current GPS location to find households within 200 metres.
            </Text>
            <ThemedButton
              title={gpsLoading ? 'Locating…' : 'Find Nearby Households'}
              onPress={searchNearby}
              loading={gpsLoading}
              fullWidth
              size="lg"
              style={{ marginTop: Spacing.md }}
            />
          </View>
        )}

        {/* STEP 2: Pick */}
        {step === 'pick' && (
          <View style={styles.card}>
            <View style={styles.pickHeader}>
              <Text style={styles.cardTitle}>Select Household</Text>
              <Pressable onPress={() => setStep('search')}>
                <Text style={styles.changeBtn}>← Back</Text>
              </Pressable>
            </View>

            {nearbyHouseholds.length === 0 ? (
              <View style={styles.emptyPick}>
                <Ionicons name="home-outline" size={36} color={Colors.border} />
                <Text style={styles.emptyPickText}>No households found within 200m</Text>
                <ThemedButton title="Search Again" onPress={searchNearby} variant="outline" size="sm" style={{ marginTop: 12 }} />
              </View>
            ) : (
              nearbyHouseholds.map(h => (
                <Pressable
                  key={h.id}
                  onPress={() => pickHousehold(h)}
                  style={({ pressed }) => [styles.pickItem, pressed && { opacity: 0.8 }]}
                >
                  <View style={styles.pickLeft}>
                    <Ionicons
                      name={h.house_type === 'APARTMENT' ? 'business-outline' : 'home-outline'}
                      size={18}
                      color={Colors.primary}
                    />
                    <View>
                      <Text style={styles.pickAddress} numberOfLines={1}>
                        {h.address_text ?? 'No address'}
                      </Text>
                      <Text style={styles.pickDist}>
                        {h.distance_metres != null
                          ? `${Math.round(h.distance_metres)}m away`
                          : h.house_type}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.midGray} />
                </Pressable>
              ))
            )}
          </View>
        )}

        {/* STEP 3: Verify */}
        {step === 'verify' && selectedHousehold && (
          <View style={styles.card}>
            <View style={styles.pickHeader}>
              <Text style={styles.cardTitle}>Submit Verification</Text>
              <Pressable onPress={() => setStep('pick')}>
                <Text style={styles.changeBtn}>← Change</Text>
              </Pressable>
            </View>

            {/* Selected household summary */}
            <View style={styles.selectedCard}>
              <Ionicons name="home" size={16} color={Colors.primary} />
              <Text style={styles.selectedText} numberOfLines={2}>
                {selectedHousehold.address_text ?? `${selectedHousehold.latitude.toFixed(5)}, ${selectedHousehold.longitude.toFixed(5)}`}
              </Text>
            </View>

            {/* Status toggle */}
            <Text style={styles.fieldLabel}>Verification Status</Text>
            <View style={styles.statusRow}>
              <Pressable
                onPress={() => setVerifyStatus('MATCHED')}
                style={[styles.statusBtn, verifyStatus === 'MATCHED' && styles.statusBtnMatched]}
              >
                <Ionicons name="checkmark-circle" size={22} color={verifyStatus === 'MATCHED' ? Colors.success : Colors.midGray} />
                <Text style={[styles.statusBtnText, verifyStatus === 'MATCHED' && { color: Colors.success }]}>
                  MATCHED
                </Text>
                <Text style={styles.statusBtnSub}>Data is accurate</Text>
              </Pressable>
              <Pressable
                onPress={() => setVerifyStatus('MISMATCH')}
                style={[styles.statusBtn, verifyStatus === 'MISMATCH' && styles.statusBtnMismatch]}
              >
                <Ionicons name="close-circle" size={22} color={verifyStatus === 'MISMATCH' ? Colors.error : Colors.midGray} />
                <Text style={[styles.statusBtnText, verifyStatus === 'MISMATCH' && { color: Colors.error }]}>
                  MISMATCH
                </Text>
                <Text style={styles.statusBtnSub}>Data differs</Text>
              </Pressable>
            </View>

            {/* Notes */}
            <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>Notes (optional)</Text>
            <TextInput
              style={[styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any observations, discrepancies…"
              placeholderTextColor={Colors.midGray}
              multiline
              numberOfLines={3}
              maxLength={1000}
            />

            <ThemedButton
              title="Submit Verification"
              onPress={submitVerification}
              loading={submitting}
              fullWidth
              size="lg"
              style={{ marginTop: Spacing.lg }}
            />
          </View>
        )}

        {/* DONE */}
        {step === 'done' && (
          <View style={styles.card}>
            <View style={styles.doneIcon}>
              <Ionicons
                name={verifyStatus === 'MATCHED' ? 'checkmark-circle' : 'alert-circle'}
                size={64}
                color={verifyStatus === 'MATCHED' ? Colors.success : Colors.error}
              />
            </View>
            <Text style={styles.doneTitle}>
              {verifyStatus === 'MATCHED' ? 'Verified as Matched!' : 'Mismatch Recorded'}
            </Text>
            <Text style={styles.doneDesc}>
              {verifyStatus === 'MATCHED'
                ? 'The household data has been confirmed accurate.'
                : 'A mismatch has been logged for review.'}
            </Text>
            <ThemedButton
              title="Verify Another"
              onPress={reset}
              fullWidth
              size="lg"
              style={{ marginTop: Spacing.xl }}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bgDark },
  scroll: { flex: 1 },
  container: { paddingBottom: 48 },

  header: {
    backgroundColor: Colors.primary,
    paddingTop: 60, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl,
  },
  title: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  // Steps
  steps: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.charcoal, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.darkGray, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepCircleActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '22' },
  stepCircleDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  stepNum: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.midGray },
  stepNumActive: { color: Colors.primary },
  stepLabel: { fontSize: 10, color: Colors.midGray, fontWeight: '600' },
  stepLabelActive: { color: Colors.primary },
  stepLine: { flex: 1, height: 1.5, backgroundColor: Colors.border, marginBottom: 14, marginHorizontal: 6 },
  stepLineDone: { backgroundColor: Colors.success },

  card: {
    backgroundColor: Colors.bgCard, margin: Spacing.md, marginTop: Spacing.lg,
    borderRadius: Radius.lg, padding: Spacing.xl,
    borderWidth: 1, borderColor: Colors.border,
  },
  iconBlock: { alignItems: 'center', marginBottom: Spacing.md },
  cardTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  cardDesc: { fontSize: FontSizes.sm, color: Colors.textMuted, lineHeight: 20 },

  pickHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  changeBtn: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: '600' },
  pickItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.darkGray, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  pickLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pickAddress: { fontSize: FontSizes.sm, color: Colors.textPrimary, fontWeight: '500', maxWidth: 220 },
  pickDist: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  emptyPick: { alignItems: 'center', paddingVertical: Spacing.xl },
  emptyPickText: { color: Colors.textMuted, marginTop: Spacing.sm, textAlign: 'center' },

  selectedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.darkGray, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: Colors.primary + '44',
  },
  selectedText: { flex: 1, fontSize: FontSizes.sm, color: Colors.textPrimary },

  fieldLabel: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.textMuted, marginBottom: 8, letterSpacing: 0.3 },
  statusRow: { flexDirection: 'row', gap: Spacing.sm },
  statusBtn: {
    flex: 1, alignItems: 'center', padding: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.darkGray, gap: 4,
  },
  statusBtnMatched: { borderColor: Colors.success, backgroundColor: '#0D2018' },
  statusBtnMismatch: { borderColor: Colors.error, backgroundColor: '#200D0D' },
  statusBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.midGray },
  statusBtnSub: { fontSize: FontSizes.xs, color: Colors.textMuted, textAlign: 'center' },

  notesInput: {
    backgroundColor: Colors.darkGray, borderRadius: Radius.sm,
    padding: Spacing.md, fontSize: FontSizes.md, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border,
    textAlignVertical: 'top', minHeight: 80,
  },

  doneIcon: { alignItems: 'center', marginBottom: Spacing.md },
  doneTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  doneDesc: { fontSize: FontSizes.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
});