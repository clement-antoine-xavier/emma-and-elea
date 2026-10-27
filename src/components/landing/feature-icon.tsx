'use client';

import {Icon} from '@astryxdesign/core/Icon';
import {
  BadgeEuro,
  Boxes,
  CalendarClock,
  TabletSmartphone,
  TrendingUp,
  Users,
} from 'lucide-react';

const featureIcons = {
  costs: BadgeEuro,
  production: CalendarClock,
  stock: Boxes,
  team: Users,
  margins: TrendingUp,
  mobile: TabletSmartphone,
} as const;

export type FeatureIconName = keyof typeof featureIcons;

export function FeatureIcon({name}: {name: FeatureIconName}) {
  return <Icon icon={featureIcons[name]} color="accent" size="lg" />;
}
