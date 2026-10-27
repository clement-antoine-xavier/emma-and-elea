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
      paddingBlock={8}
      paddingInline={6}
      dividers={['bottom']}>
      <Center axis="horizontal">
        <Grid
          columns={{minWidth: 340, max: 2, repeat: 'fit'}}
          gap={8}
          align="center"
          width="100%"
          maxWidth={1120}>
          <Stack gap={6} justify="center">
            <HStack>
              <Badge variant="yellow" label={t('badge')} />
            </HStack>
            <Heading level={1} type="display-2" textWrap="balance">
              {t('title')}
            </Heading>
            <Text type="large" color="secondary" textWrap="balance">
              {t('intro')}
            </Text>
            <HStack gap={3} wrap="wrap">
              <Button
                href="/sign-up"
                variant="primary"
                label={t('primaryCta')}
                endContent={<Icon icon="chevronRight" size="sm" />}
              />
              <Button
                href="#how-it-works"
                variant="secondary"
                label={t('secondaryCta')}
              />
            </HStack>
            <Stack gap={1}>
              <Text type="supporting" color="secondary">
                {t('reassurance')}
              </Text>
              <Text type="supporting" color="secondary">
                {t('audiences')}
              </Text>
            </Stack>
          </Stack>

          <Stack gap={3} justify="center">
            <ProductPreview />
            <Text type="supporting" color="secondary" justify="center">
              {t('previewCaption')}
            </Text>
          </Stack>
        </Grid>
      </Center>
    </Section>
  );
}
