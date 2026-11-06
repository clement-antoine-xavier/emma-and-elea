import {agentRepository} from "@/server/repositories/agent.repository";
import {createFixture, type Fixture} from "@/test-utils/integration/db";

describe("agent repository", () => {
  let fixture: Fixture;

  beforeAll(async () => {
    fixture = await createFixture();
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it("stores a conversation and replaces its UI messages", async () => {
    const conversation = await agentRepository.createConversation({
      organizationId: fixture.organizationId,
      userId: fixture.userId,
      persona: "EMMA",
      title: "Today",
    });

    await agentRepository.appendMessages(conversation.id, [
      {id: "msg_1", role: "user", parts: [{type: "text", text: "Hello"}]},
      {id: "msg_2", role: "assistant", parts: [{type: "text", text: "Hi"}]},
    ]);

    const messages = await agentRepository.getMessages(conversation.id);
    expect(messages).toHaveLength(2);
    expect(messages[0].item).toMatchObject({role: "user"});

    await agentRepository.replaceMessages(conversation.id, [
      {
        id: "msg_1",
        role: "user",
        parts: [{type: "text", text: "Hello again"}],
      },
    ]);

    const replaced = await agentRepository.getMessages(conversation.id);
    expect(replaced).toHaveLength(1);
    expect(replaced[0].item).toMatchObject({
      parts: [{type: "text", text: "Hello again"}],
    });
  });

  it("stores a run and an approval, then resolves it once", async () => {
    const conversation = await agentRepository.createConversation({
      organizationId: fixture.organizationId,
      userId: fixture.userId,
      persona: "ELEA",
      title: null,
    });
    const run = await agentRepository.createRun({
      conversationId: conversation.id,
      persona: "ELEA",
      model: "test-model",
    });

    await agentRepository.updateRun(run.id, {
      status: "AWAITING_APPROVAL",
      state: "serialized-state",
    });

    const [approval] = await agentRepository.createApprovals([
      {
        runId: run.id,
        organizationId: fixture.organizationId,
        userId: fixture.userId,
        callId: "call_1",
        toolName: "post_receipt",
        arguments: {id: "receipt_1"},
        preview: {title: "Post receipt"},
        expiresAt: new Date(Date.now() + 60_000),
      },
    ]);

    expect(
      await agentRepository.listPendingApprovalsForConversation(
        conversation.id,
      ),
    ).toHaveLength(1);

    await expect(
      agentRepository.decideApproval(
        approval.id,
        "APPROVED",
        fixture.userId,
      ),
    ).resolves.toBe(true);
    await expect(
      agentRepository.decideApproval(
        approval.id,
        "APPROVED",
        fixture.userId,
      ),
    ).resolves.toBe(false);

    await agentRepository.finishApproval(approval.id, "EXECUTED");
    const stored = await agentRepository.findApproval(
      fixture.organizationId,
      fixture.userId,
      approval.id,
    );
    expect(stored).toMatchObject({status: "EXECUTED"});
  });

  it("lists conversations per persona and user", async () => {
    const before = await agentRepository.listConversations(
      fixture.organizationId,
      fixture.userId,
      "EMMA",
    );

    await agentRepository.createConversation({
      organizationId: fixture.organizationId,
      userId: fixture.userId,
      persona: "EMMA",
      title: "Newest",
    });

    const after = await agentRepository.listConversations(
      fixture.organizationId,
      fixture.userId,
      "EMMA",
    );
    expect(after[0].title).toBe("Newest");
    expect(after.length).toBe(before.length + 1);
  });
});
