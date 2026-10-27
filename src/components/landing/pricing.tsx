import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Center} from '@astryxdesign/core/Center';
import {Divider} from '@astryxdesign/core/Divider';
import {Grid} from '@astryxdesign/core/Grid';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {Section} from '@astryxdesign/core/Section';
import {Stack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {useTranslations} from 'next-intl';
import {anchorStyle, SectionIntro} from '@/components/landing/section-intro';

const assuranceIds = ['payment', 'cancel', 'team'] as const;
const includedIds = [
  'recipes',
  'production',
  'stock',
  'team',
  'margins',
] as const;

export function Pricing() {
  const t = useTranslations('LandingPage.pricing');

  return (
    <Section
      id="pricing"
      variant="muted"
      paddingBlock={10}
      paddingInline={6}
      dividers={['bottom']}
      style={anchorStyle}>
      <Center axis="horizontal">
        <Stack width="100%" maxWidth={1120} gap={6}>
          <Grid
            columns={{minWidth: 320, max: 2, repeat: 'fit'}}
            gap={8}
            align="center">
            <Stack gap={5}>
              <SectionIntro
                eyebrow={t('eyebrow')}
                title={t('title')}
                intro={t('intro')}
              />

              <Stack gap={2}>
                {assuranceIds.map((id) => (
                  <HStack key={id} gap={2} align="start">
                    <Icon icon="check" color="success" size="sm" />
                    <Text type="body" color="secondary">
                      {t(`assurances.${id}`)}
                    </Text>
                  </HStack>
                ))}
              </Stack>
            </Stack>

            <Card variant="yellow" padding={6}>
              <Stack gap={4}>
                <HStack>
                  <Badge variant="neutral" label={t('plan.badge')} />
                </HStack>

                <Stack gap={1}>
                  <Heading level={3} type="display-3">
                    {t('plan.price')}
                  </Heading>
                  <Text type="supporting" color="secondary">
                    {t('plan.period')}
                  </Text>
                </Stack>

                <Divider />

                <Stack gap={3}>
                  <Text type="label" color="secondary">
                    {t('plan.includes')}
                  </Text>
                  <Stack gap={2}>
                    {includedIds.map((id) => (
                      <HStack key={id} gap={2} align="start">
                        <Icon icon="check" color="success" size="sm" />
                        <Text type="body">{t(`plan.features.${id}`)}</Text>
                      </HStack>
                    ))}
                  </Stack>
                </Stack>

                <Button
                  href="/sign-up"
                  variant="primary"
                  label={t('plan.cta')}
                  width="100%"
                />
                <Text type="supporting" justify="center">
                  {t('plan.reassurance')}
                </Text>
              </Stack>
            </Card>
          </Grid>

          <Text type="supporting" color="secondary" justify="center">
            {t('note')}
          </Text>
        </Stack>
      </Center>
    </Section>
  );
}
