import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Radius, Shadows, Spacing } from '@/constants/theme';
import { ThemedButton } from '@/components/ThemedButton';
import { authApi } from '@/lib/api';
import { AuthStore } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  // Entrance animation
  const cardSlide = useRef(new Animated.Value(40)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(cardSlide, {
        toValue: 0,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardOpacity, cardSlide]);

  async function handleLogin() {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter phone number and password.');
      return;
    }
    setLoading(true);
    try {
      const user = await authApi.login(phone.trim(), password);
      AuthStore.set(user);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Login Failed', err.message ?? 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Banner ─────────────────────────────────────── */}
        <View style={styles.banner}>
          {/* Decorative shapes */}
          <View style={styles.shapeTL} />
          <View style={styles.shapeBR} />
          <View style={styles.shapeCircle} />

          {/* Logo */}
          <View style={styles.logoRing}>
            <Image
              source={require('@/assets/images/admk-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Tamil title */}
          <Text style={styles.appNameTamil}>வாக்காளர் சேகரிப்பு</Text>
          <Text style={styles.appNameEn}>VOTER DATA COLLECTION</Text>

          {/* Gold divider */}
          <View style={styles.goldDivider} />

          <View style={styles.partyTagRow}>
            <View style={[styles.partyDot, { backgroundColor: Colors.leafGreen }]} />
            <Text style={styles.partyTag}>AIADMK Field Operations</Text>
            <View style={[styles.partyDot, { backgroundColor: Colors.leafGreen }]} />
          </View>
        </View>

        {/* ── Login Card ──────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ translateY: cardSlide }],
              opacity: cardOpacity,
            },
          ]}
        >
          {/* Card header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="finger-print" size={22} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.cardTitle}>Field Login</Text>
              <Text style={styles.cardSub}>Enter your credentials to continue</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* ── Phone ─────────────────────────────────────────── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              <Text style={styles.labelDot}>● </Text>Phone Number
            </Text>
            <View style={[
              styles.inputWrap,
              phoneFocused && styles.inputWrapFocused,
            ]}>
              <View style={styles.inputIconWrap}>
                <Ionicons name="call" size={17} color={phoneFocused ? Colors.primary : Colors.midGray} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="9XXXXXXXXX"
                placeholderTextColor={Colors.textDim}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={15}
                autoComplete="tel"
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
              />
            </View>
          </View>

          {/* ── Password ──────────────────────────────────────── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              <Text style={styles.labelDot}>● </Text>Password
            </Text>
            <View style={[
              styles.inputWrap,
              passFocused && styles.inputWrapFocused,
            ]}>
              <View style={styles.inputIconWrap}>
                <Ionicons name="lock-closed" size={17} color={passFocused ? Colors.primary : Colors.midGray} />
              </View>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Enter password"
                placeholderTextColor={Colors.textDim}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoComplete="password"
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
              />
              <Pressable
                onPress={() => setShowPassword(v => !v)}
                style={styles.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color={passFocused ? Colors.primary : Colors.midGray}
                />
              </Pressable>
            </View>
          </View>

          {/* ── Login Button ──────────────────────────────────── */}
          <View style={styles.btnWrap}>
            <ThemedButton
              title="LOGIN TO FIELD APP"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
              icon={<Ionicons name="log-in" size={18} color={Colors.textPrimary} />}
              style={Shadows.button}
            />
          </View>

          <View style={styles.hintRow}>
            <Ionicons name="information-circle-outline" size={13} color={Colors.textDim} />
            <Text style={styles.hint}>Contact your admin if you need access.</Text>
          </View>
        </Animated.View>

        {/* ── Footer ─────────────────────────────────────────── */}
        <View style={styles.footerRow}>
          <View style={styles.footerDot} />
          <Text style={styles.footer}>Secure Field Data Platform · v1.0</Text>
          <View style={styles.footerDot} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bgDark },
  container: { flexGrow: 1, backgroundColor: Colors.bgDark },

  // ── Banner ──────────────────────────────────────────────────────────────
  banner: {
    backgroundColor: Colors.primary,
    paddingTop: 72,
    paddingBottom: 48,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  shapeTL: {
    position: 'absolute',
    top: -30,
    left: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.primaryDark,
    opacity: 0.5,
  },
  shapeBR: {
    position: 'absolute',
    bottom: -40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.primaryDark,
    opacity: 0.4,
    transform: [{ rotate: '15deg' }],
  },
  shapeCircle: {
    position: 'absolute',
    top: 10,
    right: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.white10,
  },

  // Logo ring
  logoRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: Colors.white80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.header,
  },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },

  appNameTamil: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 0.8,
    marginBottom: 4,
    textAlign: 'center',
  },
  appNameEn: {
    fontSize: FontSizes.xs,
    fontWeight: '800',
    color: Colors.white60,
    letterSpacing: 3.5,
    textAlign: 'center',
  },
  goldDivider: {
    width: 48,
    height: 2.5,
    backgroundColor: Colors.gold,
    marginVertical: Spacing.sm,
    borderRadius: 2,
  },
  partyTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  partyTag: {
    fontSize: FontSizes.xs,
    color: Colors.gold,
    fontWeight: '700',
    letterSpacing: 1.2,
  },

  // ── Card ────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.bgCard,
    margin: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: -Spacing.lg,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.borderRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  cardSub: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.lg,
  },

  // ── Fields ──────────────────────────────────────────────────────────────
  fieldGroup: { marginBottom: Spacing.md },
  label: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  labelDot: { color: Colors.primary },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCardRaised,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    height: 54,
    overflow: 'hidden',
  },
  inputWrapFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  inputIconWrap: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    paddingRight: Spacing.sm,
  },
  eyeBtn: {
    padding: Spacing.md,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnWrap: { marginTop: Spacing.sm, marginBottom: Spacing.sm },

  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: Spacing.xs,
  },
  hint: {
    fontSize: FontSizes.xs,
    color: Colors.textDim,
  },

  // ── Footer ──────────────────────────────────────────────────────────────
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.lg,
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  footer: {
    fontSize: FontSizes.xs,
    color: Colors.border,
  },
});