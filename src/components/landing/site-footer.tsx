import {Badge} from '@astryxdesign/core/Badge';
import {Center} from '@astryxdesign/core/Center';
import {Divider} from '@astryxdesign/core/Divider';
import {Grid} from '@astryxdesign/core/Grid';
import {HStack} from '@astryxdesign/core/HStack';
import {Link} from '@astryxdesign/core/Link';
import {Section} from '@astryxdesign/core/Section';
import {Stack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {useTranslations} from 'next-intl';

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
            <Grid columns={{minWidth: 200, max: 4, repeat: 'fit'}} gap={6}>
              <Stack gap={2}>
                <Text type="large" weight="semibold">
                  Emma & Éléa
                </Text>
                <Text type="supporting">{t('tagline')}</Text>
                <HStack>
                  <Badge variant="neutral" label={t('earlyAccess')} />
                </HStack>
              </Stack>

              <Stack gap={2}>
                <Text type="label" color="secondary">
                  {t('exploreTitle')}
                </Text>
                <Link href="#product">{t('product')}</Link>
                <Link href="#how-it-works">{t('howItWorks')}</Link>
                <Link href="#pricing">{t('pricing')}</Link>
                <Link href="#faq">{t('faq')}</Link>
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
                  {t('trustTitle')}
                </Text>
                <Link href="#faq">{t('dataSecurity')}</Link>
                <Link href="#pricing">{t('earlyAccessLink')}</Link>
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
