import {Badge} from '@astryxdesign/core/Badge';
import {Card} from '@astryxdesign/core/Card';
import {Divider} from '@astryxdesign/core/Divider';
import {HStack} from '@astryxdesign/core/HStack';
import {Stack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {useTranslations} from 'next-intl';

function PreviewRow({label, value}: {label: string; value: string}) {
  return (
    <HStack justify="between" gap={2}>
      <Text type="supporting">{label}</Text>
      <Text type="supporting" hasTabularNumbers>
        {value}
      </Text>
    </HStack>
  );
}

function CostPanel() {
  const t = useTranslations('LandingPage.hero.preview.cost');

  return (
    <Stack gap={3}>
      <HStack justify="between" align="start" gap={2}>
        <Stack gap={0.5}>
          <Text type="label" color="secondary">
            {t('title')}
          </Text>
          <Text type="large" weight="semibold">
            {t('recipe')}
          </Text>
        </Stack>
        <Badge variant="success" label={t('margin')} />
      </HStack>

      <Divider />

      <Stack gap={2}>
        <PreviewRow label={t('ingredient1')} value={t('value1')} />
        <PreviewRow label={t('ingredient2')} value={t('value2')} />
        <PreviewRow label={t('ingredient3')} value={t('value3')} />
      </Stack>

      <Divider />

      <HStack justify="between" align="center" gap={2}>
        <Text type="supporting">{t('totalLabel')}</Text>
        <Text type="large" weight="semibold" hasTabularNumbers>
          {t('totalValue')}
        </Text>
      </HStack>
    </Stack>
  );
}

function ProductionPanel() {
  const t = useTranslations('LandingPage.hero.preview.production');

  return (
    <Stack gap={3}>
      <HStack justify="between" align="center" gap={2}>
        <Text type="label" color="secondary">
          {t('title')}
        </Text>
        <Badge variant="neutral" label={t('footer1')} />
      </HStack>

      <Stack gap={3}>
        <HStack justify="between" align="center" gap={2}>
          <Stack gap={0.5}>
            <Text>{t('item1')}</Text>
            <Text type="supporting" hasTabularNumbers>
              {t('qty1')}
            </Text>
          </Stack>
          <Badge variant="neutral" label={t('status1')} />
        </HStack>

        <HStack justify="between" align="center" gap={2}>
          <Stack gap={0.5}>
            <Text>{t('item2')}</Text>
            <Text type="supporting" hasTabularNumbers>
              {t('qty2')}
            </Text>
          </Stack>
          <Badge variant="info" label={t('status2')} />
        </HStack>

        <HStack justify="between" align="center" gap={2}>
          <Stack gap={0.5}>
            <Text>{t('item3')}</Text>
            <Text type="supporting" hasTabularNumbers>
              {t('qty3')}
            </Text>
          </Stack>
          <Badge variant="success" label={t('status3')} />
        </HStack>
      </Stack>

      <Text type="supporting">{t('footer2')}</Text>
    </Stack>
  );
}

function StockPanel() {
  const t = useTranslations('LandingPage.hero.preview.stock');

  return (
    <Stack gap={3}>
      <HStack justify="between" align="center" gap={2}>
        <Text type="label" color="secondary">
          {t('title')}
        </Text>
        <Badge variant="warning" label={t('footer1')} />
      </HStack>

      <Stack gap={3}>
        <Stack gap={0.5}>
          <HStack justify="between" align="center" gap={2}>
            <Text>{t('item1')}</Text>
            <Badge variant="warning" label={t('alert1')} />
          </HStack>
          <Text type="supporting">{t('detail1')}</Text>
        </Stack>

        <Stack gap={0.5}>
          <HStack justify="between" align="center" gap={2}>
            <Text>{t('item2')}</Text>
            <Badge variant="error" label={t('alert2')} />
          </HStack>
          <Text type="supporting">{t('detail2')}</Text>
        </Stack>

        <Stack gap={0.5}>
          <HStack justify="between" align="center" gap={2}>
            <Text>{t('item3')}</Text>
            <Badge variant="success" label={t('alert3')} />
          </HStack>
          <Text type="supporting">{t('detail3')}</Text>
        </Stack>
      </Stack>

      <Text type="supporting">{t('footer2')}</Text>
    </Stack>
  );
}

export function ProductPreview() {
  const t = useTranslations('LandingPage.hero.preview');

  return (
    <Card padding={0} elevation="low" width="100%">
      <Stack gap={0}>
        <HStack justify="between" align="center" gap={3} padding={4}>
          <Stack gap={0.5}>
            <Text type="label" weight="semibold">
              {t('workspace')}
            </Text>
            <Text type="supporting" color="secondary">
              {t('date')}
            </Text>
          </Stack>
          <Badge variant="neutral" label={t('badge')} />
        </HStack>

        <Divider />

        <Stack padding={4}>
          <CostPanel />
        </Stack>

        <Divider />

        <Stack padding={4}>
          <ProductionPanel />
        </Stack>

        <Divider />

        <Stack padding={4}>
          <StockPanel />
        </Stack>
      </Stack>
    </Card>
  );
}
