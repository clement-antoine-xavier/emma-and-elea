import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Center} from '@astryxdesign/core/Center';
import {Divider} from '@astryxdesign/core/Divider';
import {HStack} from '@astryxdesign/core/HStack';
import {Stack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {useTranslations} from 'next-intl';
import {AuthStatus} from '@/components/auth-status';
import {LocaleSwitcher} from '@/components/locale-switcher';

export default function Home() {
  const t = useTranslations('HomePage');

  return (
    <Center minHeight="100vh" padding={8}>
      <Stack gap={6} width="100%" maxWidth={960}>
        <HStack gap={4} align="center" justify="end" wrap="wrap">
          <LocaleSwitcher />
          <AuthStatus />
        </HStack>

        <Stack gap={3} maxWidth={680} align="start">
          <Badge variant="yellow" label={t('badge')} />
          <Heading level={1} type="display-1">
            {t('title')}
          </Heading>
          <Text type="large" color="secondary">
            {t('intro')}
          </Text>
        </Stack>

        <HStack gap={3} wrap="wrap">
          <Button variant="primary" label={t('actions.primary')} />
          <Button variant="secondary" label={t('actions.secondary')} />
          <Button variant="ghost" label={t('actions.ghost')} />
          <Button variant="destructive" label={t('actions.destructive')} />
        </HStack>

        <Divider />

        <HStack gap={4} wrap="wrap" justify="center">
          <Card variant="default" elevation="low" width={440}>
            <Stack gap={2} align="start">
              <Badge variant="neutral" label={t('cards.default.badge')} />
              <Heading level={3}>{t('cards.default.title')}</Heading>
              <Text type="supporting">{t('cards.default.body')}</Text>
            </Stack>
          </Card>
          <Card variant="muted" width={440}>
            <Stack gap={2} align="start">
              <Badge variant="neutral" label={t('cards.muted.badge')} />
              <Heading level={3}>{t('cards.muted.title')}</Heading>
              <Text type="supporting">{t('cards.muted.body')}</Text>
            </Stack>
          </Card>
          <Card variant="yellow" width={440}>
            <Stack gap={2} align="start">
              <Badge variant="yellow" label={t('cards.yellow.badge')} />
              <Heading level={3}>{t('cards.yellow.title')}</Heading>
              <Text type="supporting">{t('cards.yellow.body')}</Text>
            </Stack>
          </Card>
          <Card variant="blue" width={440}>
            <Stack gap={2} align="start">
              <Badge variant="blue" label={t('cards.blue.badge')} />
              <Heading level={3}>{t('cards.blue.title')}</Heading>
              <Text type="supporting">{t('cards.blue.body')}</Text>
            </Stack>
          </Card>
        </HStack>

        <Card variant="default" padding={6}>
          <Stack gap={4}>
            <Heading level={2}>{t('typography.title')}</Heading>
            <Stack gap={1}>
              <Heading level={3}>{t('typography.heading')}</Heading>
              <Text>{t('typography.body')}</Text>
              <Text type="supporting">{t('typography.supporting')}</Text>
            </Stack>
            <HStack gap={2} wrap="wrap">
              <Badge variant="info" label={t('statuses.info')} />
              <Badge variant="success" label={t('statuses.success')} />
              <Badge variant="warning" label={t('statuses.warning')} />
              <Badge variant="error" label={t('statuses.error')} />
              <Badge variant="neutral" label={t('statuses.neutral')} />
            </HStack>
          </Stack>
        </Card>
      </Stack>
    </Center>
  );
}
