import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/folders/route";
import { PATCH, DELETE } from "@/app/api/folders/[id]/route";
import { makeRequest, makeParams, SESSION } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    room: { findUnique: vi.fn() },
    folder: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockRoom = {
  id: "room-1",
  project: { userId: SESSION.user.id },
};

const mockFolder = {
  id: "folder-1",
  name: "Salon",
  pinned: false,
  archived: false,
  room: { project: { userId: SESSION.user.id } },
};

beforeEach(() => vi.clearAllMocks());

describe("POST /api/folders", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { name: "Nowy", roomId: "room-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 400 gdy brak nazwy", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    const res = await POST(makeRequest("POST", { name: "", roomId: "room-1" }));
    expect(res.status).toBe(400);
  });

  it("zwraca 400 gdy brak roomId", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    const res = await POST(makeRequest("POST", { name: "Nowy" }));
    expect(res.status).toBe(400);
  });

  it("zwraca 403 gdy pomieszczenie nie należy do użytkownika", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.room.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { name: "Nowy", roomId: "room-1" }));
    expect(res.status).toBe(403);
  });

  it("tworzy folder i zwraca 201", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as any);
    vi.mocked(prisma.folder.create).mockResolvedValue({
      id: "folder-1",
      name: "Nowy",
      roomId: "room-1",
    } as any);

    const res = await POST(makeRequest("POST", { name: "  Nowy  ", roomId: "room-1" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Nowy");
    expect(prisma.folder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Nowy", roomId: "room-1" }),
      })
    );
  });
});

describe("PATCH /api/folders/[id]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { name: "Nowy" }), makeParams({ id: "folder-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 gdy folder nie należy do użytkownika", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.folder.findUnique).mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { name: "Nowy" }), makeParams({ id: "folder-1" }));
    expect(res.status).toBe(403);
  });

  it("aktualizuje nazwę folderu", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.folder.findUnique).mockResolvedValue(mockFolder as any);
    vi.mocked(prisma.folder.update).mockResolvedValue({ ...mockFolder, name: "Nowy Salon" } as any);

    const res = await PATCH(makeRequest("PATCH", { name: "Nowy Salon" }), makeParams({ id: "folder-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Nowy Salon");
  });

  it("archiwizuje folder", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.folder.findUnique).mockResolvedValue(mockFolder as any);
    vi.mocked(prisma.folder.update).mockResolvedValue({ ...mockFolder, archived: true } as any);

    const res = await PATCH(makeRequest("PATCH", { archived: true }), makeParams({ id: "folder-1" }));
    expect(res.status).toBe(200);
    expect(prisma.folder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ archived: true }),
      })
    );
  });

  it("przypina folder", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.folder.findUnique).mockResolvedValue(mockFolder as any);
    vi.mocked(prisma.folder.update).mockResolvedValue({ ...mockFolder, pinned: true } as any);

    const res = await PATCH(makeRequest("PATCH", { pinned: true }), makeParams({ id: "folder-1" }));
    expect(res.status).toBe(200);
    expect(prisma.folder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pinned: true }),
      })
    );
  });
});

describe("DELETE /api/folders/[id]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "folder-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 gdy folder nie należy do użytkownika", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.folder.findUnique).mockResolvedValue({
      ...mockFolder,
      room: { project: { userId: "other-user" } },
    } as any);
    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "folder-1" }));
    expect(res.status).toBe(403);
  });

  it("usuwa folder", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.folder.findUnique).mockResolvedValue(mockFolder as any);
    vi.mocked(prisma.folder.delete).mockResolvedValue(mockFolder as any);

    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "folder-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
