import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, makeParams, SESSION } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    survey: { findFirst: vi.fn() },
    surveySection: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    surveyQuestion: {
      updateMany: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/surveys/[id]/sections/route";
import { PATCH, DELETE } from "@/app/api/surveys/[id]/sections/[sectionId]/route";

const mockSurvey = { id: "survey-1", userId: SESSION.user.id };
const mockSection = { id: "section-1", name: "Sekcja testowa", order: 0, surveyId: "survey-1" };

beforeEach(() => vi.clearAllMocks());

// ── GET /api/surveys/[id]/sections ────────────────────────────────────────

describe("GET /api/surveys/[id]/sections", () => {
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

  it("zwraca listę sekcji", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveySection.findMany).mockResolvedValue([mockSection] as any);
    const res = await GET(makeRequest("GET"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Sekcja testowa");
  });
});

// ── POST /api/surveys/[id]/sections ──────────────────────────────────────

describe("POST /api/surveys/[id]/sections", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { name: "Nowa" }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 gdy brak dostępu", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { name: "Nowa" }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(403);
  });

  it("zwraca 400 gdy brak nazwy", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    const res = await POST(makeRequest("POST", { name: "" }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(400);
  });

  it("tworzy sekcję (201)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveySection.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.surveySection.create).mockResolvedValue(mockSection as any);
    const res = await POST(makeRequest("POST", { name: "Sekcja testowa" }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Sekcja testowa");
  });
});

// ── PATCH /api/surveys/[id]/sections/[sectionId] ─────────────────────────

describe("PATCH /api/surveys/[id]/sections/[sectionId]", () => {
  it("zwraca 403 gdy brak dostępu", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { name: "Nowa" }), makeParams({ id: "survey-1", sectionId: "section-1" }));
    expect(res.status).toBe(403);
  });

  it("zwraca 404 gdy sekcja nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveySection.findFirst).mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { name: "Nowa" }), makeParams({ id: "survey-1", sectionId: "section-1" }));
    expect(res.status).toBe(404);
  });

  it("aktualizuje sekcję", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveySection.findFirst).mockResolvedValue(mockSection as any);
    vi.mocked(prisma.surveySection.update).mockResolvedValue({ ...mockSection, name: "Zmieniona" } as any);
    const res = await PATCH(makeRequest("PATCH", { name: "Zmieniona" }), makeParams({ id: "survey-1", sectionId: "section-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Zmieniona");
  });
});

// ── DELETE /api/surveys/[id]/sections/[sectionId] ─────────────────────────

describe("DELETE /api/surveys/[id]/sections/[sectionId]", () => {
  it("zwraca 403 gdy brak dostępu", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "survey-1", sectionId: "section-1" }));
    expect(res.status).toBe(403);
  });

  it("usuwa sekcję i odłącza pytania", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveySection.findFirst).mockResolvedValue(mockSection as any);
    vi.mocked(prisma.surveyQuestion.updateMany).mockResolvedValue({ count: 0 } as any);
    vi.mocked(prisma.surveySection.delete).mockResolvedValue(mockSection as any);
    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "survey-1", sectionId: "section-1" }));
    expect(res.status).toBe(200);
    expect(prisma.surveyQuestion.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { sectionId: null } })
    );
  });
});
