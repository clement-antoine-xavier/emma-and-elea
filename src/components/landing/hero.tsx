import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Center} from '@astryxdesign/core/Center';
import {Grid} from '@astryxdesign/core/Grid';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {Section} from '@astryxdesign/core/Section';
import {Stack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {useTranslations} from 'next-intl';
import {ProductPreview} from '@/components/landing/product-preview';

export function Hero() {
  const t = useTranslations('LandingPage.hero');

  return (
    <Section
      id="top"
      variant="muted"
      paddingBlock={10}
      paddingInline={6}
      dividers={['bottom']}>
      <Center axis="horizontal">
        <Stack width="100%" maxWidth={1120} gap={10}>
          <Stack gap={6} hAlign="center">
            <Badge variant="yellow" label={t('badge')} />
            <Stack gap={3} hAlign="center" maxWidth={780}>
              <Heading
                level={1}
                type="display-2"
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
            </Stack>
            <HStack gap={3} wrap="wrap" justify="center">
              <Button
                href="/sign-up"
                variant="primary"
                label={t('primaryCta')}
                endContent={<Icon icon="chevronRight" size="sm" />}
              />
              <Button
                href="#product"
                variant="secondary"
                label={t('secondaryCta')}
              />
            </HStack>
            <Text type="supporting" color="secondary" justify="center">
              {t('audiences')}
            </Text>
          </Stack>

          <Stack gap={3}>
            <Grid
              columns={{minWidth: 260, max: 3, repeat: 'fit'}}
              gap={4}>
              <ProductPreview />
            </Grid>
            <Text type="supporting" color="secondary" justify="center">
              {t('previewCaption')}
            </Text>
          </Stack>
        </Stack>
      </Center>
    </Section>
  );
}
