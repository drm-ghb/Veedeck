import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/share/[token]/renders/[renderId]/route";
import { makeRequest, makeParams } from "../helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findUnique: vi.fn() },
    render: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockProject = { id: "proj-1", shareToken: "tok-abc" };
const mockRender = { id: "r1", projectId: "proj-1", status: "REVIEW" };

beforeEach(() => vi.clearAllMocks());

describe("PATCH /api/share/[token]/renders/[renderId]", () => {
  it("zwraca 404 gdy token projektu nie istnieje", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);
    const res = await PATCH(
      makeRequest("PATCH", { status: "ACCEPTED" }),
      makeParams({ token: "nieistniejacy", renderId: "r1" })
    );
    expect(res.status).toBe(404);
  });

  it("zwraca 403 gdy render nie należy do projektu", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as any);
    vi.mocked(prisma.render.findUnique).mockResolvedValue({
      ...mockRender,
      projectId: "inny-projekt",
    } as any);
    const res = await PATCH(
      makeRequest("PATCH", { status: "ACCEPTED" }),
      makeParams({ token: "tok-abc", renderId: "r1" })
    );
    expect(res.status).toBe(403);
  });

  it("zwraca 403 gdy render nie istnieje", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as any);
    vi.mocked(prisma.render.findUnique).mockResolvedValue(null);
    const res = await PATCH(
      makeRequest("PATCH", { status: "ACCEPTED" }),
      makeParams({ token: "tok-abc", renderId: "r1" })
    );
    expect(res.status).toBe(403);
  });

  it("klient może zmienić status rendera na ACCEPTED", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as any);
    vi.mocked(prisma.render.findUnique).mockResolvedValue(mockRender as any);
    vi.mocked(prisma.render.update).mockResolvedValue({ ...mockRender, status: "ACCEPTED" } as any);

    const res = await PATCH(
      makeRequest("PATCH", { status: "ACCEPTED" }),
      makeParams({ token: "tok-abc", renderId: "r1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ACCEPTED");
  });

  it("klient może cofnąć akceptację (REVIEW)", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as any);
    vi.mocked(prisma.render.findUnique).mockResolvedValue({ ...mockRender, status: "ACCEPTED" } as any);
    vi.mocked(prisma.render.update).mockResolvedValue({ ...mockRender, status: "REVIEW" } as any);

    const res = await PATCH(
      makeRequest("PATCH", { status: "REVIEW" }),
      makeParams({ token: "tok-abc", renderId: "r1" })
    );
    expect(res.status).toBe(200);
  });
});
