import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { Colors, FontSizes, Radius, Shadows, Spacing } from '@/constants/theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'danger' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  fullWidth?: boolean;
  icon?: React.ReactNode;
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
  icon,
}: Props) {
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }

  const textColor = {
    primary: Colors.textPrimary,
    outline:  Colors.primary,
    danger:   Colors.textPrimary,
    ghost:    Colors.primary,
    gold:     Colors.textDark,
  }[variant];

  const variantStyle = {
    primary: styles.primary,
    outline: styles.outline,
    danger: styles.danger,
    ghost: styles.ghost,
    gold: styles.gold,
  }[variant];

  const sizeStyle = {
    sm: styles.size_sm,
    md: styles.size_md,
    lg: styles.size_lg,
  }[size];

  return (
    <Animated.View style={[{ transform: [{ scale }] }, fullWidth && styles.fullWidth]}>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.base,
          variantStyle,
          sizeStyle,
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
          variant === 'primary' && !isDisabled && Shadows.button,
          variant === 'gold' && !isDisabled && Shadows.gold,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'outline' || variant === 'ghost' ? Colors.primary : variant === 'gold' ? Colors.textDark : Colors.textPrimary}
            size="small"
          />
        ) : (
          <>
            {icon && <>{icon}</>}
            <Text style={[
              styles.text,
              { color: textColor },
              { sm: styles.textSize_sm, md: styles.textSize_md, lg: styles.textSize_lg }[size],
            ]}>
              {title}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  fullWidth: { width: '100%' },

  // ── Variants ──────────────────────────────────────────────────────────────
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
  gold: {
    backgroundColor: Colors.gold,
  },

  // ── Sizes (min 48px for accessibility) ───────────────────────────────────
  size_sm: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, minHeight: 40 },
  size_md: { paddingVertical: 13, paddingHorizontal: Spacing.lg, minHeight: 50 },
  size_lg: { paddingVertical: 17, paddingHorizontal: Spacing.xl, minHeight: 56 },

  // ── Text ──────────────────────────────────────────────────────────────────
  text: { fontWeight: '700', letterSpacing: 0.5 },
  textSize_sm: { fontSize: FontSizes.sm },
  textSize_md: { fontSize: FontSizes.md },
  textSize_lg: { fontSize: FontSizes.lg },

  // ── States ────────────────────────────────────────────────────────────────
  disabled: { opacity: 0.38 },
});