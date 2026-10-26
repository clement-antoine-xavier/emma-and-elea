'use client';

import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import {useTranslations} from 'next-intl';
import {useThemeMode} from '@/components/theme-mode-provider';
import {isThemeModePreference, themeModes} from '@/lib/theme-mode';

export function ThemeSwitcher() {
  const t = useTranslations('ThemeSwitcher');
  const {mode, setMode} = useThemeMode();

  return (
    <SegmentedControl
      label={t('label')}
      size="sm"
      value={mode}
      onChange={(value) => {
        if (isThemeModePreference(value)) {
          setMode(value);
        }
      }}
    >
      {themeModes.map((option) => (
        <SegmentedControlItem
          key={option}
          value={option}
          label={t(option)}
        />
      ))}
    </SegmentedControl>
  );
}
