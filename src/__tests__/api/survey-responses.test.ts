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
import { GET } from "@/app/api/surveys/[id]/responses/route";

const mockSurvey = {
  id: "survey-1",
  userId: SESSION.user.id,
  name: "Ankieta testowa",
  questions: [{ id: "q-1", label: "Pytanie 1", type: "short_text", order: 0 }],
  sections: [],
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/surveys/[id]/responses", () => {
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

  it("zwraca listę ukończonych odpowiedzi", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveyResponse.findMany).mockResolvedValue([
      {
        id: "resp-1",
        respondentEmail: "klient@test.com",
        respondentName: "Jan Kowalski",
        completedAt: new Date("2026-01-01"),
        answers: [],
      },
    ] as any);
    const res = await GET(makeRequest("GET"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.responses).toHaveLength(1);
    expect(body.survey.name).toBe("Ankieta testowa");
  });

  it("zwraca tylko ukończone odpowiedzi (completedAt: not null)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveyResponse.findMany).mockResolvedValue([]);
    await GET(makeRequest("GET"), makeParams({ id: "survey-1" }));
    expect(prisma.surveyResponse.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ completedAt: { not: null } }),
      })
    );
  });
});
