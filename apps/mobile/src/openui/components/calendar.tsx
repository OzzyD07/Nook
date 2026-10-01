import { addDays, countdownParts, groupByDate, localDateKey, monthGrid, weekDates, weekdayIndex } from '@nook/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { strings } from '@/constants/strings';
import { withAlpha, type ThemeColors } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { openUrl } from '@/openui/open-url';
import { TEXT_SIZE, toneColor, type Tone } from '@/openui/tokens';
import { propsOf, type NodeProps } from '@/openui/types';
import { useUiColors } from '@/openui/ui-theme';

interface CalendarEventProps {
  date: string;
  title: string;
  time?: string | null;
  tone?: Tone | null;
  url?: string | null;
}

const eventsOf = (nodes: NodeProps['nodes']) => nodes('events').map((node) => propsOf<CalendarEventProps>(node));

function eventsByDate(events: CalendarEventProps[]): Map<string, CalendarEventProps[]> {
  return new Map(groupByDate(events));
}

function monthTitle(month: string): string {
  const [year, m] = month.split('-').map(Number) as [number, number];
  return `${strings.interactive.months[m - 1]} ${year}`;
}

/** "Wed, Sep 24" without Intl, so it renders the same on every runtime. */
function dayTitle(date: string, today: string): string {
  if (date === today) return strings.interactive.today;
  if (date === addDays(today, 1)) return strings.interactive.tomorrow;
  const [, m, d] = date.split('-').map(Number) as [number, number, number];
  return `${strings.interactive.weekdaysShort[weekdayIndex(date)]}, ${strings.interactive.months[m - 1]!.slice(0, 3)} ${d}`;
}

function Dots({ events, colors }: { events: CalendarEventProps[]; colors: ThemeColors }) {
  return (
    <View style={styles.dots}>
      {events.slice(0, 3).map((event, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: toneColor(colors, event.tone, 'accent') }]} />
      ))}
    </View>
  );
}

function EventRow({ event, colors }: { event: CalendarEventProps; colors: ThemeColors }) {
  const content = (
    <View style={styles.eventRow}>
      <View style={[styles.eventBar, { backgroundColor: toneColor(colors, event.tone, 'accent') }]} />
      <View style={styles.grow}>
        <Text style={[TEXT_SIZE.md, styles.eventTitle, { color: event.url ? colors.accent : colors.text }]}>{event.title}</Text>
        {event.time ? <Text style={[styles.small, { color: colors.textSecondary }]}>{event.time}</Text> : null}
      </View>
    </View>
  );
  return event.url ? (
    <Pressable onPress={() => openUrl(event.url)} accessibilityRole="link">
      {content}
    </Pressable>
  ) : (
    content
  );
}

