'use client';

import {
  Collapsible,
  CollapsibleGroup,
} from '@astryxdesign/core/Collapsible';
import {Center} from '@astryxdesign/core/Center';
import {Section} from '@astryxdesign/core/Section';
import {Stack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {useTranslations} from 'next-intl';
import {anchorStyle, SectionIntro} from '@/components/landing/section-intro';

const faqIds = [
  'card',
  'setup',
  'tools',
  'mobile',
  'data',
  'cancel',
] as const;

export function Faq() {
  const t = useTranslations('LandingPage.faq');

  return (
    <Section
      id="faq"
      variant="section"
      paddingBlock={10}
      paddingInline={6}
      dividers={['bottom']}
      style={anchorStyle}>
      <Center axis="horizontal">
        <Stack width="100%" maxWidth={920} gap={6}>
          <SectionIntro
            eyebrow={t('eyebrow')}
            title={t('title')}
            intro={t('intro')}
          />

          <CollapsibleGroup
            type="single"
            hasDividers
            density="spacious"
            defaultValue="card">
            {faqIds.map((id) => (
              <Collapsible
                key={id}
                value={id}
                trigger={
                  <Text type="body" weight="semibold">
                    {t(`items.${id}.question`)}
                  </Text>
                }>
                <Text type="body" color="secondary">
                  {t(`items.${id}.answer`)}
                </Text>
              </Collapsible>
            ))}
          </CollapsibleGroup>
        </Stack>
      </Center>
    </Section>
  );
}
