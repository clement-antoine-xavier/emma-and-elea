import {TextDecoder, TextEncoder} from "node:util";
import {
  parseAssistantSseBuffer,
  readAssistantEventStream,
} from "./assistant-stream";
import type {AssistantStreamEvent} from "./assistant";

// jsdom does not expose the Encoding API; the stream parser uses the runtime
// globals, so provide Node's implementation for this suite.
Object.defineProperty(globalThis, "TextEncoder", {
  value: TextEncoder,
  configurable: true,
});
Object.defineProperty(globalThis, "TextDecoder", {
  value: TextDecoder,
  configurable: true,
});

function encodeChunks(chunks: string[]): Response {
  const encoder = new TextEncoder();
  let index = 0;

  return {
    ok: true,
    body: {
      getReader() {
        return {
          async read() {
            if (index >= chunks.length) {
              return {done: true, value: undefined};
            }
            const value = encoder.encode(chunks[index]);
            index += 1;
            return {done: false, value};
          },
        };
      },
    },
  } as unknown as Response;
}

test("parses complete events and keeps the trailing fragment", () => {
  const parsed = parseAssistantSseBuffer(
    'event: text\ndata: {"type":"text","delta":"Hel"}\n\nevent: text\ndata: {"type":"text","delta":"lo"}',
  );

  expect(parsed.events).toEqual([
    {type: "text", delta: "Hel"},
  ]);
  expect(parsed.rest).toBe('event: text\ndata: {"type":"text","delta":"lo"}');
});

test("normalizes CRLF separators and multi-line data", () => {
  const parsed = parseAssistantSseBuffer(
    'event: start\r\ndata: {"type":"start",\r\ndata: "runId":"run_1",\r\ndata: "conversationId":"conv_1"}\r\n\r\n',
  );

  expect(parsed.events).toEqual([
    {type: "start", runId: "run_1", conversationId: "conv_1"},
  ]);
  expect(parsed.rest).toBe("");
});

test("reads a chunked stream and emits every event", async () => {
  const events: AssistantStreamEvent[] = [];
  const response = encodeChunks([
    'event: text\ndata: {"type":"text","delta":"Hel',
    'lo"}\n\nevent: done\ndata: {"type":"done","runId":"run_1","conversationId":"conv_1"}\n\n',
  ]);

  await readAssistantEventStream(response, (event) => events.push(event));

  expect(events).toEqual([
    {type: "text", delta: "Hello"},
    {type: "done", runId: "run_1", conversationId: "conv_1"},
  ]);
});

test("throws the server error message when the response is not ok", async () => {
  const response = {
    ok: false,
    json: async () => ({error: "ASSISTANT_RATE_LIMITED"}),
  } as unknown as Response;

  await expect(
    readAssistantEventStream(response, () => {}),
  ).rejects.toThrow("ASSISTANT_RATE_LIMITED");
});
