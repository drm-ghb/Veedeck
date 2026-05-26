import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, makeParams } from "../helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    survey: { findFirst: vi.fn() },
    surveyResponse: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    surveyAnswer: { deleteMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/email", () => ({
  notifyDesignerSurveySubmitted: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import { POST as startPost } from "@/app/api/share/survey/[token]/start/route";
import { PUT as responsePut, POST as responsePost } from "@/app/api/share/survey/[token]/response/route";

const TOKEN = "share-token-abc";
const RESPONSE_ID = "response-1";
const USER_EMAIL = "klient@test.com";

const mockSurvey = {
  id: "survey-1",
  shareToken: TOKEN,
  status: "ACTIVE",
  questions: [{ id: "q-1", order: 0 }],
  sections: [],
};

const mockResponse = {
  id: RESPONSE_ID,
  completedAt: null,
  survey: { shareToken: TOKEN, status: "ACTIVE" },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation(async (ops: any) => {
    if (Array.isArray(ops)) return Promise.all(ops);
    return ops;
  });
});

// ── POST /api/share/survey/[token]/start ─────────────────────────────────────

describe("POST /api/share/survey/[token]/start", () => {
  it("zwraca 404 gdy ankieta nie istnieje", async () => {
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(null);
    const res = await startPost(makeRequest("POST", { email: USER_EMAIL }), makeParams({ token: TOKEN }));
    expect(res.status).toBe(404);
  });

  it("zwraca 404 gdy ankieta nie jest ACTIVE", async () => {
    vi.mocked(prisma.survey.findFirst).mockResolvedValue({ ...mockSurvey, status: "DRAFT" } as any);
    const res = await startPost(makeRequest("POST", { email: USER_EMAIL }), makeParams({ token: TOKEN }));
    expect(res.status).toBe(404);
  });

  it("zwraca 400 gdy brak emaila", async () => {
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    const res = await startPost(makeRequest("POST", {}), makeParams({ token: TOKEN }));
    expect(res.status).toBe(400);
  });

  it("tworzy nowy response dla nowego emaila", async () => {
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveyResponse.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.surveyResponse.create).mockResolvedValue({ id: RESPONSE_ID } as any);
    const res = await startPost(makeRequest("POST", { email: USER_EMAIL }), makeParams({ token: TOKEN }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.responseId).toBe(RESPONSE_ID);
    expect(body.completed).toBe(false);
    expect(body.existingAnswers).toEqual([]);
  });

  it("zwraca completed:true gdy email już wypełnił ankietę", async () => {
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveyResponse.findFirst).mockResolvedValue({
      id: RESPONSE_ID,
      completedAt: new Date(),
      answers: [{ id: "a-1", questionId: "q-1", value: "odpowiedź" }],
    } as any);
    const res = await startPost(makeRequest("POST", { email: USER_EMAIL }), makeParams({ token: TOKEN }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.completed).toBe(true);
    expect(body.responseId).toBe(RESPONSE_ID);
  });

  it("wznawia częściowo zapisaną odpowiedź", async () => {
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveyResponse.findFirst).mockResolvedValue({
      id: RESPONSE_ID,
      completedAt: null,
      answers: [{ id: "a-1", questionId: "q-1", value: "draft" }],
    } as any);
    const res = await startPost(makeRequest("POST", { email: USER_EMAIL }), makeParams({ token: TOKEN }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.completed).toBe(false);
    expect(body.existingAnswers).toHaveLength(1);
  });
});

// ── PUT /api/share/survey/[token]/response ────────────────────────────────────

describe("PUT /api/share/survey/[token]/response (partial save)", () => {
  it("zwraca 400 gdy brak responseId", async () => {
    const res = await responsePut(makeRequest("PUT", { answers: [] }), makeParams({ token: TOKEN }));
    expect(res.status).toBe(400);
  });

  it("zwraca 404 gdy response nie istnieje lub token nie pasuje", async () => {
    vi.mocked(prisma.surveyResponse.findFirst).mockResolvedValue(null);
    const res = await responsePut(makeRequest("PUT", { responseId: RESPONSE_ID, answers: [] }), makeParams({ token: TOKEN }));
    expect(res.status).toBe(404);
  });

  it("zapisuje odpowiedzi częściowo", async () => {
    vi.mocked(prisma.surveyResponse.findFirst).mockResolvedValue(mockResponse as any);
    vi.mocked(prisma.surveyAnswer.deleteMany).mockResolvedValue({ count: 0 } as any);
    vi.mocked(prisma.surveyAnswer.createMany).mockResolvedValue({ count: 1 } as any);
    const res = await responsePut(
      makeRequest("PUT", { responseId: RESPONSE_ID, answers: [{ questionId: "q-1", value: "odpowiedź" }] }),
      makeParams({ token: TOKEN })
    );
    expect(res.status).toBe(200);
  });
});

// ── POST /api/share/survey/[token]/response ───────────────────────────────────

describe("POST /api/share/survey/[token]/response (finalizacja)", () => {
  it("finalizuje odpowiedź i ustawia completedAt", async () => {
    vi.mocked(prisma.surveyResponse.findFirst).mockResolvedValue(mockResponse as any);
    vi.mocked(prisma.surveyAnswer.deleteMany).mockResolvedValue({ count: 0 } as any);
    vi.mocked(prisma.surveyAnswer.createMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(prisma.surveyResponse.update).mockResolvedValue({
      id: RESPONSE_ID,
      respondentEmail: USER_EMAIL,
      respondentName: null,
      survey: { id: "survey-1", name: "Ankieta", user: { email: "projektant@test.com" } },
    } as any);
    const res = await responsePost(
      makeRequest("POST", { responseId: RESPONSE_ID, answers: [{ questionId: "q-1", value: "tak" }] }),
      makeParams({ token: TOKEN })
    );
    expect(res.status).toBe(200);
    expect(prisma.surveyResponse.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: RESPONSE_ID } })
    );
  });

  it("zwraca 409 gdy ankieta już wysłana", async () => {
    vi.mocked(prisma.surveyResponse.findFirst).mockResolvedValue({
      ...mockResponse,
      completedAt: new Date(),
    } as any);
    const res = await responsePost(
      makeRequest("POST", { responseId: RESPONSE_ID, answers: [] }),
      makeParams({ token: TOKEN })
    );
    expect(res.status).toBe(409);
  });
});
