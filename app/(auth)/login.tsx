import React, { useState } from 'react';
import {
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ThemedButton } from '@/components/ThemedButton';
import { authApi } from '@/lib/api';
import { AuthStore } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
      >
        {/* Header Banner */}
        <View style={styles.banner}>
          {/* Diagonal stripe accent */}
          <View style={styles.stripeAccent} />

          <View style={styles.logoWrap}>
            {/* ADMK-inspired emblem placeholder */}
            <View style={styles.emblem}>
              <Text style={styles.emblemText}>⚡</Text>
            </View>
          </View>

          <Text style={styles.appName}>வாக்காளர் சேகரிப்பு</Text>
          <Text style={styles.appNameEn}>VOTER DATA COLLECTION</Text>
          <View style={styles.divider} />
          <Text style={styles.partyTag}>ADMK Field Operations</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Field Login</Text>
          <Text style={styles.cardSub}>Enter your credentials to continue</Text>

          {/* Phone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="call-outline" size={18} color={Colors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="9XXXXXXXXX"
                placeholderTextColor={Colors.midGray}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={15}
                autoComplete="tel"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Enter password"
                placeholderTextColor={Colors.midGray}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoComplete="password"
              />
              <Pressable onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={Colors.midGray}
                />
              </Pressable>
            </View>
          </View>

          <ThemedButton
            title="LOGIN"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="lg"
            style={styles.loginBtn}
          />

          <Text style={styles.hint}>
            Contact your admin if you need access.
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Secure Field Data Platform · v1.0
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bgDark },
  container: { flexGrow: 1 },

  // Banner
  banner: {
    backgroundColor: Colors.primary,
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    overflow: 'hidden',
  },
  stripeAccent: {
    position: 'absolute',
    bottom: -20,
    right: -40,
    width: 200,
    height: 200,
    backgroundColor: Colors.primaryDark,
    transform: [{ rotate: '20deg' }],
    opacity: 0.4,
  },
  logoWrap: { marginBottom: Spacing.md },
  emblem: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemText: { fontSize: 32 },
  appName: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  appNameEn: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 3,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: Colors.gold,
    marginVertical: Spacing.sm,
  },
  partyTag: {
    fontSize: FontSizes.xs,
    color: Colors.gold,
    fontWeight: '600',
    letterSpacing: 1.5,
  },

  // Card
  card: {
    flex: 1,
    backgroundColor: Colors.bgDark,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  cardTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
  },

  // Fields
  fieldGroup: { marginBottom: Spacing.lg },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  eyeBtn: { padding: 4 },

  loginBtn: { marginTop: Spacing.sm, marginBottom: Spacing.md },
  hint: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  footer: {
    textAlign: 'center',
    fontSize: FontSizes.xs,
    color: Colors.border,
    paddingVertical: Spacing.lg,
  },
});