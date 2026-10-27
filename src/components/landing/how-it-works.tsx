import {Card} from '@astryxdesign/core/Card';
import {Center} from '@astryxdesign/core/Center';
import {Grid} from '@astryxdesign/core/Grid';
import {Section} from '@astryxdesign/core/Section';
import {Stack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {useTranslations} from 'next-intl';
import {anchorStyle, SectionIntro} from '@/components/landing/section-intro';

const stepIds = ['recipes', 'production', 'margin'] as const;

export function HowItWorks() {
  const t = useTranslations('LandingPage.howItWorks');

  return (
    <Section
      id="how-it-works"
      variant="section"
      paddingBlock={10}
      paddingInline={6}
      dividers={['bottom']}
      style={anchorStyle}>
      <Center axis="horizontal">
        <Stack width="100%" maxWidth={1120} gap={8}>
          <SectionIntro
            eyebrow={t('eyebrow')}
            title={t('title')}
            intro={t('intro')}
          />

          <Grid columns={{minWidth: 280, max: 3, repeat: 'fit'}} gap={4}>
            {stepIds.map((id, index) => (
              <Card key={id} padding={6} height="100%">
                <Stack gap={3}>
                  <Text type="large" weight="semibold" color="accent">
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                  <Heading level={3}>{t(`steps.${id}.title`)}</Heading>
                  <Text type="body" color="secondary">
                    {t(`steps.${id}.body`)}
                  </Text>
                </Stack>
              </Card>
            ))}
          </Grid>
        </Stack>
      </Center>
    </Section>
  );
}
