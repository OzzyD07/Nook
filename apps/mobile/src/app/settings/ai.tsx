import { AiModelSchema, type AiStatus } from '@nook/shared';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SettingsRow, SettingsSection, SettingsText } from '@/components/settings-ui';
import { strings } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import { confirmAsync, showError } from '@/lib/confirm';
import { openUrl } from '@/openui/open-url';
import { deleteAiKey, getAiStatus, mcpEndpoint, saveAiSettings } from '@/services/api';

const KEYS_URL = 'https://aistudio.google.com/apikey';
const MODELS_URL = 'https://ai.google.dev/gemini-api/docs/models';

/**
 * The user's own Gemini API key for live AI inside card pages. The key goes to the
 * Worker, which stores it encrypted in Firestore; the app never reads it back.
 */
export default function AiSettingsScreen() {
  const colors = useTheme();
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [saving, setSaving] = useState(false);
  const configured = mcpEndpoint() !== '';

  useEffect(() => {
    if (!configured) return;
    getAiStatus()
      .then((next) => {
        setStatus(next);
        setModel(next.model);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, [configured]);

  const modelValid = AiModelSchema.safeParse(model).success;
  const changed = apiKey.trim() !== '' || (status !== null && model.trim() !== status.model);

  const save = async () => {
    setSaving(true);
    try {
      const next = await saveAiSettings({
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : null),
        ...(status && model.trim() !== status.model ? { model: model.trim() } : null),
      });
      setStatus(next);
      setModel(next.model);
      setApiKey('');
    } catch (reason) {
      showError(reason);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!(await confirmAsync(strings.ai.removeTitle, strings.ai.removeBody))) return;
    try {
      setStatus(await deleteAiKey());
    } catch (reason) {
      showError(reason);
    }
  };

  const inputStyle = [styles.input, { color: colors.text, borderColor: colors.border }];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled">
      <SettingsSection title={strings.ai.status} footer={error ?? strings.ai.statusFooter}>
        {!configured ? (
          <SettingsText>{strings.settings.mcpNotConfigured}</SettingsText>
        ) : status === null ? (
          <SettingsRow first label="…" loading={!error} />
        ) : (
          <>
            <SettingsRow
              first
              label={strings.ai.key}
              value={status.configured ? `•••• ${status.keyHint ?? ''}` : strings.ai.notSet}
            />
            <SettingsRow label={strings.ai.model} value={status.model} />
            <SettingsRow label={strings.ai.usage} value={`${status.usedToday} / ${status.dailyLimit}`} />
            {status.configured ? <SettingsRow label={strings.ai.remove} destructive onPress={remove} /> : null}
          </>
        )}
      </SettingsSection>

      {configured && status ? (
        <SettingsSection title={status.configured ? strings.ai.change : strings.ai.add} footer={strings.ai.keyFooter}>
          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{strings.ai.keyLabel}</Text>
            <TextInput
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="AIza…"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={inputStyle}
            />
            <Text style={[styles.label, { color: colors.textSecondary }]}>{strings.ai.modelLabel}</Text>
            <TextInput
              value={model}
              onChangeText={setModel}
              placeholder="gemini-3.5-flash-lite"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              style={inputStyle}
            />
            {!modelValid && model !== '' ? <Text style={{ color: colors.negative, fontSize: 12 }}>{strings.ai.modelInvalid}</Text> : null}
            <Pressable
              onPress={save}
              disabled={!changed || !modelValid || saving}
              style={[styles.button, { backgroundColor: colors.accent, opacity: !changed || !modelValid || saving ? 0.4 : 1 }]}
              accessibilityRole="button">
              <Text style={styles.buttonText}>{saving ? strings.ai.saving : strings.ai.save}</Text>
            </Pressable>
          </View>
          <SettingsRow label={strings.ai.getKey} chevron onPress={() => openUrl(KEYS_URL)} />
          <SettingsRow label={strings.ai.browseModels} chevron onPress={() => openUrl(MODELS_URL)} />
        </SettingsSection>
      ) : null}

      <SettingsSection title={strings.ai.howTitle}>
        <SettingsText>{strings.ai.howBody}</SettingsText>
      </SettingsSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, gap: 24, width: '100%', maxWidth: 640, alignSelf: 'center' },
  form: { padding: 16, gap: 8 },
  label: { fontSize: 12, fontWeight: '600' },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  button: { marginTop: 8, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
