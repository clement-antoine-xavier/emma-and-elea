import type {AssistantStreamEvent} from "./assistant";

const DEFAULT_ERROR = "The assistant is unavailable.";

/**
 * Parse every complete `data:` block in a buffer and keep the trailing
 * fragment for the next chunk. Server-Sent Events separate blocks with a
 * blank line; each assistant event carries one JSON payload.
 */
export function parseAssistantSseBuffer(buffer: string): {
  events: AssistantStreamEvent[];
  rest: string;
} {
  const events: AssistantStreamEvent[] = [];
  let rest = buffer.replaceAll("\r\n", "\n");
  let boundary = rest.indexOf("\n\n");

  while (boundary >= 0) {
    const chunk = rest.slice(0, boundary);
    rest = rest.slice(boundary + 2);

    const data = chunk
      .split("\n")
      .filter((line) => line.startsWith("data: "))
      .map((line) => line.slice(6))
      .join("\n");

    if (data) events.push(JSON.parse(data) as AssistantStreamEvent);
    boundary = rest.indexOf("\n\n");
  }

  return {events, rest};
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {error?: string};
    return body.error ?? DEFAULT_ERROR;
  } catch {
    return DEFAULT_ERROR;
  }
}

/**
 * Consume the assistant SSE response until the stream closes, invoking the
 * callback for every decoded event. Throws when the response is not ok so the
 * caller can show the existing error banner.
 */
export async function readAssistantEventStream(
  response: Response,
  onEvent: (event: AssistantStreamEvent) => void,
): Promise<void> {
  if (!response.ok || !response.body) {
    throw new Error(await errorMessage(response));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const {value, done} = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, {stream: true});
    const parsed = parseAssistantSseBuffer(buffer);
    buffer = parsed.rest;
    for (const event of parsed.events) onEvent(event);
  }

  const tail = decoder.decode();
  if (tail) {
    const parsed = parseAssistantSseBuffer(buffer + tail);
    for (const event of parsed.events) onEvent(event);
  }
}
