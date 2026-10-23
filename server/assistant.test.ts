import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { invokeLLM } from "./_core/llm";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

const mockedInvokeLLM = vi.mocked(invokeLLM);

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "assistant-test-user",
    email: "assistant@example.com",
    name: "Assistente Teste",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("assistant.chat", () => {
  beforeEach(() => mockedInvokeLLM.mockReset());

  it("responde usando o contexto atual e o histórico do usuário", async () => {
    mockedInvokeLLM.mockResolvedValue({
      id: "chat-test",
      created: Date.now(),
      model: "test",
      choices: [{ index: 0, message: { role: "assistant", content: "A produção total é 120 unidades." }, finish_reason: "stop" }],
    });

    const caller = appRouter.createCaller(createContext());
    const result = await caller.assistant.chat({
      context: '{"filtros":"JANEIRO/2026","kpis":{"totalProducao":120}}',
      messages: [{ role: "user", content: "Qual é a produção total?" }],
    });

    expect(result).toEqual({ content: "A produção total é 120 unidades." });
    expect(mockedInvokeLLM).toHaveBeenCalledOnce();
    const request = mockedInvokeLLM.mock.calls[0]?.[0];
    expect(request?.messages[0]?.role).toBe("system");
    expect(String(request?.messages[0]?.content)).toContain("JANEIRO/2026");
    expect(request?.messages.at(-1)).toEqual({ role: "user", content: "Qual é a produção total?" });
  });
});
