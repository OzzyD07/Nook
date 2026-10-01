import * as Clipboard from 'expo-clipboard';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput as RNTextInput, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { strings } from '@/constants/strings';
import { withAlpha } from '@/constants/theme';
import { askAi } from '@/openui/ask-ai';
import { openUrl } from '@/openui/open-url';
import { useCardState } from '@/openui/state-context';
import { TEXT_SIZE, toneColor } from '@/openui/tokens';
import { propsOf, type NodeProps } from '@/openui/types';
import { usePreferences } from '@/store/preferences';
import { useUiColors } from '@/openui/ui-theme';

const TEXT_SAVE_DELAY_MS = 600;

interface ChecklistItemProps {
  id: string;
  label: string;
  note?: string | null;
  checked?: boolean | null;
}

export function Checklist({ props, nodes }: NodeProps) {
  const colors = useUiColors();
  const { state, setField, interactive } = useCardState();
  const saved = state.fields[props.id]?.value;
  const ticks = saved && typeof saved === 'object' && !Array.isArray(saved) ? (saved as Record<string, boolean>) : {};
  const items = nodes('items').map((node) => propsOf<ChecklistItemProps>(node));
  const isChecked = (item: ChecklistItemProps) => ticks[item.id] ?? Boolean(item.checked);
  const done = items.filter(isChecked).length;

  // The whole list is saved, so the AI sees every item's state, not only the ones changed.
  const toggle = (target: ChecklistItemProps) =>
    setField(
      props.id,
      Object.fromEntries(items.map((item) => [item.id, item.id === target.id ? !isChecked(item) : isChecked(item)])),
    );

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        {props.title ? <Text style={[styles.title, { color: colors.text }]}>{String(props.title)}</Text> : <View />}
        <Text style={[styles.caption, { color: colors.textSecondary }]}>
          {done}/{items.length}
        </Text>
      </View>
      <View style={[styles.group, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        {items.map((item, index) => {
          const checked = isChecked(item);
          return (
            <Pressable
              key={item.id}
              disabled={!interactive}
              onPress={() => toggle(item)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled: !interactive }}
              style={({ pressed }) => [
                styles.checkRow,
                index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                pressed && styles.pressed,
              ]}>
              <View
                style={[
                  styles.box,
                  { borderColor: checked ? colors.accent : colors.textSecondary, backgroundColor: checked ? colors.accent : 'transparent' },
                ]}>
                {checked ? <Text style={styles.tick}>✓</Text> : null}
              </View>
              <View style={styles.grow}>
                <Text
                  style={[
                    TEXT_SIZE.md,
                    { color: checked ? colors.textSecondary : colors.text },
                    checked && styles.struck,
                  ]}>
                  {item.label}
                </Text>
                {item.note ? <Text style={[styles.caption, { color: colors.textSecondary }]}>{item.note}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function TextInput({ props }: NodeProps) {
  const colors = useUiColors();
  const { state, setField, interactive } = useCardState();
  const stored = state.fields[props.id]?.value;
  const saved = typeof stored === 'string' ? stored : '';
  // While editing, the draft is shown; otherwise the saved value (which may change remotely).
  const [draft, setDraft] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = (value: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (value !== saved) setField(props.id, value);
  };

  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{String(props.label)}</Text>
      <RNTextInput
        value={draft ?? saved}
        editable={interactive}
        multiline={Boolean(props.multiline)}
        placeholder={props.placeholder ?? undefined}
        placeholderTextColor={colors.textSecondary}
        maxLength={2000}
        onFocus={() => setDraft(saved)}
        onChangeText={(value) => {
          setDraft(value);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => save(value), TEXT_SAVE_DELAY_MS);
        }}
        onBlur={() => {
          if (draft !== null) save(draft);
          setDraft(null);
        }}
        style={[
          styles.input,
          props.multiline && styles.multiline,
          { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.border },
        ]}
      />
    </View>
  );
}

export function Choice({ props }: NodeProps) {
  const colors = useUiColors();
  const { state, setField, interactive } = useCardState();
  const stored = state.fields[props.id]?.value;
  const selected = Array.isArray(stored) ? stored : [];
  const options: string[] = Array.isArray(props.options) ? props.options.map(String) : [];

  const pick = (option: string) => {
    const isSelected = selected.includes(option);
    if (props.multiple) setField(props.id, isSelected ? selected.filter((o) => o !== option) : [...selected, option]);
    else setField(props.id, isSelected ? [] : [option]);
  };

  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{String(props.label)}</Text>
      <View style={styles.pills}>
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <Pressable
              key={option}
              disabled={!interactive}
              onPress={() => pick(option)}
              accessibilityRole={props.multiple ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: active }}
              style={[
                styles.pill,
                {
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? withAlpha(colors.accent, 0.14) : colors.backgroundElement,
                },
              ]}>
              <Text style={[TEXT_SIZE.sm, { color: active ? colors.accent : colors.text, fontWeight: active ? '600' : '400' }]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Rating({ props }: NodeProps) {
  const colors = useUiColors();
  const { state, setField, interactive } = useCardState();
  const stored = state.fields[props.id]?.value;
  const value = typeof stored === 'number' ? stored : 0;
  const max = typeof props.max === 'number' ? props.max : 5;

  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{String(props.label)}</Text>
      <View style={styles.stars}>
        {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
          <Pressable
            key={star}
            disabled={!interactive}
            hitSlop={4}
            // Tapping the current rating again clears it.
            onPress={() => setField(props.id, star === value ? 0 : star)}
            accessibilityRole="button"
            accessibilityLabel={`${star} / ${max}`}>
            <Text style={[styles.star, { color: star <= value ? colors.warning : colors.border }]}>★</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function Button({ props }: NodeProps) {
  const colors = useUiColors();
  const { state, interactive, requestRefresh } = useCardState();
  const aiApp = usePreferences((preferences) => preferences.aiApp);
  const [copied, setCopied] = useState(false);
  const color = toneColor(colors, props.tone, 'accent');
  const value = typeof props.value === 'string' ? props.value : '';
  const requested = props.action === 'request_refresh' && state.refreshRequestedAt !== null;
  const disabled = (props.action === 'request_refresh' && (!interactive || requested)) || false;

  const press = async () => {
    switch (props.action) {
      case 'open_url':
        openUrl(value);
        break;
      case 'copy':
        await Clipboard.setStringAsync(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        break;
      case 'request_refresh':
        requestRefresh();
        break;
      case 'ask_ai':
        await askAi(aiApp, value).catch(() => undefined);
        break;
    }
  };

  const label = copied ? strings.interactive.copied : requested ? `${strings.interactive.requested} ✓` : String(props.label);
  return (
    <Pressable
      onPress={press}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: disabled ? colors.backgroundSelected : color, opacity: pressed ? 0.8 : 1 },
      ]}>
      <Text style={[styles.buttonText, { color: disabled ? colors.textSecondary : '#fff' }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Tabs({ nodes, slot }: NodeProps) {
  const colors = useUiColors();
  const [index, setIndex] = useState(0);
  const labels = nodes('tabs').map((node) => String(node.props.label));
  const panels = slot('tabs');
  const current = Math.min(index, panels.length - 1);
  return (
    <View style={styles.tabs}>
      <View style={[styles.segmented, { backgroundColor: colors.backgroundSelected }]}>
        {labels.map((label, i) => (
          <Pressable
            key={i}
            onPress={() => setIndex(i)}
            accessibilityRole="tab"
            accessibilityState={{ selected: i === current }}
            style={[styles.segment, i === current && { backgroundColor: colors.backgroundElement }]}>
            <Text
              style={[TEXT_SIZE.sm, { color: i === current ? colors.text : colors.textSecondary, fontWeight: i === current ? '600' : '500' }]}
              numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      {panels[current]?.element}
    </View>
  );
}

export function Tab({ slot }: NodeProps) {
  return <View style={styles.panel}>{slot('children').map((child) => child.element)}</View>;
}

export function Accordion({ slot }: NodeProps) {
  const colors = useUiColors();
  return (
    <View style={[styles.group, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
      {slot('items').map((item, index) => (
        <View key={index} style={index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
          {item.element}
        </View>
      ))}
    </View>
  );
}

export function AccordionItem({ props, slot }: NodeProps) {
  const colors = useUiColors();
  const [open, setOpen] = useState(Boolean(props.open));
  return (
    <View>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.accordionHeader, pressed && styles.pressed]}>
        <Text style={[TEXT_SIZE.md, styles.title, styles.grow, { color: colors.text }]}>{String(props.title)}</Text>
        <AppIcon name={open ? 'arrow-down' : 'arrow-right'} size={14} color={colors.textSecondary} />
      </Pressable>
      {open ? <View style={styles.accordionBody}>{slot('children').map((child) => child.element)}</View> : null}
    </View>
  );
}

/** Only rendered inside Checklist, which draws its items itself. */
export function ChecklistItem() {
  return null;
}

const styles = StyleSheet.create({
  block: { gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontSize: 15, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16 },
  label: { fontSize: 13, fontWeight: '500' },
  group: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 11 },
  pressed: { opacity: 0.6 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tick: { color: '#fff', fontSize: 14, fontWeight: '800', lineHeight: 16 },
  grow: { flex: 1, minWidth: 0 },
  struck: { textDecorationLine: 'line-through' },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  stars: { flexDirection: 'row', gap: 6 },
  star: { fontSize: 30, lineHeight: 34 },
  button: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  buttonText: { fontSize: 15, fontWeight: '600' },
  tabs: { gap: 16 },
  segmented: { flexDirection: 'row', borderRadius: 10, padding: 3 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8 },
  panel: { gap: 20 },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 13 },
  accordionBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 12 },
});
