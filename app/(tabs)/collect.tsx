import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import HeaderLanguageSwitcher from '@/components/HeaderLanguageSwitcher';
import { LandmarkImageGallery } from '@/components/LandmarkImageGallery';
import { ThemedButton } from '@/components/ThemedButton';
import { Colors, FontSizes, Radius, Shadows, Spacing } from '@/constants/theme';
import { householdsApi } from '@/lib/api';
import { GenderType, HouseType, UploadableImage } from '@/lib/types';

const HOUSE_TYPES: HouseType[] = ['INDIVIDUAL', 'APARTMENT'];
const GENDERS: GenderType[] = ['MALE', 'FEMALE', 'OTHER'];
const MAX_LANDMARK_IMAGES = 5;

type BannerType = 'success' | 'error' | 'warning' | 'info' | null;

interface PersonForm {
  name: string;
  age: string;
  gender: GenderType | null;
  is_voter: boolean;
}

interface Banner {
  type: BannerType;
  message: string;
}

function blankPerson(): PersonForm {
  return { name: '', age: '', gender: null, is_voter: false };
}

function createUploadableImage(asset: ImagePicker.ImagePickerAsset): UploadableImage {
  const rawExtension =
    asset.fileName?.split('.').pop() ??
    asset.uri.split('.').pop()?.split('?')[0] ??
    'jpg';
  const extension = rawExtension.toLowerCase();
  const normalizedExtension = extension === 'jpg' ? 'jpeg' : extension;

  return {
    uri: asset.uri,
    name:
      asset.fileName ??
      `landmark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`,
    type: asset.mimeType ?? `image/${normalizedExtension}`,
  };
}

