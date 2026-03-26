import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function ThemedButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  style,
  fullWidth = false,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? Colors.primary : Colors.textPrimary}
          size="small"
        />
      ) : (
        <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`]]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: { width: '100%' },

  // Variants
  primary: {
    backgroundColor: Colors.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  danger: {
    backgroundColor: Colors.error,
  },
  ghost: {
    backgroundColor: 'transparent',
  },

  // Sizes
  size_sm: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, minHeight: 36 },
  size_md: { paddingVertical: 12, paddingHorizontal: Spacing.lg, minHeight: 48 },
  size_lg: { paddingVertical: 16, paddingHorizontal: Spacing.xl, minHeight: 56 },

  // Text base
  text: { fontWeight: '700', letterSpacing: 0.3 },
  text_primary: { color: Colors.textPrimary },
  text_outline: { color: Colors.primary },
  text_danger: { color: Colors.textPrimary },
  text_ghost: { color: Colors.primary },

  // Text sizes
  textSize_sm: { fontSize: FontSizes.sm },
  textSize_md: { fontSize: FontSizes.md },
  textSize_lg: { fontSize: FontSizes.lg },

  // States
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.4 },
});