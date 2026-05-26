import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, makeParams, SESSION } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    survey: { findFirst: vi.fn() },
    surveyResponse: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/workspace", () => ({
  getWorkspaceUserId: (s: any) => s.user.id,
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/surveys/[id]/export/route";

const mockSurvey = {
  id: "survey-1",
  userId: SESSION.user.id,
  name: "Ankieta testowa",
  questions: [
    { id: "q-1", label: "Pytanie 1", type: "short_text", order: 0 },
    { id: "q-2", label: "Ocena", type: "rating", order: 1 },
  ],
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/surveys/[id]/export", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET(makeRequest("GET"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 gdy ankieta nie należy do użytkownika", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(null);
    const res = await GET(makeRequest("GET"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(403);
  });

  it("zwraca plik CSV z nagłówkami i danymi", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveyResponse.findMany).mockResolvedValue([
      {
        id: "resp-1",
        respondentEmail: "klient@test.com",
        respondentName: "Jan Kowalski",
        completedAt: new Date("2026-01-15T10:00:00Z"),
        answers: [
          { questionId: "q-1", value: "dobra praca" },
          { questionId: "q-2", value: 4 },
        ],
      },
    ] as any);

    const res = await GET(makeRequest("GET"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");

    const text = await res.text();
    expect(text).toContain("Email");
    expect(text).toContain("Pytanie 1");
    expect(text).toContain("Ocena");
    expect(text).toContain("klient@test.com");
    expect(text).toContain("Jan Kowalski");
    expect(text).toContain("dobra praca");
    expect(text).toContain("4");
  });

  it("zwraca CSV z pustymi polami gdy brak odpowiedzi na pytanie", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveyResponse.findMany).mockResolvedValue([
      {
        id: "resp-1",
        respondentEmail: "klient@test.com",
        respondentName: null,
        completedAt: new Date("2026-01-15"),
        answers: [{ questionId: "q-1", value: "odpowiedź" }],
      },
    ] as any);

    const res = await GET(makeRequest("GET"), makeParams({ id: "survey-1" }));
    const text = await res.text();
    const rows = text.trim().split("\n");
    expect(rows).toHaveLength(2); // header + 1 row
  });
});
