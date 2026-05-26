import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, makeParams, SESSION } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    survey: { findFirst: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("@/lib/workspace", () => ({
  getWorkspaceUserId: (s: any) => s.user.id,
}));
vi.mock("@/lib/email", () => ({
  sendSurveyReminderEmail: vi.fn().mockResolvedValue(undefined),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSurveyReminderEmail } from "@/lib/email";
import { POST } from "@/app/api/surveys/[id]/remind/route";

const mockSurvey = {
  id: "survey-1",
  userId: SESSION.user.id,
  name: "Ankieta testowa",
  shareToken: "tok-abc",
  lastReminderAt: null,
};

beforeEach(() => vi.clearAllMocks());

describe("POST /api/surveys/[id]/remind", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { emails: ["a@b.com"] }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 gdy ankieta nie należy do użytkownika", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { emails: ["a@b.com"] }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(403);
  });

  it("zwraca 429 gdy ostatnie przypomnienie było mniej niż 24h temu", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue({
      ...mockSurvey,
      lastReminderAt: new Date(), // just now
    } as any);
    const res = await POST(makeRequest("POST", { emails: ["a@b.com"] }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(429);
  });

  it("zwraca 400 gdy brak emaili", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    const res = await POST(makeRequest("POST", { emails: [] }), makeParams({ id: "survey-1" }));
    expect(res.status).toBe(400);
  });

  it("wysyła przypomnienia i aktualizuje lastReminderAt", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.survey.findFirst).mockResolvedValue(mockSurvey as any);
    vi.mocked(prisma.survey.update).mockResolvedValue(mockSurvey as any);
    const res = await POST(
      makeRequest("POST", { emails: ["klient@test.com", "inny@test.com"] }),
      makeParams({ id: "survey-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(2);
    expect(prisma.survey.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "survey-1" } })
    );
    expect(sendSurveyReminderEmail).toHaveBeenCalledTimes(2);
  });

  it("pozwala wysłać po upływie 24h", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    const pastDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h ago
    vi.mocked(prisma.survey.findFirst).mockResolvedValue({
      ...mockSurvey,
      lastReminderAt: pastDate,
    } as any);
    vi.mocked(prisma.survey.update).mockResolvedValue(mockSurvey as any);
    const res = await POST(
      makeRequest("POST", { emails: ["klient@test.com"] }),
      makeParams({ id: "survey-1" })
    );
    expect(res.status).toBe(200);
  });
});
