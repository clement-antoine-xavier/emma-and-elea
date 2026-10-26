import {Button} from '@astryxdesign/core/Button';
import {Center} from '@astryxdesign/core/Center';
import {Divider} from '@astryxdesign/core/Divider';
import {Grid} from '@astryxdesign/core/Grid';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {Link} from '@astryxdesign/core/Link';
import {List, ListItem} from '@astryxdesign/core/List';
import {Section} from '@astryxdesign/core/Section';
import {Stack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {useTranslations} from 'next-intl';

const anchorStyle = {
  scrollMarginTop: 'calc(var(--spacing-10) + var(--spacing-4))',
};

const problemIds = [
  'costs',
  'waste',
  'team',
  'stock',
  'profitability',
  'tools',
] as const;

const capabilityIds = [
  'recipes',
  'production',
  'stock',
  'team',
  'margins',
  'simple',
] as const;

const benefitIds = [
  'produce',
  'margins',
  'time',
  'team',
  'losses',
  'compliance',
] as const;

function SectionIntro({
  eyebrow,
  title,
  intro,
  isCentered = false,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  isCentered?: boolean;
}) {
  return (
    <Stack gap={3} maxWidth={780} hAlign={isCentered ? 'center' : 'start'}>
      <Text type="label" color="accent">
        {eyebrow}
      </Text>
      <Heading
        level={2}
        type="display-3"
        justify={isCentered ? 'center' : 'start'}
        textWrap="balance">
        {title}
      </Heading>
      <Text
        type="large"
        color="secondary"
        justify={isCentered ? 'center' : 'start'}
        textWrap="balance">
        {intro}
      </Text>
    </Stack>
  );
}

export function RealitySection() {
  const t = useTranslations('LandingPage.reality');

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
          <Stack width="100%" maxWidth={920}>
            <List hasDividers density="spacious">
              {problemIds.map((id, index) => (
                <ListItem
                  key={id}
                  align="start"
                  startContent={
                    <Text type="label" color="accent">
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                  }
                  label={
                    <Stack gap={1}>
                      <Heading level={3}>
                        {t(`problems.${id}.title`)}
                      </Heading>
                      <Text type="body" color="secondary">
                        {t(`problems.${id}.body`)}
                      </Text>
                    </Stack>
                  }
                />
              ))}
            </List>
          </Stack>
        </Stack>
      </Center>
    </Section>
  );
}

export function ProductSection() {
  const t = useTranslations('LandingPage.product');

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
          <Grid columns={{minWidth: 260, max: 3, repeat: 'fit'}} gap={6}>
            {capabilityIds.map((id, index) => (
              <Stack key={id} gap={2}>
                <Text type="label" color="accent">
                  {String(index + 1).padStart(2, '0')}
                </Text>
                <Heading level={3}>
                  {t(`capabilities.${id}.title`)}
                </Heading>
                <Text type="body" color="secondary">
                  {t(`capabilities.${id}.body`)}
                </Text>
              </Stack>
            ))}
          </Grid>
        </Stack>
      </Center>
    </Section>
  );
}

export function BenefitsSection() {
  const t = useTranslations('LandingPage.benefits');

  return (
    <Section
      id="benefits"
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
            isCentered
          />
          <Grid columns={{minWidth: 280, max: 2, repeat: 'fit'}} gap={6}>
            {benefitIds.map((id) => (
              <HStack key={id} gap={3} align="start">
                <Icon icon="check" color="success" size="md" />
                <Stack gap={1}>
                  <Heading level={3}>{t(`items.${id}.title`)}</Heading>
                  <Text type="body" color="secondary">
                    {t(`items.${id}.body`)}
                  </Text>
                </Stack>
              </HStack>
            ))}
          </Grid>
        </Stack>
      </Center>
    </Section>
  );
}

export function FinalCtaSection() {
  const t = useTranslations('LandingPage.finalCta');

  return (
    <Section
      id="start"
      variant="muted"
      paddingBlock={10}
      paddingInline={6}
      dividers={['bottom']}
      style={anchorStyle}>
      <Center axis="horizontal">
        <Stack width="100%" maxWidth={780} gap={5} hAlign="center">
          <Text type="label" color="accent">
            {t('eyebrow')}
          </Text>
          <Heading
            level={2}
            type="display-3"
            justify="center"
            textWrap="balance">
            {t('title')}
          </Heading>
          <Text
            type="large"
            color="secondary"
            justify="center"
            textWrap="balance">
            {t('intro')}
          </Text>
          <HStack gap={3} wrap="wrap" justify="center">
            <Button
              href="/sign-up"
              variant="primary"
              label={t('primaryCta')}
            />
            <Button
              href="#product"
              variant="secondary"
              label={t('secondaryCta')}
            />
          </HStack>
          <Text type="supporting" justify="center">
            {t('audiences')}
          </Text>
        </Stack>
      </Center>
    </Section>
  );
}

export function SiteFooter() {
  const t = useTranslations('LandingPage.footer');

  return (
    <footer>
      <Section
        variant="section"
        paddingBlock={8}
        paddingInline={6}
        dividers={['top']}>
        <Center axis="horizontal">
          <Stack width="100%" maxWidth={1120} gap={6}>
            <Grid columns={{minWidth: 220, max: 4, repeat: 'fit'}} gap={6}>
              <Stack gap={2}>
                <Text type="large" weight="semibold">
                  Emma & Éléa
                </Text>
                <Text type="supporting">{t('tagline')}</Text>
              </Stack>

              <Stack gap={2}>
                <Text type="label" color="secondary">
                  {t('productTitle')}
                </Text>
                <Link href="#product">{t('product')}</Link>
                <Link href="#benefits">{t('benefits')}</Link>
                <Link href="#reality">{t('reality')}</Link>
              </Stack>

              <Stack gap={2}>
                <Text type="label" color="secondary">
                  {t('accountTitle')}
                </Text>
                <Link href="/sign-in">{t('signIn')}</Link>
                <Link href="/sign-up">{t('signUp')}</Link>
              </Stack>

              <Stack gap={2}>
                <Text type="label" color="secondary">
                  {t('audienceTitle')}
                </Text>
                <Text type="supporting">{t('audience')}</Text>
              </Stack>
            </Grid>

            <Divider />

            <HStack justify="between" wrap="wrap" gap={3}>
              <Text type="supporting">{t('copyright')}</Text>
              <Text type="supporting">{t('madeFor')}</Text>
            </HStack>
          </Stack>
        </Center>
      </Section>
    </footer>
  );
}
