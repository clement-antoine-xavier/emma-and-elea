import {Card} from '@astryxdesign/core/Card';
import {Center} from '@astryxdesign/core/Center';
import {Grid} from '@astryxdesign/core/Grid';
import {HStack} from '@astryxdesign/core/HStack';
import {Section} from '@astryxdesign/core/Section';
import {Stack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {useTranslations} from 'next-intl';
import {FeatureIcon} from '@/components/landing/feature-icon';
import {anchorStyle, SectionIntro} from '@/components/landing/section-intro';

const featureIds = [
  'costs',
  'production',
  'stock',
  'team',
  'margins',
  'mobile',
] as const;

export function Features() {
  const t = useTranslations('LandingPage.features');

  return (
    <Section
      id="product"
      variant="muted"
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

          <Grid columns={{minWidth: 300, max: 3, repeat: 'fit'}} gap={4}>
            {featureIds.map((id, index) => (
              <Card key={id} padding={5} height="100%">
                <Stack gap={3}>
                  <HStack justify="between" align="center" gap={3}>
                    <FeatureIcon name={id} />
                    <Text type="label" color="secondary">
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                  </HStack>
                  <Heading level={3}>{t(`items.${id}.title`)}</Heading>
                  <Text type="body" color="secondary">
                    {t(`items.${id}.body`)}
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
