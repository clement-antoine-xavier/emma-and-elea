import type {McpServer} from "@modelcontextprotocol/server";
import {DomainError} from "@/server/domain/errors";
import {actorFor} from "@/test-utils/actor";
import {registerTools} from "@/server/mcp/server";
import type {McpDeps} from "@/server/mcp/deps";

type RegisteredTool = {
  name: string;
  config: Record<string, unknown>;
  handler: (input: never) => Promise<{
    content: {type: string; text: string}[];
    isError?: boolean;
  }>;
};

function fakeServer() {
  const tools = new Map<string, RegisteredTool>();
  const server = {
    registerTool(
      name: string,
      config: Record<string, unknown>,
      handler: RegisteredTool["handler"],
    ) {
      tools.set(name, {name, config, handler});
    },
  } as unknown as McpServer;

  return {server, tools};
}

function buildTools(actor: ReturnType<typeof actorFor>, deps: McpDeps) {
  const fake = fakeServer();
  registerTools(fake.server, actor, deps);
  return fake.tools;
}

function fakeDeps() {
  const service = () => {
    const methods = new Map<string, jest.Mock>();

    return new Proxy(
      {},
      {
        get: (_target, property: string) => {
          const existing = methods.get(property);
          if (existing) return existing;

          const created = jest.fn(async () => ({}));
          methods.set(property, created);
          return created;
        },
      },
    );
  };

  return {
    catalog: service(),
    customer: service(),
    dailySales: service(),
    dashboard: service(),
    dispatch: service(),
    order: service(),
    planning: service(),
    production: service(),
    purchasing: service(),
    report: service(),
    site: service(),
    stockCount: service(),
    stock: service(),
    supplier: service(),
    team: service(),
  } as unknown as McpDeps;
}

function resultPayload(result: {content: {text: string}[]}) {
  return JSON.parse(result.content[0].text) as Record<string, unknown>;
}

describe("createMcpServer", () => {
  it("registers the read and write chain", () => {
    const tools = buildTools(actorFor("owner"), fakeDeps());

    expect([...tools.keys()]).toEqual(
      expect.arrayContaining([
        "whoami",
        "list_catalog_items",
        "create_catalog_item",
        "list_stock_lots",
        "post_stock_count",
        "create_production_batch",
        "start_production_batch",
        "complete_production_batch",
        "record_waste",
        "create_production_plan",
        "create_batch_from_plan_line",
        "create_order",
        "create_dispatch",
        "post_dispatch",
        "get_reports",
        "get_team",
      ]),
    );
  });

  it("gates writes with the write scope challenge", () => {
    const tools = buildTools(actorFor("owner"), fakeDeps());

    expect(tools.get("create_catalog_item")?.config.scopeChallenge).toBeDefined();
    expect(tools.get("post_dispatch")?.config.scopeChallenge).toBeDefined();
  });

  it("converts a batch payload before calling the service", async () => {
    const deps = fakeDeps();
    const createBatch = deps.production.createBatch as unknown as jest.Mock;
    createBatch.mockResolvedValue({id: "batch_1"});

    const tools = buildTools(actorFor("owner"), deps);

    const result = await tools.get("create_production_batch")!.handler({
      siteId: "site_1",
      recipeVersionId: "rv_1",
      plannedQuantity: "12.5",
      plannedStartAt: "2026-10-28",
      note: "",
    } as never);

    expect(createBatch).toHaveBeenCalledWith(
      expect.objectContaining({organizationId: "org_1"}),
      {
        siteId: "site_1",
        recipeVersionId: "rv_1",
        plannedQuantity: "12.5",
        plannedStartAt: new Date("2026-10-28T00:00:00.000Z"),
        note: null,
      },
    );
    expect(resultPayload(result)).toEqual({id: "batch_1"});
  });

  it("defaults a waste record to now", async () => {
    const deps = fakeDeps();
    const recordWaste = deps.production.recordWaste as unknown as jest.Mock;

    const tools = buildTools(actorFor("owner"), deps);

    await tools.get("record_waste")!.handler({
      lotId: "lot_1",
      lossReasonId: "loss_1",
      quantity: "1",
      reason: "",
      recordedAt: "",
    } as never);

    expect(recordWaste.mock.calls[0][1].recordedAt).toBeInstanceOf(Date);
    expect(recordWaste.mock.calls[0][1].reason).toBeNull();
  });

  it("returns a tool error for a domain failure", async () => {
    const deps = fakeDeps();
    (deps.dispatch.postDispatch as unknown as jest.Mock).mockRejectedValue(
      new DomainError("INVALID_STATE_TRANSITION"),
    );

    const tools = buildTools(actorFor("owner"), deps);

    const result = await tools.get("post_dispatch")!.handler({
      id: "dispatch_1",
    } as never);

    expect(result.isError).toBe(true);
    expect(resultPayload(result)).toEqual({
      error: {code: "INVALID_STATE_TRANSITION", message: "INVALID_STATE_TRANSITION"},
    });
  });
});
