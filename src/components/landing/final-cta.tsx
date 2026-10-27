import {Button} from '@astryxdesign/core/Button';
import {Center} from '@astryxdesign/core/Center';
import {HStack} from '@astryxdesign/core/HStack';
import {Section} from '@astryxdesign/core/Section';
import {Stack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {useTranslations} from 'next-intl';
import {anchorStyle} from '@/components/landing/section-intro';

export function FinalCta() {
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
              href="#how-it-works"
              variant="secondary"
              label={t('secondaryCta')}
            />
          </HStack>
          <Text type="supporting" justify="center">
            {t('reassurance')}
          </Text>
        </Stack>
      </Center>
    </Section>
  );
}
