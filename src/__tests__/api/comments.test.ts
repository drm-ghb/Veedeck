import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/comments/route";
import { PATCH, DELETE } from "@/app/api/comments/[id]/route";
import { POST as PostReply } from "@/app/api/comments/[id]/replies/route";
import { makeRequest, makeParams } from "../helpers";

vi.mock("@/lib/pusher", () => ({
  pusherServer: { trigger: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    comment: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    render: { findUnique: vi.fn() },
    reply: { create: vi.fn() },
    notification: { create: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

const mockRender = {
  id: "r1",
  projectId: "proj-1",
  project: {
    id: "proj-1",
    title: "Projekt Test",
    userId: "user-1",
    shareToken: "tok-abc",
    user: {
      requirePinTitle: false,
      maxPinsPerRender: null,
      notifyClientOnReply: false,
    },
  },
};

const mockComment = {
  id: "c1",
  renderId: "r1",
  content: "Treść komentarza",
  author: "Jan",
  posX: null,
  posY: null,
  status: "OPEN",
  isInternal: false,
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/comments", () => {
  it("zwraca 400 bez renderId", async () => {
    const req = new (await import("next/server")).NextRequest("http://localhost/api/comments");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("zwraca listę komentarzy dla danego rendera", async () => {
    vi.mocked(prisma.comment.findMany).mockResolvedValue([mockComment] as any);
    const req = new (await import("next/server")).NextRequest(
      "http://localhost/api/comments?renderId=r1"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("c1");
  });
});

describe("POST /api/comments", () => {
  it("zwraca 400 gdy brak wymaganych pól", async () => {
    const res = await POST(makeRequest("POST", { renderId: "r1", content: "Treść" }));
    expect(res.status).toBe(400);
  });

  it("zwraca 404 gdy render nie istnieje", async () => {
    vi.mocked(prisma.render.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { renderId: "r1", content: "Treść", author: "Jan" }));
    expect(res.status).toBe(404);
  });

  it("tworzy komentarz i zwraca 201", async () => {
    vi.mocked(prisma.render.findUnique).mockResolvedValue(mockRender as any);
    vi.mocked(prisma.comment.create).mockResolvedValue({ ...mockComment, content: "Treść" } as any);
    vi.mocked(prisma.notification.create).mockResolvedValue({ id: "notif-1" } as any);

    const res = await POST(makeRequest("POST", { renderId: "r1", content: "Treść", author: "Jan" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.content).toBe("Treść");
  });

  it("tworzy pin i zwraca 201", async () => {
    vi.mocked(prisma.render.findUnique).mockResolvedValue(mockRender as any);
    vi.mocked(prisma.comment.create).mockResolvedValue({
      ...mockComment,
      posX: 50,
      posY: 30,
    } as any);
    vi.mocked(prisma.comment.count).mockResolvedValue(0);
    vi.mocked(prisma.notification.create).mockResolvedValue({ id: "notif-1" } as any);

    const res = await POST(makeRequest("POST", {
      renderId: "r1",
      content: "Pin komentarz",
      author: "Jan",
      posX: 50,
      posY: 30,
    }));
    expect(res.status).toBe(201);
  });

  it("zwraca 400 gdy osiągnięto limit pinów", async () => {
    vi.mocked(prisma.render.findUnique).mockResolvedValue({
      ...mockRender,
      project: {
        ...mockRender.project,
        user: { ...mockRender.project.user, maxPinsPerRender: 3 },
      },
    } as any);
    vi.mocked(prisma.comment.count).mockResolvedValue(3);

    const res = await POST(makeRequest("POST", {
      renderId: "r1",
      content: "Pin",
      author: "Jan",
      posX: 10,
      posY: 20,
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/limit/);
  });

  it("zwraca 400 gdy tytuł pinu jest wymagany a nie podano", async () => {
    vi.mocked(prisma.render.findUnique).mockResolvedValue({
      ...mockRender,
      project: {
        ...mockRender.project,
        user: { ...mockRender.project.user, requirePinTitle: true, maxPinsPerRender: null },
      },
    } as any);

    const res = await POST(makeRequest("POST", {
      renderId: "r1",
      content: "Pin",
      author: "Jan",
      posX: 10,
      posY: 20,
    }));
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/comments/[id]", () => {
  it("aktualizuje status komentarza", async () => {
    vi.mocked(prisma.comment.update).mockResolvedValue({ ...mockComment, status: "DONE" } as any);

    const res = await PATCH(makeRequest("PATCH", { status: "DONE" }), makeParams({ id: "c1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("DONE");
  });

  it("aktualizuje isInternal", async () => {
    vi.mocked(prisma.comment.update).mockResolvedValue({ ...mockComment, isInternal: true } as any);

    const res = await PATCH(makeRequest("PATCH", { isInternal: true }), makeParams({ id: "c1" }));
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/comments/[id]", () => {
  it("zwraca 404 gdy komentarz nie istnieje", async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "c1" }));
    expect(res.status).toBe(404);
  });

  it("usuwa komentarz", async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(mockComment as any);
    vi.mocked(prisma.comment.delete).mockResolvedValue(mockComment as any);

    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "c1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe("POST /api/comments/[id]/replies", () => {
  it("zwraca 400 gdy brak treści lub autora", async () => {
    const res = await PostReply(makeRequest("POST", { content: "Treść" }), makeParams({ id: "c1" }));
    expect(res.status).toBe(400);
  });

  it("zwraca 404 gdy komentarz nie istnieje", async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(null);
    const res = await PostReply(
      makeRequest("POST", { content: "Odpowiedź", author: "Jan" }),
      makeParams({ id: "c1" })
    );
    expect(res.status).toBe(404);
  });

  it("tworzy odpowiedź na komentarz", async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(mockComment as any);
    vi.mocked(prisma.reply.create).mockResolvedValue({
      id: "rep-1",
      commentId: "c1",
      content: "Odpowiedź",
      author: "Jan",
      createdAt: new Date(),
    } as any);
    vi.mocked(prisma.render.findUnique).mockResolvedValue(mockRender as any);

    const res = await PostReply(
      makeRequest("POST", { content: "Odpowiedź", author: "Jan" }),
      makeParams({ id: "c1" })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.content).toBe("Odpowiedź");
  });
});
