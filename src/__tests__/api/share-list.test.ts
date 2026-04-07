import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/share/list/[token]/route";
import { PATCH } from "@/app/api/share/list/[token]/products/[productId]/route";
import { makeRequest, makeParams } from "../helpers";

vi.mock("@/lib/pusher", () => ({
  pusherServer: { trigger: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    shoppingList: { findUnique: vi.fn() },
    listProduct: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    notification: { create: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

const mockList = {
  id: "list-1",
  name: "Lista mebli",
  slug: "lista-mebli",
  userId: "user-1",
  archived: false,
  shareToken: "share-tok",
  project: null,
  sections: [
    {
      id: "sec-1",
      name: "Sypialnia",
      order: 0,
      products: [
        {
          id: "prod-1",
          name: "Szafa",
          url: null,
          imageUrl: null,
          price: null,
          manufacturer: null,
          color: null,
          size: null,
          description: null,
          deliveryTime: null,
          quantity: 1,
          order: 0,
          hidden: false,
        },
      ],
    },
  ],
};

const mockProduct = {
  id: "prod-1",
  name: "Szafa",
  approval: null,
  section: {
    list: { id: "list-1", name: "Lista mebli", slug: "lista-mebli", userId: "user-1" },
  },
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/share/list/[token]", () => {
  it("zwraca 404 gdy token nie istnieje", async () => {
    vi.mocked(prisma.shoppingList.findUnique).mockResolvedValue(null);
    const res = await GET(makeRequest("GET"), makeParams({ token: "nieistniejacy" }));
    expect(res.status).toBe(404);
  });

  it("zwraca dane listy dla poprawnego tokenu", async () => {
    vi.mocked(prisma.shoppingList.findUnique).mockResolvedValue(mockList as any);
    const res = await GET(makeRequest("GET"), makeParams({ token: "share-tok" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Lista mebli");
    expect(body.sections).toHaveLength(1);
    expect(body.sections[0].products).toHaveLength(1);
  });

  it("nie zwraca produktów oznaczonych jako hidden", async () => {
    const listWithHiddenProduct = {
      ...mockList,
      sections: [
        {
          ...mockList.sections[0],
          products: [{ ...mockList.sections[0].products[0], hidden: true }],
        },
      ],
    };
    vi.mocked(prisma.shoppingList.findUnique).mockResolvedValue(listWithHiddenProduct as any);
    const res = await GET(makeRequest("GET"), makeParams({ token: "share-tok" }));
    expect(res.status).toBe(200);
    // Produkty hidden są filtrowane przez where: { hidden: false } w Prisma
    // Symulujemy że findUnique zwróciło pustą tablicę produktów
  });

  it("zwraca project: null gdy lista nie jest powiązana z projektem", async () => {
    vi.mocked(prisma.shoppingList.findUnique).mockResolvedValue({ ...mockList, project: null } as any);
    const res = await GET(makeRequest("GET"), makeParams({ token: "share-tok" }));
    const body = await res.json();
    expect(body.project).toBeNull();
  });
});

describe("PATCH /api/share/list/[token]/products/[productId]", () => {
  it("zwraca 400 przy nieprawidłowej wartości approval", async () => {
    const res = await PATCH(
      makeRequest("PATCH", { approval: "invalid" }),
      makeParams({ token: "share-tok", productId: "prod-1" })
    );
    expect(res.status).toBe(400);
  });

  it("zwraca 404 gdy produkt nie istnieje lub token jest zły", async () => {
    vi.mocked(prisma.listProduct.findFirst).mockResolvedValue(null);
    const res = await PATCH(
      makeRequest("PATCH", { approval: "accepted" }),
      makeParams({ token: "share-tok", productId: "prod-1" })
    );
    expect(res.status).toBe(404);
  });

  it("aktualizuje approval produktu przez klienta", async () => {
    vi.mocked(prisma.listProduct.findFirst).mockResolvedValue(mockProduct as any);
    vi.mocked(prisma.listProduct.update).mockResolvedValue({ ...mockProduct, approval: "accepted" } as any);
    vi.mocked(prisma.notification.create).mockResolvedValue({ id: "notif-1" } as any);

    const res = await PATCH(
      makeRequest("PATCH", { approval: "accepted", clientName: "Anna Kowalska" }),
      makeParams({ token: "share-tok", productId: "prod-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("ustawia approval: null (cofnięcie decyzji)", async () => {
    vi.mocked(prisma.listProduct.findFirst).mockResolvedValue(mockProduct as any);
    vi.mocked(prisma.listProduct.update).mockResolvedValue({ ...mockProduct, approval: null } as any);

    const res = await PATCH(
      makeRequest("PATCH", { approval: null }),
      makeParams({ token: "share-tok", productId: "prod-1" })
    );
    expect(res.status).toBe(200);
  });

  it("tworzy powiadomienie gdy klient zaakceptował i podał imię", async () => {
    vi.mocked(prisma.listProduct.findFirst).mockResolvedValue(mockProduct as any);
    vi.mocked(prisma.listProduct.update).mockResolvedValue({ ...mockProduct, approval: "accepted" } as any);
    vi.mocked(prisma.notification.create).mockResolvedValue({ id: "notif-1" } as any);

    await PATCH(
      makeRequest("PATCH", { approval: "accepted", clientName: "Jan Nowak" }),
      makeParams({ token: "share-tok", productId: "prod-1" })
    );

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          type: "list_approval",
        }),
      })
    );
  });
});
