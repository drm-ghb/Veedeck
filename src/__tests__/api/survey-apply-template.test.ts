import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, makeParams, SESSION } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    survey: { findFirst: vi.fn() },
    surveyQuestion: { count: vi.fn() },
    surveySection: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/surveys/[id]/apply-template/route";

const mockSurvey = { id: "survey-1", userId: SESSION.user.id };

beforeEach(() => vi.clearAllMocks());

describe("POST /api/surveys/[id]/apply-template", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { templateId: "onboarding" }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 gdy brak dostępu do ankiety", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { templateId: "onboarding" }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(403);
  });

  it("zwraca 400 gdy nieznany templateId", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    const res = await POST(makeRequest("POST", { templateId: "nieistniejący" }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(400);
  });

  it("zwraca 409 gdy ankieta ma już pytania", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveyQuestion.count).mockResolvedValue(3);
    const res = await POST(makeRequest("POST", { templateId: "onboarding" }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(409);
  });

  it("tworzy pytania z szablonu onboarding", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveyQuestion.count).mockResolvedValue(0);
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined);
    vi.mocked(prisma.surveySection.findMany).mockResolvedValue([]);
    // surveyQuestion.findMany is not mocked — apply-template route uses separate queries
    const { prisma: p } = await import("@/lib/prisma");
    (p as any).surveyQuestion.findMany = vi.fn().mockResolvedValue([]);

    const res = await POST(makeRequest("POST", { templateId: "onboarding" }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("tworzy pytania z szablonu ocena", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveyQuestion.count).mockResolvedValue(0);
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined);
    vi.mocked(prisma.surveySection.findMany).mockResolvedValue([]);
    const { prisma: p } = await import("@/lib/prisma");
    (p as any).surveyQuestion.findMany = vi.fn().mockResolvedValue([]);

    const res = await POST(makeRequest("POST", { templateId: "ocena" }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(200);
  });

  it("tworzy pytania z szablonu koncept", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveyQuestion.count).mockResolvedValue(0);
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined);
    vi.mocked(prisma.surveySection.findMany).mockResolvedValue([]);
    const { prisma: p } = await import("@/lib/prisma");
    (p as any).surveyQuestion.findMany = vi.fn().mockResolvedValue([]);

    const res = await POST(makeRequest("POST", { templateId: "koncept" }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(200);
  });
});
