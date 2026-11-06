import {Center} from "@astryxdesign/core/Center";
import {Spinner} from "@astryxdesign/core/Spinner";

/**
 * Fallback shown while the assistant route resolves the session and transcript.
 * It keeps the page frame in the static shell so client navigations render
 * immediately instead of waiting for the request.
 */
export function AssistantLoading() {
  return (
    <Center minHeight="100%" padding={8}>
      <Spinner size="lg" />
    </Center>
  );
}