export default function CollectScreen() {
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);

  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsAcquired, setGpsAcquired] = useState(false);

  const [addressText, setAddressText] = useState('');
  const [houseType, setHouseType] = useState<HouseType>('INDIVIDUAL');
  const [unitId, setUnitId] = useState('');
  const [landmarkImages, setLandmarkImages] = useState<UploadableImage[]>([]);

  const [persons, setPersons] = useState<PersonForm[]>([blankPerson()]);
  const [submitting, setSubmitting] = useState(false);

  const [banner, setBanner] = useState<Banner>({ type: null, message: '' });
  const bannerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showBanner(
    type: Exclude<BannerType, null>,
    message: string,
    autoDismissMs = 4000,
  ) {
    if (bannerTimeout.current) clearTimeout(bannerTimeout.current);
    setBanner({ type, message });
    if (autoDismissMs > 0) {
      bannerTimeout.current = setTimeout(
        () => setBanner({ type: null, message: '' }),
        autoDismissMs,
      );
    }
  }

  function hideBanner() {
    if (bannerTimeout.current) clearTimeout(bannerTimeout.current);
    setBanner({ type: null, message: '' });
  }

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
        Alert.alert(
          t('Location permission denied'),
          t('Location permission is needed for GPS coordinates.'),
        );
        return;
      }
      
      // Implement timeout with Promise.race
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('GPS timeout')), 10000)
      );
      
      const loc = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }),
        timeoutPromise
      ]) as Awaited<ReturnType<typeof Location.getCurrentPositionAsync>>;
      
      // Validate GPS accuracy (horizontal accuracy should be < 50 meters for good accuracy)
      const horizontalAccuracy = loc.coords.accuracy ?? 999;
      if (horizontalAccuracy > 50) {
        showBanner(
          'warning',
          t('GPS accuracy is low ({{accuracy}}m). Try in an open area.', { accuracy: Math.round(horizontalAccuracy) }),
          5000
        );
      }
      
      setLatitude(loc.coords.latitude.toFixed(7));
      setLongitude(loc.coords.longitude.toFixed(7));
      setGpsAcquired(true);
      showBanner('success', t('GPS coordinates acquired (Accuracy: {{acc}}m)', { acc: Math.round(horizontalAccuracy) }), 2000);
    } catch (error: any) {
      const errorMsg = error?.message?.includes('timeout') 
        ? t('GPS timeout. Ensure location is enabled and you are near a clear sky.')
        : t('Could not get location. Please retry or enter it manually.');
      showBanner('error', errorMsg, 5000);
    } finally {
      setGpsLoading(false);
    }
  }

  function addPerson() {
    if (persons.length >= 20) return;
    setPersons((prev) => [...prev, blankPerson()]);
  }

  function removePerson(idx: number) {
    setPersons((prev) => prev.filter((_, index) => index !== idx));
  }

  function updatePerson<T extends keyof PersonForm>(
    idx: number,
    field: T,
    value: PersonForm[T],
  ) {
    setPersons((prev) =>
      prev.map((person, index) =>
        index === idx ? { ...person, [field]: value } : person,
      ),
    );
  }

  function handleAgeChange(idx: number, ageValue: string) {
    updatePerson(idx, 'age', ageValue);
    const ageNum = parseInt(ageValue, 10);
    if (!isNaN(ageNum)) {
      const isEligible = ageNum >= 18;
      updatePerson(idx, 'is_voter', isEligible);
    } else {
      updatePerson(idx, 'is_voter', false);
    }
  }

  function addSelectedImages(assets: ImagePicker.ImagePickerAsset[]) {
    const remainingSlots = MAX_LANDMARK_IMAGES - landmarkImages.length;
    if (remainingSlots <= 0) {
      showBanner('warning', t('Only 5 landmark images can be uploaded.'));
      return;
    }

    const selected = assets.slice(0, remainingSlots).map(createUploadableImage);
    if (selected.length === 0) return;

    setLandmarkImages((prev) => [...prev, ...selected]);

    if (assets.length > remainingSlots) {
      showBanner('warning', t('Only the first 5 landmark images were kept.'));
    } else {
      showBanner('info', t(selected.length === 1 ? '{{count}} landmark image added.' : '{{count}} landmark images added.', { count: selected.length }), 2000);
    }
  }

  async function openCamera() {
    if (landmarkImages.length >= MAX_LANDMARK_IMAGES) {
      showBanner('warning', t('Only 5 landmark images can be uploaded.'));
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t('Camera permission needed'),
        t('Allow camera access to capture landmark images.'),
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      addSelectedImages(result.assets);
    }
  }

  async function openGallery() {
    if (landmarkImages.length >= MAX_LANDMARK_IMAGES) {
      showBanner('warning', t('Only 5 landmark images can be uploaded.'));
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t('Photos permission needed'),
        t('Allow photo library access to choose landmark images.'),
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_LANDMARK_IMAGES - landmarkImages.length,
      quality: 0.7,
    });

    if (!result.canceled) {
      addSelectedImages(result.assets);
    }
  }

  function removeLandmarkImage(index: number) {
    setLandmarkImages((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSubmit() {
    hideBanner();
    const lat = Number.parseFloat(latitude);
    const lon = Number.parseFloat(longitude);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      showBanner('error', t('Please get GPS coordinates before submitting.'));
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    if (houseType === 'APARTMENT' && !unitId.trim()) {
      showBanner('error', t('Please enter Unit ID for apartment households.'));
      return;
    }
    if (landmarkImages.length === 0) {
      showBanner('error', t('Add at least one landmark image before submitting.'));
      return;
    }

    setSubmitting(true);
    await doCreate(lat, lon);
  }

  async function doCreate(lat: number, lon: number) {
    try {
      await householdsApi.create(
        {
          latitude: lat,
          longitude: lon,
          address_text: addressText.trim() || undefined,
          house_type: houseType,
          unit_id: houseType === 'APARTMENT' ? unitId.trim() : undefined,
          persons: persons.map((person) => ({
            name: person.name.trim() || null,
            age: person.age ? Number.parseInt(person.age, 10) : null,
            gender: person.gender,
            is_voter: person.is_voter,
          })),
        },
        landmarkImages,
      );

      resetForm(true);
      showBanner('success', t('Household recorded successfully. Form cleared.'), 6000);
      Alert.alert(t('Submitted'), t('Household recorded successfully.'));
    } catch (err: any) {
      if (err.status === 409) {
        showBanner('warning', t('Duplicate household detected by server. Submission blocked.'));
      } else {
        showBanner('error', err.message ?? t('Unknown error. Please retry.'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm(keepBanner = false) {
    setAddressText('');
    setHouseType('INDIVIDUAL');
    setUnitId('');
    setLandmarkImages([]);
    setPersons([blankPerson()]);
    setGpsAcquired(false);
    setLatitude('');
    setLongitude('');
    if (!keepBanner) hideBanner();
    void getLocation();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  const voterCount = persons.filter((person) => person.is_voter).length;

  const bannerStyles: Record<Exclude<BannerType, null>, { bg: string; border: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    success: { bg: '#0D2318', border: Colors.success, icon: 'checkmark-circle', color: Colors.success },
    error: { bg: '#200D0D', border: Colors.error, icon: 'close-circle', color: Colors.error },
    warning: { bg: '#1A1400', border: Colors.warning, icon: 'warning', color: Colors.warning },
    info: { bg: '#0D1A2A', border: Colors.info, icon: 'information-circle', color: Colors.info },
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
        <View style={styles.pageHeader}>
          <View style={styles.headerDecorLeft} />
          <View style={styles.headerDecorRight} />
          <View style={[styles.headerContent, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.headerIconWrap}>
                <Ionicons name="camera" size={28} color={Colors.textPrimary} />
              </View>
              <View>
                <Text style={styles.pageTitle}>{t('Collect Household')}</Text>
                <Text style={styles.pageSub}>{t('Record the location, persons, and landmark photos')}</Text>
              </View>
            </View>
            <HeaderLanguageSwitcher />
          </View>
          <View style={styles.progressChip}>
            <Ionicons name="images" size={12} color={Colors.gold} />
            <Text style={styles.progressChipText}>
              {landmarkImages.length}/{MAX_LANDMARK_IMAGES} {t('images')} - {persons.length} {t('Persons').toLowerCase()}
            </Text>
          </View>
        </View>

        {banner.type && (
          <View
            style={[
              styles.banner,
              {
                backgroundColor: bannerStyles[banner.type].bg,
                borderColor: bannerStyles[banner.type].border,
              },
            ]}
          >
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

        <View style={[styles.card, gpsAcquired ? styles.cardSuccess : styles.cardNeutral]}>
          <View style={styles.cardRow}>
            <View
              style={[
                styles.cardIconWrap,
                { backgroundColor: gpsAcquired ? Colors.successMuted : Colors.primaryMuted },
              ]}
            >
              <Ionicons name="navigate" size={20} color={gpsAcquired ? Colors.success : Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>{t('GPS Location')}</Text>
              {gpsLoading ? (
                <View style={styles.row}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.gpsLoading}>{t('Acquiring GPS...')}</Text>
                </View>
              ) : gpsAcquired ? (
                <Text style={styles.gpsCoords}>{latitude}, {longitude}</Text>
              ) : (
                <Text style={styles.gpsError}>{t('Tap refresh to get location')}</Text>
              )}
            </View>
            <Pressable
              onPress={() => void getLocation()}
              style={styles.refreshBtn}
              disabled={gpsLoading}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="refresh" size={20} color={gpsLoading ? Colors.midGray : Colors.primary} />
            </Pressable>
          </View>

          <View style={styles.coordRow}>
            <View style={styles.coordField}>
              <Text style={styles.coordLabel}>{t('Latitude')}</Text>
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
              <Text style={styles.coordLabel}>{t('Longitude')}</Text>
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

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{t('House Details')}</Text>

          <Text style={styles.fieldLabel}>{t('House Type')}</Text>
          <View style={styles.toggleRow}>
            {HOUSE_TYPES.map((type) => (
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
                  {t(type)}
                </Text>
              </Pressable>
            ))}
          </View>

          {houseType === 'APARTMENT' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('Unit ID')}</Text>
              <TextInput
                style={styles.textInput}
                value={unitId}
                onChangeText={setUnitId}
                placeholder={t('Enter Unit UUID')}
                placeholderTextColor={Colors.midGray}
              />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('Address')}</Text>
            <TextInput
              style={[styles.textInput, styles.multiline]}
              value={addressText}
              onChangeText={setAddressText}
              placeholder={t('House number, street, area...')}
              placeholderTextColor={Colors.midGray}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.sectionRow}>
              <View>
                <Text style={styles.fieldLabel}>{t('Landmark Images')}</Text>
                <Text style={styles.photoHint}>
                  {t('Capture or choose up to {{count}} photos for this household.', { count: MAX_LANDMARK_IMAGES })}
                </Text>
              </View>
              <View style={styles.photoMeta}>
                <Ionicons name="images-outline" size={14} color={Colors.gold} />
                <Text style={styles.photoMetaText}>{landmarkImages.length}/{MAX_LANDMARK_IMAGES}</Text>
              </View>
            </View>

            <View style={styles.photoActions}>
              <Pressable onPress={() => void openCamera()} style={styles.photoAction}>
                <Ionicons name="camera" size={18} color={Colors.primary} />
                <Text style={styles.photoActionText}>{t('Take Photo')}</Text>
              </Pressable>
              <Pressable onPress={() => void openGallery()} style={styles.photoAction}>
                <Ionicons name="images" size={18} color={Colors.primary} />
                <Text style={styles.photoActionText}>{t('Choose Photos')}</Text>
              </Pressable>
            </View>

            <LandmarkImageGallery
              images={landmarkImages.map((image) => ({ uri: image.uri }))}
              emptyText={t('No landmark images selected. Add at least one image before submitting.')}
              onRemove={removeLandmarkImage}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.personsHeader}>
            <View>
              <Text style={styles.sectionLabel}>{t('Persons')}</Text>
              <Text style={styles.personsCount}>
                {persons.length} {t(persons.length === 1 ? 'person' : 'persons')} - {voterCount} {t(voterCount === 1 ? 'voter' : 'voters')}
              </Text>
            </View>
            <Pressable onPress={addPerson} style={styles.addPersonBtn}>
              <Ionicons name="person-add-outline" size={16} color={Colors.primary} />
              <Text style={styles.addPersonText}>{t('Add')}</Text>
            </Pressable>
          </View>

          {persons.map((person, idx) => (
            <View key={idx} style={styles.personCard}>
              <View style={styles.personHeader}>
                <View style={styles.personNumBadge}>
                  <Text style={styles.personNum}>{idx + 1}</Text>
                </View>
                <Text style={styles.personTitle}>{t('Person')} {idx + 1}</Text>
                {persons.length > 1 && (
                  <Pressable onPress={() => removePerson(idx)}>
                    <Ionicons name="close-circle" size={20} color={Colors.error} />
                  </Pressable>
                )}
              </View>

              <View style={[styles.fieldGroup, { marginBottom: Spacing.sm }]}>
                <Text style={styles.fieldLabel}>{t('Name (optional)')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={person.name}
                  onChangeText={(value) => updatePerson(idx, 'name', value)}
                  placeholder={t('Enter person name')}
                  placeholderTextColor={Colors.midGray}
                  maxLength={120}
                />
              </View>

              <View style={styles.personRow}>
                <View style={[styles.fieldGroup, { flex: 1, marginRight: Spacing.sm }]}>
                  <Text style={styles.fieldLabel}>{t('Age')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={person.age}
                    onChangeText={(value) => handleAgeChange(idx, value)}
                    keyboardType="numeric"
                    placeholder="-"
                    placeholderTextColor={Colors.midGray}
                    maxLength={3}
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 2 }]}>
                  <Text style={styles.fieldLabel}>{t('Gender')}</Text>
                  <View style={styles.genderRow}>
                    {GENDERS.map((gender) => (
                      <Pressable
                        key={gender}
                        onPress={() => updatePerson(idx, 'gender', gender)}
                        style={[styles.genderBtn, person.gender === gender && styles.genderBtnActive]}
                      >
                        <Text style={[styles.genderText, person.gender === gender && styles.genderTextActive]}>
                          {t(gender[0])}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.voterStatusRow}>
                <View>
                  <Text style={styles.fieldLabel}>{t('Voter Status')}</Text>
                  <Text style={styles.voterSub}>
                    {person.age 
                      ? (parseInt(person.age, 10) >= 18 
                        ? t('Eligible (18+ years)')
                        : t('Not eligible (under 18)'))
                      : t('Enter age to determine eligibility')}
                  </Text>
                </View>
                <View style={[
                  styles.voterBadge, 
                  person.is_voter ? styles.voterBadgeActive : styles.voterBadgeInactive
                ]}>
                  <Text style={[
                    styles.voterBadgeText,
                    person.is_voter ? styles.voterBadgeTextActive : styles.voterBadgeTextInactive
                  ]}>
                    {person.is_voter ? t('YES') : t('NO')}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.submitWrap}>
          <ThemedButton
            title={submitting ? t('Submitting...') : t('Submit Household')}
            onPress={handleSubmit}
            loading={submitting}
            fullWidth
            size="lg"
            icon={!submitting ? <Ionicons name="cloud-upload" size={18} color={Colors.textPrimary} /> : undefined}
            style={Shadows.button}
          />
          <Text style={styles.submitHint}>
            {landmarkImages.length} {t(landmarkImages.length === 1 ? 'image' : 'images')} - {voterCount} {t(voterCount === 1 ? 'voter' : 'voters')} {t('in')} {persons.length} {t(persons.length === 1 ? 'person' : 'persons')}
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  bannerText: { flex: 1, fontSize: FontSizes.sm, fontWeight: '600', lineHeight: 18 },
  pageHeader: {
    backgroundColor: Colors.primary,
    paddingTop: 64,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
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
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: '900', color: Colors.textPrimary },
  pageSub: { fontSize: FontSizes.xs, color: Colors.white60, marginTop: 2 },
  progressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  progressChipText: { fontSize: FontSizes.xs, color: Colors.gold, fontWeight: '700' },
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
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: FontSizes.md,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    letterSpacing: 0.2,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  fieldLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 6,
    letterSpacing: 0.4,
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCardRaised,
    minHeight: 48,
  },
  toggleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleText: { fontSize: FontSizes.sm, color: Colors.midGray, fontWeight: '700' },
  toggleTextActive: { color: Colors.textPrimary },
  photoHint: { fontSize: FontSizes.xs, color: Colors.textMuted, lineHeight: 16 },
  photoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgCardRaised,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoMetaText: { fontSize: FontSizes.xs, color: Colors.gold, fontWeight: '700' },
  photoActions: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  photoAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.sm,
  },
  photoActionText: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: '700' },
  personsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  personsCount: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  addPersonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
    minHeight: 44,
  },
  addPersonText: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: '700' },
  personCard: {
    backgroundColor: Colors.bgCardRaised,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  personHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.md },
  personNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.button,
  },
  personNum: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.textPrimary },
  personTitle: { flex: 1, fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary },
  personRow: { flexDirection: 'row', alignItems: 'flex-start' },
  genderRow: { flexDirection: 'row', gap: 6 },
  genderBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  genderBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  genderText: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.midGray },
  genderTextActive: { color: Colors.textPrimary },
  voterStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.sm,
  },
  voterSub: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  voterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    minWidth: 50,
    alignItems: 'center',
  },
  voterBadgeActive: { backgroundColor: Colors.successMuted },
  voterBadgeInactive: { backgroundColor: Colors.bgCard },
  voterBadgeText: { fontSize: FontSizes.xs, fontWeight: '800' },
  voterBadgeTextActive: { color: Colors.success },
  voterBadgeTextInactive: { color: Colors.midGray },
  submitWrap: { padding: Spacing.xl, paddingTop: Spacing.lg },
  submitHint: {
    textAlign: 'center',
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
});