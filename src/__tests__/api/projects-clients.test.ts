import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/projects/[id]/clients/route";
import { makeRequest, makeParams, SESSION } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    projectClient: {
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockProject = { id: "proj-1", userId: SESSION.user.id };

beforeEach(() => vi.clearAllMocks());

describe("POST /api/projects/[id]/clients", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { name: "Anna" }), makeParams({ id: "proj-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy projekt nie należy do użytkownika", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(null);

    const res = await POST(makeRequest("POST", { name: "Anna" }), makeParams({ id: "proj-1" }));
    expect(res.status).toBe(404);
  });

  it("zwraca 400 gdy brak imienia", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);

    const res = await POST(makeRequest("POST", { name: "" }), makeParams({ id: "proj-1" }));
    expect(res.status).toBe(400);
  });

  it("tworzy klienta projektu", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);
    vi.mocked(prisma.projectClient.create).mockResolvedValue({
      id: "cl-1",
      name: "Anna",
      email: "anna@test.com",
      isMainContact: false,
      projectId: "proj-1",
    } as any);

    const res = await POST(
      makeRequest("POST", { name: "Anna", email: "anna@test.com" }),
      makeParams({ id: "proj-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Anna");
  });

  it("przy isMainContact=true cofa poprzedni główny kontakt i synchronizuje projekt", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);
    vi.mocked(prisma.projectClient.updateMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(prisma.projectClient.create).mockResolvedValue({
      id: "cl-2",
      name: "Główny Klient",
      email: "glowny@test.com",
      isMainContact: true,
      projectId: "proj-1",
    } as any);
    vi.mocked(prisma.project.update).mockResolvedValue(mockProject as any);

    const res = await POST(
      makeRequest("POST", { name: "Główny Klient", email: "glowny@test.com", isMainContact: true }),
      makeParams({ id: "proj-1" })
    );
    expect(res.status).toBe(200);
    expect(prisma.projectClient.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: "proj-1" },
        data: { isMainContact: false },
      })
    );
    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientName: "Główny Klient",
          clientEmail: "glowny@test.com",
        }),
      })
    );
  });
});
