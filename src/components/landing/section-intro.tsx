import {Heading, Text} from '@astryxdesign/core/Text';
import {Stack} from '@astryxdesign/core/Stack';

export const anchorStyle = {
  scrollMarginTop: 'calc(var(--spacing-10) + var(--spacing-4))',
};

export function SectionIntro({
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
