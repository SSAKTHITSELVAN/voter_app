import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Radius, Shadows, Spacing } from '@/constants/theme';
import { HouseholdBrief } from '@/lib/types';

interface Props {
  household: HouseholdBrief;
  onPress?: () => void;
}

export const HouseholdCard = React.memo(function HouseholdCard({ household, onPress }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const isApartment = household.house_type === 'APARTMENT';
  const accentColor = isApartment ? Colors.gold : Colors.primary;
  const accentBorder = isApartment ? Colors.borderGold : Colors.borderRed;

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
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.card, { borderColor: accentBorder }, Shadows.card]}
      >
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        <View style={styles.content}>
          {/* Top row: type badge + distance chip */}
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

            {distanceLabel && (
              <View style={styles.distanceBadge}>
                <Ionicons name="location" size={11} color={Colors.primary} />
                <Text style={styles.distanceText}>{distanceLabel}</Text>
              </View>
            )}
          </View>

          {/* Address */}
          <Text style={styles.address} numberOfLines={2}>
            {household.address_text ?? 'No address provided'}
          </Text>

          {/* Footer */}
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

        <View style={styles.chevronWrap}>
          <Ionicons name="chevron-forward" size={16} color={Colors.midGray} />
        </View>
      </Pressable>
    </Animated.View>
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
  content: { flex: 1, padding: Spacing.md, gap: 6 },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  address: {
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: '500',
    lineHeight: 19,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coords: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  coordText: { fontSize: 10, color: Colors.textMuted },
  dateText: { fontSize: FontSizes.xs, color: Colors.textDim },

  chevronWrap: {
    paddingRight: Spacing.md,
    paddingLeft: Spacing.xs,
  },
});