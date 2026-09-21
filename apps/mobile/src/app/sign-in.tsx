import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import { authErrorMessage, resetPassword, signIn, signUp } from '@/services/auth';

export default function SignInScreen() {
  const colors = useTheme();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await (mode === 'signIn' ? signIn(email, password) : signUp(email, password));
    } catch (error) {
      setMessage({ text: authErrorMessage(error), error: true });
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) {
      setMessage({ text: strings.signIn.enterEmail, error: true });
      return;
    }
    try {
      await resetPassword(email);
      setMessage({ text: strings.signIn.resetSent, error: false });
    } catch (error) {
      setMessage({ text: authErrorMessage(error), error: true });
    }
  };

  const inputStyle = [styles.input, { backgroundColor: colors.backgroundElement, color: colors.text, borderColor: colors.border }];
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={styles.center}>
        <View style={styles.form}>
          <Text style={[styles.title, { color: colors.text }]}>{strings.signIn.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{strings.signIn.subtitle}</Text>
          <TextInput
            style={inputStyle}
            placeholder={strings.signIn.email}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={inputStyle}
            placeholder={strings.signIn.password}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
          />
          {message ? (
            <Text style={[styles.message, { color: message.error ? colors.negative : colors.positive }]}>{message.text}</Text>
          ) : null}
          <Pressable
            onPress={submit}
            disabled={busy || !email || !password}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.accent, opacity: busy || !email || !password ? 0.5 : pressed ? 0.8 : 1 },
            ]}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{mode === 'signIn' ? strings.signIn.signIn : strings.signIn.signUp}</Text>
            )}
          </Pressable>
          <Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} hitSlop={8}>
            <Text style={[styles.link, { color: colors.accent }]}>
              {mode === 'signIn' ? strings.signIn.switchToSignUp : strings.signIn.switchToSignIn}
            </Text>
          </Pressable>
          {mode === 'signIn' ? (
            <Pressable onPress={forgot} hitSlop={8}>
              <Text style={[styles.link, { color: colors.textSecondary }]}>{strings.signIn.forgot}</Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  form: { width: '100%', maxWidth: 380, alignSelf: 'center', gap: 12 },
  title: { fontSize: 34, fontWeight: '800' },
  subtitle: { fontSize: 15, marginBottom: 12 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  message: { fontSize: 13 },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { fontSize: 14, textAlign: 'center', paddingVertical: 4 },
});
