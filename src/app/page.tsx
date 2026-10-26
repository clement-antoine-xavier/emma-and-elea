import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Center} from '@astryxdesign/core/Center';
import {Divider} from '@astryxdesign/core/Divider';
import {HStack} from '@astryxdesign/core/HStack';
import {Stack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {AuthStatus} from '@/components/auth-status';

export default function Home() {
  return (
    <Center minHeight="100vh" padding={8}>
      <Stack gap={6} width="100%" maxWidth={960}>
        <Stack gap={3} maxWidth={680} align="start">
          <HStack gap={3} align="center" wrap="wrap">
            <Badge variant="yellow" label="Butter theme" />
            <AuthStatus />
          </HStack>
          <Heading level={1} type="display-1">
            Warm, creamy, quietly playful.
          </Heading>
          <Text type="large" color="secondary">
            Soft golden surfaces with a friendly blue accent. This page exists
            only to judge the theme: palette, typography, surfaces, and
            controls.
          </Text>
        </Stack>

        <HStack gap={3} wrap="wrap">
          <Button variant="primary" label="Primary action" />
          <Button variant="secondary" label="Secondary" />
          <Button variant="ghost" label="Ghost" />
          <Button variant="destructive" label="Destructive" />
        </HStack>

        <Divider />

        <HStack gap={4} wrap="wrap" justify="center">
          <Card variant="default" elevation="low" width={440}>
            <Stack gap={2} align="start">
              <Badge variant="neutral" label="Default" />
              <Heading level={3}>Standard surface</Heading>
              <Text type="supporting">
                Cards, text, and controls inherit the theme&apos;s tokens.
              </Text>
            </Stack>
          </Card>
          <Card variant="muted" width={440}>
            <Stack gap={2} align="start">
              <Badge variant="neutral" label="Muted" />
              <Heading level={3}>Quiet surface</Heading>
              <Text type="supporting">
                De-emphasized areas sit slightly behind the main surface.
              </Text>
            </Stack>
          </Card>
          <Card variant="yellow" width={440}>
            <Stack gap={2} align="start">
              <Badge variant="yellow" label="Yellow" />
              <Heading level={3}>Butter accent</Heading>
              <Text type="supporting">
                The signature warm tone, used sparingly for emphasis.
              </Text>
            </Stack>
          </Card>
          <Card variant="blue" width={440}>
            <Stack gap={2} align="start">
              <Badge variant="blue" label="Blue" />
              <Heading level={3}>Friendly accent</Heading>
              <Text type="supporting">
                A clear blue for actions, links, and selected states.
              </Text>
            </Stack>
          </Card>
        </HStack>

        <Card variant="default" padding={6}>
          <Stack gap={4}>
            <Heading level={2}>Typography and status colors</Heading>
            <Stack gap={1}>
              <Heading level={3}>Heading three</Heading>
              <Text>
                Body text is set in the theme&apos;s body family with
                comfortable line height. Inline links and buttons pick up the
                accent.
              </Text>
              <Text type="supporting">
                Supporting text is one step quieter, for captions and metadata.
              </Text>
            </Stack>
            <HStack gap={2} wrap="wrap">
              <Badge variant="info" label="Info" />
              <Badge variant="success" label="Success" />
              <Badge variant="warning" label="Warning" />
              <Badge variant="error" label="Error" />
              <Badge variant="neutral" label="Neutral" />
            </HStack>
          </Stack>
        </Card>
      </Stack>
    </Center>
  );
}