export function Calendar({ props, nodes }: NodeProps) {
  const colors = useUiColors();
  const today = localDateKey(useNow());
  const month = String(props.month);
  const events = eventsOf(nodes);
  const byDate = eventsByDate(events);
  const [selected, setSelected] = useState<string | null>(null);
  const firstEventInMonth = [...byDate.keys()].find((date) => date.startsWith(month));
  const active = selected ?? (today.startsWith(month) ? today : (firstEventInMonth ?? null));
  const activeEvents = active ? (byDate.get(active) ?? []) : [];

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{props.title ? String(props.title) : monthTitle(month)}</Text>
        {props.title ? <Text style={[styles.small, { color: colors.textSecondary }]}>{monthTitle(month)}</Text> : null}
      </View>
      <View style={[styles.surface, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        <View style={styles.week}>
          {strings.interactive.weekdays.map((day, i) => (
            <Text key={i} style={[styles.weekday, { color: colors.textSecondary }]}>
              {day}
            </Text>
          ))}
        </View>
        {monthGrid(month).map((week, row) => (
          <View key={row} style={styles.week}>
            {week.map((date, col) => {
              if (!date) return <View key={col} style={styles.cell} />;
              const isActive = date === active;
              const isToday = date === today;
              return (
                <Pressable
                  key={col}
                  onPress={() => setSelected(date)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  style={styles.cell}>
                  <View
                    style={[
                      styles.dayCircle,
                      isActive && { backgroundColor: colors.accent },
                      !isActive && isToday && { borderWidth: 1.5, borderColor: colors.accent },
                    ]}>
                    <Text
                      style={[
                        styles.dayNumber,
                        { color: isActive ? '#fff' : isToday ? colors.accent : colors.text },
                        (isActive || isToday) && styles.bold,
                      ]}>
                      {Number(date.slice(8))}
                    </Text>
                  </View>
                  <Dots events={byDate.get(date) ?? []} colors={colors} />
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      {active ? (
        <View style={styles.dayEvents}>
          <Text style={[styles.dayHeading, { color: colors.textSecondary }]}>{dayTitle(active, today).toUpperCase()}</Text>
          {activeEvents.length ? (
            activeEvents.map((event, i) => <EventRow key={i} event={event} colors={colors} />)
          ) : (
            <Text style={[TEXT_SIZE.sm, { color: colors.textSecondary }]}>{strings.interactive.noEventsDay}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

export function Agenda({ props, nodes }: NodeProps) {
  const colors = useUiColors();
  const today = localDateKey(useNow());
  const groups = groupByDate(eventsOf(nodes));
  const upcoming = groups.filter(([date]) => date >= today);
  const shown = upcoming.length ? upcoming : groups;
  return (
    <View style={styles.block}>
      {props.title ? <Text style={[styles.title, { color: colors.text }]}>{String(props.title)}</Text> : null}
      {shown.length === 0 ? (
        <Text style={[TEXT_SIZE.sm, { color: colors.textSecondary }]}>{strings.interactive.noEvents}</Text>
      ) : (
        shown.map(([date, events]) => (
          <View key={date} style={styles.dayEvents}>
            <Text style={[styles.dayHeading, { color: date === today ? colors.accent : colors.textSecondary }]}>
              {dayTitle(date, today).toUpperCase()}
            </Text>
            {events.map((event, i) => (
              <EventRow key={i} event={event} colors={colors} />
            ))}
          </View>
        ))
      )}
    </View>
  );
}

export function WeekStrip({ props, nodes }: NodeProps) {
  const colors = useUiColors();
  const today = localDateKey(useNow());
  const byDate = eventsByDate(eventsOf(nodes));
  const days = weekDates(typeof props.start === 'string' ? props.start : today);
  return (
    <View style={styles.week}>
      {days.map((date, i) => {
        const isToday = date === today;
        return (
          <View key={date} style={[styles.stripDay, isToday && { backgroundColor: withAlpha(colors.accent, 0.14) }]}>
            <Text style={[styles.weekday, { color: isToday ? colors.accent : colors.textSecondary }]}>
              {strings.interactive.weekdays[i]}
            </Text>
            <Text style={[styles.dayNumber, isToday && styles.bold, { color: isToday ? colors.accent : colors.text }]}>
              {Number(date.slice(8))}
            </Text>
            <Dots events={byDate.get(date) ?? []} colors={colors} />
          </View>
        );
      })}
    </View>
  );
}

export function Countdown({ props }: NodeProps) {
  const colors = useUiColors();
  const now = useNow(1000);
  const target = Date.parse(String(props.target));
  const parts = countdownParts(target, now);
  const units = strings.interactive.units;
  const label = String(props.label);

  if (parts.done) {
    return (
      <View style={styles.countdown}>
        <Text style={[styles.small, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.countdownCompact, { color: colors.positive }]}>{strings.interactive.now} ✓</Text>
      </View>
    );
  }

  // Seconds only matter in the last hour.
  const values: [number, string][] = [
    [parts.days, units.days],
    [parts.hours, units.hours],
    [parts.minutes, units.minutes],
  ];
  if (parts.days === 0 && parts.hours === 0) values.push([parts.seconds, units.seconds]);
  // Drop leading zero units ("0 days"), keep inner ones ("1 day 0 hours 5 min").
  const first = values.findIndex(([value]) => value > 0);
  const visible = first < 0 ? values.slice(-1) : values.slice(first);

  if (props.style === 'large') {
    return (
      <View style={styles.countdown}>
        <Text style={[styles.small, { color: colors.textSecondary }]}>{label}</Text>
        <View style={styles.countdownBoxes}>
          {visible.map(([value, unit]) => (
            <View key={unit} style={[styles.countdownBox, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              <Text style={[styles.countdownValue, { color: colors.text }]}>{value}</Text>
              <Text style={[styles.small, { color: colors.textSecondary }]}>{unit}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }
  return (
    <View style={styles.countdown}>
      <Text style={[styles.small, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.countdownCompact, { color: colors.text }]} numberOfLines={1}>
        {visible.map(([value, unit]) => `${value} ${unit}`).join('  ')}
      </Text>
    </View>
  );
}

/** Only rendered inside Calendar, Agenda and WeekStrip, which read events themselves. */
export function CalendarEvent() {
  return null;
}

const styles = StyleSheet.create({
  block: { gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontSize: 15, fontWeight: '600' },
  small: { fontSize: 12, lineHeight: 16 },
  grow: { flex: 1, minWidth: 0 },
  surface: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 8, gap: 2 },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', paddingVertical: 4 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 3, minHeight: 44 },
  dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayNumber: { fontSize: 14, fontVariant: ['tabular-nums'] },
  bold: { fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 2, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  dayEvents: { gap: 6 },
  dayHeading: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  eventRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch', paddingVertical: 4 },
  eventBar: { width: 3, borderRadius: 2 },
  eventTitle: { fontWeight: '600' },
  stripDay: { flex: 1, alignItems: 'center', gap: 1, paddingVertical: 4, borderRadius: 10 },
  countdown: { gap: 4 },
  countdownCompact: { fontSize: 18, lineHeight: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  countdownBoxes: { flexDirection: 'row', gap: 8 },
  countdownBox: { flex: 1, alignItems: 'center', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  countdownValue: { fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
