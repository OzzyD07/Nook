import { BarChart, LineChart, MiniBarChart, MiniLineChart, PieChart, Sparkline } from '@/openui/charts/charts';
import {
  Icon,
  Image,
  KeyValue,
  List,
  ListItem,
  Metric,
  Progress,
  Source,
  SourceList,
  Timeline,
  TimelineItem,
} from '@/openui/components/data';
import { CardContainer, Divider, Page, Row, Section, Stack } from '@/openui/components/layout';
import { Badge, Callout, Caption, Heading, Link, Quote, Text } from '@/openui/components/text';
import type { NodeComponent } from '@/openui/types';

/** Native implementation of every component in the card and detail libraries. */
export const registry: Record<string, NodeComponent> = {
  CardContainer,
  Page,
  Section,
  Stack,
  Row,
  Divider,
  Heading,
  Text,
  Caption,
  Quote,
  Callout,
  Badge,
  Link,
  Icon,
  Image,
  Metric,
  Progress,
  List,
  ListItem,
  Timeline,
  TimelineItem,
  KeyValue,
  Source,
  SourceList,
  Sparkline,
  MiniLineChart,
  MiniBarChart,
  LineChart,
  BarChart,
  PieChart,
};
