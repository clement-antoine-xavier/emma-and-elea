import {Badge} from '@astryxdesign/core/Badge';
import {Center} from '@astryxdesign/core/Center';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {Section} from '@astryxdesign/core/Section';
import {Text} from '@astryxdesign/core/Text';
import {useTranslations} from 'next-intl';

const trustIds = ['audience', 'devices', 'payment'] as const;

export function TrustBar() {
  const t = useTranslations('LandingPage.trust');

  return (
    <Section
      variant="section"
      paddingBlock={4}
      paddingInline={6}
      dividers={['bottom']}>
      <Center axis="horizontal">
        <HStack gap={6} wrap="wrap" justify="center" align="center">
          <Badge variant="yellow" label={t('badge')} />
          {trustIds.map((id) => (
            <HStack key={id} gap={2} align="center">
              <Icon icon="check" color="success" size="sm" />
              <Text type="supporting">{t(`items.${id}`)}</Text>
            </HStack>
          ))}
        </HStack>
      </Center>
    </Section>
  );
}
