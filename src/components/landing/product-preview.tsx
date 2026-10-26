import {AspectRatio} from '@astryxdesign/core/AspectRatio';
import {Badge} from '@astryxdesign/core/Badge';
import {Card} from '@astryxdesign/core/Card';
import {Divider} from '@astryxdesign/core/Divider';
import {HStack} from '@astryxdesign/core/HStack';
import {Stack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';

type PreviewCardVariant = 'default' | 'yellow';

function TileFrame({
  variant,
  children,
}: {
  variant: PreviewCardVariant;
  children: ReactNode;
}) {
  return (
    <AspectRatio ratio={4 / 5}>
      <Card variant={variant} padding={4} width="100%" height="100%">
        <Stack height="100%" justify="between" gap={3}>
          {children}
        </Stack>
      </Card>
    </AspectRatio>
  );
}

function PreviewEyebrow() {
  const t = useTranslations('LandingPage.hero.preview');

  return (
    <HStack>
      <Badge variant="neutral" label={t('badge')} />
    </HStack>
  );
}

function CostPreview() {
  const t = useTranslations('LandingPage.hero.preview.cost');

  return (
    <TileFrame variant="yellow">
      <Stack gap={3}>
        <PreviewEyebrow />
        <Stack gap={1}>
          <Text type="label" color="secondary">
            {t('title')}
          </Text>
          <Text type="large" weight="semibold">
            {t('recipe')}
          </Text>
        </Stack>
        <Divider />
        <Stack gap={2}>
          <HStack justify="between" gap={2}>
            <Text type="supporting">{t('ingredient1')}</Text>
            <Text type="supporting" hasTabularNumbers>
              {t('value1')}
            </Text>
          </HStack>
          <HStack justify="between" gap={2}>
            <Text type="supporting">{t('ingredient2')}</Text>
            <Text type="supporting" hasTabularNumbers>
              {t('value2')}
            </Text>
          </HStack>
          <HStack justify="between" gap={2}>
            <Text type="supporting">{t('ingredient3')}</Text>
            <Text type="supporting" hasTabularNumbers>
              {t('value3')}
            </Text>
          </HStack>
        </Stack>
      </Stack>

      <Stack gap={2}>
        <Divider />
        <HStack justify="between" align="center" gap={2}>
          <Stack gap={0.5}>
            <Text type="supporting">{t('totalLabel')}</Text>
            <Text type="large" weight="semibold" hasTabularNumbers>
              {t('totalValue')}
            </Text>
          </Stack>
          <Badge variant="success" label={t('margin')} />
        </HStack>
      </Stack>
    </TileFrame>
  );
}

function ProductionPreview() {
  const t = useTranslations('LandingPage.hero.preview.production');

  return (
    <TileFrame variant="default">
      <Stack gap={3}>
        <PreviewEyebrow />
        <Stack gap={1}>
          <Text type="label" color="secondary">
            {t('title')}
          </Text>
          <Text type="large" weight="semibold">
            {t('date')}
          </Text>
        </Stack>
        <Divider />
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
      </Stack>

      <Stack gap={2}>
        <Divider />
        <HStack justify="between" gap={2}>
          <Text type="supporting">{t('footer1')}</Text>
          <Text type="supporting">{t('footer2')}</Text>
        </HStack>
      </Stack>
    </TileFrame>
  );
}

function StockPreview() {
  const t = useTranslations('LandingPage.hero.preview.stock');

  return (
    <TileFrame variant="default">
      <Stack gap={3}>
        <PreviewEyebrow />
        <Stack gap={1}>
          <Text type="label" color="secondary">
            {t('title')}
          </Text>
          <Text type="large" weight="semibold">
            {t('subtitle')}
          </Text>
        </Stack>
        <Divider />
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
      </Stack>

      <Stack gap={2}>
        <Divider />
        <HStack justify="between" align="center" gap={2}>
          <Badge variant="warning" label={t('footer1')} />
          <Text type="supporting">{t('footer2')}</Text>
        </HStack>
      </Stack>
    </TileFrame>
  );
}

export function ProductPreview() {
  return (
    <>
      <CostPreview />
      <ProductionPreview />
      <StockPreview />
    </>
  );
}
