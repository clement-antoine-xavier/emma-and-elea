import {Card} from '@astryxdesign/core/Card';
import {Center} from '@astryxdesign/core/Center';
import {Grid} from '@astryxdesign/core/Grid';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {Link} from '@astryxdesign/core/Link';
import {Section} from '@astryxdesign/core/Section';
import {Stack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {useTranslations} from 'next-intl';
import {anchorStyle, SectionIntro} from '@/components/landing/section-intro';

const painIds = ['costs', 'waste', 'traceability'] as const;
const outcomeIds = ['costs', 'quantity', 'traceability'] as const;

export function ProblemSolution() {
  const t = useTranslations('LandingPage.problem');

  return (
    <Section
      id="reality"
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

          <Grid columns={{minWidth: 320, max: 2, repeat: 'fit'}} gap={6}>
            <Card variant="muted" padding={6} height="100%">
              <Stack gap={4}>
                <Stack gap={1}>
                  <Text type="label" color="secondary">
                    {t('withoutTitle')}
                  </Text>
                  <Heading level={3}>{t('withoutHeading')}</Heading>
                  <Text type="supporting" color="secondary">
                    {t('withoutIntro')}
                  </Text>
                </Stack>

                <Stack gap={3}>
                  {painIds.map((id) => (
                    <HStack key={id} gap={2} align="start">
                      <Icon icon="warning" color="warning" size="sm" />
                      <Text type="body" color="secondary">
                        {t(`pains.${id}`)}
                      </Text>
                    </HStack>
                  ))}
                </Stack>
              </Stack>
            </Card>

            <Card variant="yellow" padding={6} height="100%">
              <Stack gap={4}>
                <Stack gap={1}>
                  <Text type="label" color="secondary">
                    {t('withTitle')}
                  </Text>
                  <Heading level={3}>{t('withHeading')}</Heading>
                  <Text type="supporting" color="secondary">
                    {t('withIntro')}
                  </Text>
                </Stack>

                <Stack gap={3}>
                  {outcomeIds.map((id) => (
                    <HStack key={id} gap={2} align="start">
                      <Icon icon="check" color="success" size="sm" />
                      <Text type="body" color="secondary">
                        {t(`outcomes.${id}`)}
                      </Text>
                    </HStack>
                  ))}
                </Stack>

                <Link href="#how-it-works" isStandalone hasUnderline>
                  {t('link')}
                </Link>
              </Stack>
            </Card>
          </Grid>
        </Stack>
      </Center>
    </Section>
  );
}
