import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { HouseholdBrief } from '@/lib/types';

interface Props {
  household: HouseholdBrief;
  onPress?: () => void;
}

export function HouseholdCard({ household, onPress }: Props) {
  const voters = (household as any).persons?.filter((p: any) => p.is_voter).length;
  const totalPersons = (household as any).persons?.length;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {/* Left accent bar */}
      <View style={[
        styles.accentBar,
        { backgroundColor: household.house_type === 'APARTMENT' ? Colors.gold : Colors.primary }
      ]} />

      <View style={styles.content}>
        <View style={styles.row}>
          <View style={styles.typeTag}>
            <Ionicons
              name={household.house_type === 'APARTMENT' ? 'business' : 'home'}
              size={12}
              color={household.house_type === 'APARTMENT' ? Colors.gold : Colors.primary}
            />
            <Text style={[
              styles.typeText,
              { color: household.house_type === 'APARTMENT' ? Colors.gold : Colors.primary }
            ]}>
              {household.house_type}
            </Text>
          </View>
          {household.distance_metres !== null && household.distance_metres !== undefined && (
            <View style={styles.distanceBadge}>
              <Ionicons name="location" size={11} color={Colors.lightGray} />
              <Text style={styles.distanceText}>
                {household.distance_metres < 1000
                  ? `${Math.round(household.distance_metres)}m`
                  : `${(household.distance_metres / 1000).toFixed(1)}km`}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.address} numberOfLines={2}>
          {household.address_text ?? 'No address provided'}
        </Text>

        <View style={styles.footer}>
          <View style={styles.coords}>
            <Ionicons name="navigate" size={11} color={Colors.textMuted} />
            <Text style={styles.coordText}>
              {household.latitude.toFixed(5)}, {household.longitude.toFixed(5)}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(household.created_at).toLocaleDateString('en-IN')}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={Colors.midGray} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  accentBar: { width: 4, alignSelf: 'stretch' },
  content: { flex: 1, padding: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  typeTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  typeText: { fontSize: FontSizes.xs, fontWeight: '700', letterSpacing: 0.5 },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.darkGray,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  distanceText: { fontSize: FontSizes.xs, color: Colors.lightGray },
  address: { fontSize: FontSizes.sm, color: Colors.textPrimary, fontWeight: '500', marginBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  coords: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  coordText: { fontSize: 10, color: Colors.textMuted, fontFamily: 'monospace' },
  dateText: { fontSize: FontSizes.xs, color: Colors.textMuted },
});