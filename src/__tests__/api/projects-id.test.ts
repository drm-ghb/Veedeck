import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "@/app/api/projects/[id]/route";
import { makeRequest, makeParams, SESSION } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/slug", () => ({
  uniqueSlug: vi.fn().mockResolvedValue("test-slug"),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    room: { updateMany: vi.fn() },
    render: { updateMany: vi.fn() },
    shoppingList: { updateMany: vi.fn() },
    $transaction: vi.fn().mockResolvedValue([]),
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockProject = { id: "p1", title: "Test", userId: SESSION.user.id };

beforeEach(() => vi.clearAllMocks());

describe("GET /api/projects/[id]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET(makeRequest("GET"), makeParams({ id: "p1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy projekt nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(null);
    const res = await GET(makeRequest("GET"), makeParams({ id: "p1" }));
    expect(res.status).toBe(404);
  });

  it("zwraca projekt", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);
    const res = await GET(makeRequest("GET"), makeParams({ id: "p1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("p1");
  });
});

describe("PATCH /api/projects/[id]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { title: "Nowy" }), makeParams({ id: "p1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 gdy projekt należy do innego użytkownika", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { title: "Nowy" }), makeParams({ id: "p1" }));
    expect(res.status).toBe(403);
  });

  it("aktualizuje projekt", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);
    vi.mocked(prisma.project.update).mockResolvedValue({ ...mockProject, title: "Nowy" } as any);

    const res = await PATCH(
      makeRequest("PATCH", { title: "Nowy", description: "Opis" }),
      makeParams({ id: "p1" })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Nowy");
    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: expect.objectContaining({ title: "Nowy" }),
      })
    );
  });

  it("aktualizuje tylko podane pola (partial update)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);
    vi.mocked(prisma.project.update).mockResolvedValue(mockProject as any);

    await PATCH(makeRequest("PATCH", { archived: true }), makeParams({ id: "p1" }));

    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { archived: true },
      })
    );
  });
});

describe("DELETE /api/projects/[id]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "p1" }));
    expect(res.status).toBe(401);
  });

  it("usuwa projekt", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.deleteMany).mockResolvedValue({ count: 1 });

    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "p1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(prisma.project.deleteMany).toHaveBeenCalledWith({
      where: { id: "p1", userId: SESSION.user.id },
    });
  });
});
