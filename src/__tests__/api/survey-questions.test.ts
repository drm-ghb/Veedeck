import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, makeParams, SESSION } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    survey: { findFirst: vi.fn() },
    surveyQuestion: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/surveys/[id]/questions/route";
import { PATCH, DELETE } from "@/app/api/surveys/[id]/questions/[questionId]/route";
import { POST as REORDER } from "@/app/api/surveys/[id]/questions/reorder/route";

const mockSurvey = { id: "survey-1", userId: SESSION.user.id };
const mockQuestion = {
  id: "q-1",
  label: "Pytanie testowe",
  type: "short_text",
  required: false,
  order: 0,
  description: null,
  options: null,
  config: null,
  sectionId: null,
  surveyId: "survey-1",
};

beforeEach(() => vi.clearAllMocks());

// ── GET /api/surveys/[id]/questions ───────────────────────────────────────

describe("GET /api/surveys/[id]/questions", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET(makeRequest("GET"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy ankieta nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(null);
    const res = await GET(makeRequest("GET"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(404);
  });

  it("zwraca listę pytań", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveyQuestion.findMany).mockResolvedValue([mockQuestion] as any);
    const res = await GET(makeRequest("GET"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });
});

// ── POST /api/surveys/[id]/questions ─────────────────────────────────────

describe("POST /api/surveys/[id]/questions", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { label: "Q", type: "short_text" }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 gdy ankieta nie należy do użytkownika", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { label: "Q", type: "short_text" }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(403);
  });

  it("zwraca 400 gdy brak label", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    const res = await POST(makeRequest("POST", { label: "", type: "short_text" }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(400);
  });

  it("zwraca 400 gdy brak type", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    const res = await POST(makeRequest("POST", { label: "Q" }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(400);
  });

  it("tworzy pytanie (201)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveyQuestion.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.surveyQuestion.create).mockResolvedValue(mockQuestion as any);
    const res = await POST(
      makeRequest("POST", { label: "Pytanie testowe", type: "short_text" }),
      makeParams({ id: "survey-1" })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.label).toBe("Pytanie testowe");
  });

  it("tworzy pytanie z opcjami (single_choice)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveyQuestion.findFirst).mockResolvedValue(null);
    const qWithOptions = { ...mockQuestion, type: "single_choice", options: ["A", "B"] };
    vi.mocked(prisma.surveyQuestion.create).mockResolvedValue(qWithOptions as any);
    const res = await POST(
      makeRequest("POST", { label: "Wybierz", type: "single_choice", options: ["A", "B"] }),
      makeParams({ id: "survey-1" })
    );
    expect(res.status).toBe(201);
  });
});

// ── PATCH /api/surveys/[id]/questions/[questionId] ─────────────────────

describe("PATCH /api/surveys/[id]/questions/[questionId]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { label: "Nowe" }), makeParams({ id: "survey-1", questionId: "q-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 gdy ankieta nie należy do użytkownika", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { label: "Nowe" }), makeParams({ id: "survey-1", questionId: "q-1" }));
    expect(res.status).toBe(403);
  });

  it("zwraca 404 gdy pytanie nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveyQuestion.findFirst).mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { label: "Nowe" }), makeParams({ id: "survey-1", questionId: "q-1" }));
    expect(res.status).toBe(404);
  });

  it("aktualizuje pytanie", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveyQuestion.findFirst).mockResolvedValue(mockQuestion as any);
    vi.mocked(prisma.surveyQuestion.update).mockResolvedValue({ ...mockQuestion, label: "Nowe" } as any);
    const res = await PATCH(makeRequest("PATCH", { label: "Nowe" }), makeParams({ id: "survey-1", questionId: "q-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.label).toBe("Nowe");
  });
});

// ── DELETE /api/surveys/[id]/questions/[questionId] ────────────────────

describe("DELETE /api/surveys/[id]/questions/[questionId]", () => {
  it("zwraca 403 gdy brak dostępu", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "survey-1", questionId: "q-1" }));
    expect(res.status).toBe(403);
  });

  it("usuwa pytanie", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveyQuestion.findFirst).mockResolvedValue(mockQuestion as any);
    vi.mocked(prisma.surveyQuestion.delete).mockResolvedValue(mockQuestion as any);
    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "survey-1", questionId: "q-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ── POST /api/surveys/[id]/questions/reorder ──────────────────────────

describe("POST /api/surveys/[id]/questions/reorder", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await REORDER(makeRequest("POST", { questions: [] }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 gdy brak dostępu", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(null);
    const res = await REORDER(makeRequest("POST", { questions: [] }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(403);
  });

  it("zmienia kolejność pytań", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.$transaction).mockResolvedValue([]);
    const res = await REORDER(
      makeRequest("POST", { questions: [{ id: "q-1", order: 0 }, { id: "q-2", order: 1 }] }),
      makeParams({ id: "survey-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
