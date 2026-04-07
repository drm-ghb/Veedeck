import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/lists/route";
import { PATCH, DELETE } from "@/app/api/lists/[id]/route";
import { makeRequest, makeParams, SESSION } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/slug", () => ({
  uniqueSlug: vi.fn().mockResolvedValue("nowa-lista"),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    shoppingList: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    project: { findFirst: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockList = {
  id: "list-1",
  name: "Lista mebli",
  slug: "lista-mebli",
  userId: SESSION.user.id,
  archived: false,
  pinned: false,
  shareToken: "share-tok",
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/lists", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("zwraca listę list zakupowych", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.shoppingList.findMany).mockResolvedValue([mockList] as any);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Lista mebli");
  });
});

describe("POST /api/lists", () => {
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

  it("tworzy listę zakupową (201)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.shoppingList.create).mockResolvedValue(mockList as any);

    const res = await POST(makeRequest("POST", { name: "Nowa lista" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Lista mebli");
  });

  it("zwraca 403 gdy podano projectId który nie należy do użytkownika", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(null);

    const res = await POST(makeRequest("POST", { name: "Nowa lista", projectId: "proj-x" }));
    expect(res.status).toBe(403);
  });

  it("tworzy listę powiązaną z projektem gdy projectId jest prawidłowy", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue({ id: "proj-1" } as any);
    vi.mocked(prisma.shoppingList.create).mockResolvedValue({ ...mockList, projectId: "proj-1" } as any);

    const res = await POST(makeRequest("POST", { name: "Lista z projektu", projectId: "proj-1" }));
    expect(res.status).toBe(201);
  });
});

describe("PATCH /api/lists/[id]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { name: "Nowa" }), makeParams({ id: "list-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy lista nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { name: "Nowa" }), makeParams({ id: "list-1" }));
    expect(res.status).toBe(404);
  });

  it("aktualizuje listę", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(mockList as any);
    vi.mocked(prisma.shoppingList.update).mockResolvedValue({ ...mockList, name: "Nowa" } as any);

    const res = await PATCH(makeRequest("PATCH", { name: "Nowa" }), makeParams({ id: "list-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Nowa");
  });

  it("archiwizuje listę", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(mockList as any);
    vi.mocked(prisma.shoppingList.update).mockResolvedValue({ ...mockList, archived: true } as any);

    const res = await PATCH(makeRequest("PATCH", { archived: true }), makeParams({ id: "list-1" }));
    expect(res.status).toBe(200);
    expect(prisma.shoppingList.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ archived: true }) })
    );
  });
});

describe("DELETE /api/lists/[id]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "list-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy lista nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "list-1" }));
    expect(res.status).toBe(404);
  });

  it("usuwa listę", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(mockList as any);
    vi.mocked(prisma.shoppingList.delete).mockResolvedValue(mockList as any);

    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "list-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
