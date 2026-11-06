import {Center} from "@astryxdesign/core/Center";
import {Spinner} from "@astryxdesign/core/Spinner";

/**
 * Shared fallback for dashboard routes. The dashboard chrome is already
 * mounted, so the route only needs to indicate that its request data is
 * streaming in.
 */
export function PageLoading() {
  return (
    <Center minHeight="60vh" padding={8}>
      <span data-testid="page-loading">
        <Spinner size="lg" />
      </span>
    </Center>
  );
}
