import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Radius } from '@/constants/theme';

type Status =
  | 'MATCHED'
  | 'MISMATCH'
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'FIELD_USER'
  | 'INDIVIDUAL'
  | 'APARTMENT'
  | string;

const STATUS_CONFIG: Record<string, {
  bg: string;
  text: string;
  border: string;
  dot: string;
  label?: string;
  icon?: any;
}> = {
  MATCHED: {
    bg: '#16382A',
    text: Colors.success,
    border: '#22C55E40',
    dot: Colors.success,
    icon: 'checkmark-circle',
  },
  MISMATCH: {
    bg: '#3A1515',
    text: Colors.error,
    border: '#EF444440',
    dot: Colors.error,
    icon: 'close-circle',
  },
  SUPER_ADMIN: {
    bg: '#2A1A00',
    text: Colors.gold,
    border: '#D4A01740',
    dot: Colors.gold,
    label: 'SUPER ADMIN',
    icon: 'star',
  },
  ADMIN: {
    bg: '#1A1A3A',
    text: Colors.info,
    border: '#3B82F640',
    dot: Colors.info,
    icon: 'shield-checkmark',
  },
  FIELD_USER: {
    bg: '#1A2A1A',
    text: Colors.leafLight,
    border: '#4CAF5040',
    dot: Colors.leafLight,
    label: 'FIELD USER',
    icon: 'person',
  },
  INDIVIDUAL: {
    bg: '#2A1A1A',
    text: Colors.primaryLight,
    border: '#FF333340',
    dot: Colors.primaryLight,
    icon: 'home',
  },
  APARTMENT: {
    bg: '#2A2200',
    text: Colors.gold,
    border: '#D4A01740',
    dot: Colors.gold,
    icon: 'business',
  },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status] ?? {
    bg: Colors.darkGray,
    text: Colors.lightGray,
    border: '#AAAAAA20',
    dot: Colors.lightGray,
  };
  const label = config.label ?? status;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }]}>
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text style={[styles.text, { color: config.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  text: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});