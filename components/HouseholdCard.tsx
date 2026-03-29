import React, { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors, FontSizes, Radius, Shadows, Spacing } from '@/constants/theme';
import { resolveApiUrl } from '@/lib/api';
import { HouseholdBrief } from '@/lib/types';
import { ImagePreviewModal } from './ImagePreviewModal';

interface Props {
  household: HouseholdBrief;
  onPress?: () => void;
}

export const HouseholdCard = React.memo(function HouseholdCard({ household, onPress }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const [previewVisible, setPreviewVisible] = useState(false);
  const isApartment = household.house_type === 'APARTMENT';
  const accentColor = isApartment ? Colors.gold : Colors.primary;
  const accentBorder = isApartment ? Colors.borderGold : Colors.borderRed;
  const previewUrl = household.landmark_image_url ? resolveApiUrl(household.landmark_image_url) : null;
  const imageCount = household.landmark_image_count ?? 0;

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.975,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  }

  const distanceLabel =
    household.distance_metres !== null && household.distance_metres !== undefined
      ? household.distance_metres < 1000
        ? `${Math.round(household.distance_metres)}m`
        : `${(household.distance_metres / 1000).toFixed(1)}km`
      : null;

  return (
    <>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[styles.card, { borderColor: accentBorder }, Shadows.card]}
        >
          <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

          <View style={styles.content}>
            <View style={styles.topRow}>
              <View style={[styles.typeTag, { borderColor: accentColor + '40', backgroundColor: accentColor + '15' }]}>
                <Ionicons
                  name={isApartment ? 'business' : 'home'}
                  size={11}
                  color={accentColor}
                />
                <Text style={[styles.typeText, { color: accentColor }]}>
                  {household.house_type}
                </Text>
              </View>

              <View style={styles.badgeRow}>
                {imageCount > 0 ? (
                  <View style={styles.imageBadge}>
                    <Ionicons name="images" size={11} color={Colors.gold} />
                    <Text style={styles.imageBadgeText}>{imageCount}</Text>
                  </View>
                ) : null}
                {distanceLabel ? (
                  <View style={styles.distanceBadge}>
                    <Ionicons name="location" size={11} color={Colors.primary} />
                    <Text style={styles.distanceText}>{distanceLabel}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.mainRow}>
              <View style={styles.textColumn}>
                <Text style={styles.address} numberOfLines={2}>
                  {household.address_text ?? 'No address provided'}
                </Text>

                <View style={styles.footer}>
                  <View style={styles.coords}>
                    <Ionicons name="navigate-outline" size={10} color={Colors.textMuted} />
                    <Text style={styles.coordText}>
                      {household.latitude.toFixed(4)}, {household.longitude.toFixed(4)}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>
                    {new Date(household.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short',
                    })}
                  </Text>
                </View>
              </View>

              {previewUrl ? (
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    setPreviewVisible(true);
                  }}
                  style={styles.previewPressable}
                >
                  <Image
                    source={{ uri: previewUrl }}
                    style={styles.previewImage}
                    contentFit="cover"
                    transition={150}
                  />
                  <View style={styles.previewBadge}>
                    <Ionicons name="expand-outline" size={12} color={Colors.textPrimary} />
                  </View>
                </Pressable>
              ) : (
                <View style={styles.previewPlaceholder}>
                  <Ionicons name="image-outline" size={18} color={Colors.textMuted} />
                </View>
              )}
            </View>
          </View>

          <View style={styles.chevronWrap}>
            <Ionicons name="chevron-forward" size={16} color={Colors.midGray} />
          </View>
        </Pressable>
      </Animated.View>

      <ImagePreviewModal
        visible={previewVisible}
        imageUri={previewUrl}
        title="Nearby Landmark Preview"
        onClose={() => setPreviewVisible(false)}
      />
    </>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
  },
  accentBar: { width: 4, alignSelf: 'stretch' },
  content: { flex: 1, padding: Spacing.md, gap: 8 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  typeText: { fontSize: FontSizes.xxs, fontWeight: '700', letterSpacing: 0.5 },
  imageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.goldMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.borderGold,
  },
  imageBadgeText: { fontSize: FontSizes.xxs, color: Colors.gold, fontWeight: '700' },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.borderRed,
  },
  distanceText: { fontSize: FontSizes.xxs, color: Colors.primary, fontWeight: '600' },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
  },
  textColumn: {
    flex: 1,
    gap: 8,
  },
  address: {
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: '500',
    lineHeight: 19,
  },
  previewPressable: {
    width: 72,
    height: 72,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: Colors.bgCardRaised,
  },
  previewImage: {
    width: 72,
    height: 72,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgCardRaised,
  },
  previewBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgOverlay,
    borderWidth: 1,
    borderColor: Colors.white20,
  },
  previewPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgCardRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  coords: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  coordText: { fontSize: 10, color: Colors.textMuted },
  dateText: { fontSize: FontSizes.xs, color: Colors.textDim },
  chevronWrap: {
    paddingRight: Spacing.md,
    paddingLeft: Spacing.xs,
  },
});
