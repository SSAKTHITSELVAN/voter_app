import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontSizes, Radius } from '@/constants/theme';

type Status = 'MATCHED' | 'MISMATCH' | 'SUPER_ADMIN' | 'ADMIN' | 'FIELD_USER' | 'INDIVIDUAL' | 'APARTMENT' | string;

const STATUS_CONFIG: Record<string, { bg: string; text: string; label?: string }> = {
  MATCHED:     { bg: '#16382A', text: Colors.success },
  MISMATCH:    { bg: '#3A1515', text: Colors.error },
  SUPER_ADMIN: { bg: '#2A1A00', text: Colors.gold, label: 'SUPER ADMIN' },
  ADMIN:       { bg: '#1A1A3A', text: Colors.info },
  FIELD_USER:  { bg: '#1A2A1A', text: Colors.success, label: 'FIELD USER' },
  INDIVIDUAL:  { bg: '#2A1A1A', text: Colors.primaryLight },
  APARTMENT:   { bg: '#2A2200', text: Colors.gold },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status] ?? { bg: Colors.darkGray, text: Colors.lightGray };
  const label = config.label ?? status;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});