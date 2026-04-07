import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "@/app/api/renders/[id]/route";
import { makeRequest, makeParams, SESSION } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/pusher", () => ({
  pusherServer: { trigger: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    render: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    comment: { updateMany: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockRender = {
  id: "r1",
  name: "Render 1",
  status: "REVIEW",
  archived: false,
  project: {
    id: "proj-1",
    userId: SESSION.user.id,
    shareToken: "tok-abc",
    user: {
      autoClosePinsOnAccept: false,
      autoArchiveOnAccept: false,
      notifyClientOnStatusChange: false,
    },
  },
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/renders/[id]", () => {
  it("zwraca 404 gdy render nie istnieje", async () => {
    vi.mocked(prisma.render.findUnique).mockResolvedValue(null);
    const res = await GET(makeRequest("GET"), makeParams({ id: "r1" }));
    expect(res.status).toBe(404);
  });

  it("zwraca render z komentarzami", async () => {
    vi.mocked(prisma.render.findUnique).mockResolvedValue({
      ...mockRender,
      comments: [],
    } as any);
    const res = await GET(makeRequest("GET"), makeParams({ id: "r1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("r1");
    expect(body).toHaveProperty("comments");
  });
});

describe("PATCH /api/renders/[id]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { name: "Nowy" }), makeParams({ id: "r1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 gdy render nie należy do użytkownika", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.render.findUnique).mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { name: "Nowy" }), makeParams({ id: "r1" }));
    expect(res.status).toBe(403);
  });

  it("aktualizuje nazwę rendera", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.render.findUnique).mockResolvedValue(mockRender as any);
    vi.mocked(prisma.render.update).mockResolvedValue({ ...mockRender, name: "Nowy" } as any);

    const res = await PATCH(makeRequest("PATCH", { name: "Nowy" }), makeParams({ id: "r1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Nowy");
  });

  it("archiwizuje render", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.render.findUnique).mockResolvedValue(mockRender as any);
    vi.mocked(prisma.render.update).mockResolvedValue({ ...mockRender, archived: true } as any);

    const res = await PATCH(makeRequest("PATCH", { archived: true }), makeParams({ id: "r1" }));
    expect(res.status).toBe(200);
    expect(prisma.render.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ archived: true }) })
    );
  });

  it("przy akceptacji z autoClosePinsOnAccept zamyka piny", async () => {
    const renderWithAutoClose = {
      ...mockRender,
      project: {
        ...mockRender.project,
        user: { ...mockRender.project.user, autoClosePinsOnAccept: true },
      },
    };
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.render.findUnique).mockResolvedValue(renderWithAutoClose as any);
    vi.mocked(prisma.render.update).mockResolvedValue({ ...mockRender, status: "ACCEPTED" } as any);
    vi.mocked(prisma.comment.updateMany).mockResolvedValue({ count: 2 } as any);

    await PATCH(makeRequest("PATCH", { status: "ACCEPTED" }), makeParams({ id: "r1" }));

    expect(prisma.comment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ renderId: "r1", status: { not: "DONE" } }),
        data: { status: "DONE" },
      })
    );
  });

  it("przy akceptacji z autoArchiveOnAccept archiwizuje render", async () => {
    const renderWithAutoArchive = {
      ...mockRender,
      project: {
        ...mockRender.project,
        user: { ...mockRender.project.user, autoArchiveOnAccept: true },
      },
    };
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.render.findUnique).mockResolvedValue(renderWithAutoArchive as any);
    vi.mocked(prisma.render.update).mockResolvedValue({ ...mockRender, status: "ACCEPTED" } as any);

    await PATCH(makeRequest("PATCH", { status: "ACCEPTED" }), makeParams({ id: "r1" }));

    expect(prisma.render.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { archived: true } })
    );
  });
});

describe("DELETE /api/renders/[id]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "r1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 gdy render nie należy do użytkownika", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.render.findUnique).mockResolvedValue({
      ...mockRender,
      project: { userId: "other-user" },
    } as any);
    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "r1" }));
    expect(res.status).toBe(403);
  });

  it("usuwa render", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.render.findUnique).mockResolvedValue(mockRender as any);
    vi.mocked(prisma.render.delete).mockResolvedValue(mockRender as any);

    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "r1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
