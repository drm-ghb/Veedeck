import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, makeParams, SESSION } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/slug", () => ({ uniqueSlug: vi.fn().mockResolvedValue("test-slug") }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    survey: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    surveyResponse: {
      count: vi.fn(),
    },
    project: { findFirst: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/surveys/route";
import { GET as GET_ID, PATCH, DELETE } from "@/app/api/surveys/[id]/route";
import { POST as ARCHIVE } from "@/app/api/surveys/[id]/archive/route";
import { POST as PIN } from "@/app/api/surveys/[id]/pin/route";

const mockSurvey = {
  id: "survey-1",
  name: "Ankieta testowa",
  slug: "test-slug",
  shareToken: "share-token-1",
  status: "DRAFT",
  archived: false,
  pinned: false,
  order: 0,
  userId: SESSION.user.id,
  projectId: null,
  clientId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => vi.clearAllMocks());

// ── GET /api/surveys ───────────────────────────────────────────────────────

describe("GET /api/surveys", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("zwraca listę ankiet użytkownika", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findMany).mockResolvedValue([mockSurvey] as any);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Ankieta testowa");
  });
});

// ── POST /api/surveys ──────────────────────────────────────────────────────

describe("POST /api/surveys", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { name: "Nowa" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 400 gdy brak nazwy", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    const res = await POST(makeRequest("POST", { name: "" }));
    expect(res.status).toBe(400);
  });

  it("tworzy ankietę (201) ze statusem DRAFT", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.create).mockResolvedValue(mockSurvey as any);

    const res = await POST(makeRequest("POST", { name: "Nowa ankieta" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Ankieta testowa");
    expect(body.status).toBe("DRAFT");
  });

  it("zwraca 403 gdy projectId nie należy do użytkownika", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(null);

    const res = await POST(makeRequest("POST", { name: "Ankieta", projectId: "proj-x" }));
    expect(res.status).toBe(403);
  });

  it("tworzy ankietę z projektem", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue({ id: "proj-1" } as any);
    vi.mocked(prisma.survey.create).mockResolvedValue({ ...mockSurvey, projectId: "proj-1" } as any);

    const res = await POST(makeRequest("POST", { name: "Ankieta", projectId: "proj-1" }));
    expect(res.status).toBe(201);
  });
});

// ── GET /api/surveys/[id] ─────────────────────────────────────────────────

describe("GET /api/surveys/[id]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET_ID(makeRequest("GET"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy ankieta nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(null);
    const res = await GET_ID(makeRequest("GET"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(404);
  });

  it("zwraca szczegóły ankiety", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    const res = await GET_ID(makeRequest("GET"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("survey-1");
  });
});

// ── PATCH /api/surveys/[id] ───────────────────────────────────────────────

describe("PATCH /api/surveys/[id]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { name: "Nowa" }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy ankieta nie należy do użytkownika", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { name: "Nowa" }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(404);
  });

  it("aktualizuje ankietę", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.survey.update).mockResolvedValue({ ...mockSurvey, name: "Zmieniona" } as any);

    const res = await PATCH(makeRequest("PATCH", { name: "Zmieniona" }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Zmieniona");
  });

  it("zmienia status ankiety", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.survey.update).mockResolvedValue({ ...mockSurvey, status: "ACTIVE" } as any);

    const res = await PATCH(makeRequest("PATCH", { status: "ACTIVE" }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(200);
    expect(prisma.survey.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "ACTIVE" }) })
    );
  });
});

// ── DELETE /api/surveys/[id] ──────────────────────────────────────────────

describe("DELETE /api/surveys/[id]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy ankieta nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(404);
  });

  it("zwraca 409 gdy są wypełnione odpowiedzi", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveyResponse.count).mockResolvedValue(2);

    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(409);
  });

  it("usuwa ankietę gdy brak wypełnionych odpowiedzi", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.surveyResponse.count).mockResolvedValue(0);
    vi.mocked(prisma.survey.delete).mockResolvedValue(mockSurvey as any);

    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ── POST /api/surveys/[id]/archive ────────────────────────────────────────

describe("POST /api/surveys/[id]/archive", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await ARCHIVE(makeRequest("POST"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy ankieta nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(null);
    const res = await ARCHIVE(makeRequest("POST"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(404);
  });

  it("przełącza archived", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.survey.update).mockResolvedValue({ ...mockSurvey, archived: true } as any);

    const res = await ARCHIVE(makeRequest("POST"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(200);
    expect(prisma.survey.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { archived: true } })
    );
  });
});

// ── POST /api/surveys/[id]/pin ────────────────────────────────────────────

describe("POST /api/surveys/[id]/pin", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PIN(makeRequest("POST"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy ankieta nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(null);
    const res = await PIN(makeRequest("POST"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(404);
  });

  it("przełącza pinned", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.survey.update).mockResolvedValue({ ...mockSurvey, pinned: true } as any);

    const res = await PIN(makeRequest("POST"), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(200);
    expect(prisma.survey.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { pinned: true } })
    );
  });
});
