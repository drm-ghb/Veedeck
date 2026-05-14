/**
 * Tests for client panel endpoints not covered by client-accounts.test.ts:
 *  - PATCH /api/client/[projectId]/renders/[renderId]          — zmiana statusu rendera przez klienta
 *  - POST  /api/client/[projectId]/renders/[renderId]/comments  — klient dodaje komentarz
 *  - POST  /api/client/[projectId]/renders/[renderId]/view      — klient otwiera render (viewCount)
 *  - GET   /api/client/[projectId]/lists/[listId]              — klient przegląda listę zakupową
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, makeParams } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    projectClient: {
      findFirst: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
    render: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    comment: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    shoppingList: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock("@/lib/pusher", () => ({ pusherServer: { trigger: vi.fn().mockResolvedValue({}) } }));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PATCH as renderStatusPATCH } from "@/app/api/client/[projectId]/renders/[renderId]/route";
import { POST as renderCommentPOST } from "@/app/api/client/[projectId]/renders/[renderId]/comments/route";
import { POST as renderViewPOST } from "@/app/api/client/[projectId]/renders/[renderId]/view/route";
import { GET as listGET } from "@/app/api/client/[projectId]/lists/[listId]/route";

const CLIENT_SESSION = { user: { id: "client-1", email: "klient@test.com", role: "client" } };
const DESIGNER_SESSION = { user: { id: "user-1", email: "designer@test.com", role: "designer" } };

// Projekt z ustawieniami projektanta — odpowiada temu co zwraca getClientProject
const mockProject = {
  id: "proj-1",
  title: "Projekt Test",
  userId: "user-1",
  archived: false,
  hiddenModules: [],
  allowClientComments: true,
  allowDirectStatusChange: true,
  allowClientAcceptance: true,
  allowClientVersionRestore: false,
  hideCommentCount: false,
  clientCanUpload: false,
  sharePassword: null,
  shareExpiresAt: null,
  theme: null,
  user: {
    name: "Projektant",
    allowClientComments: true,
    allowDirectStatusChange: true,
    allowClientAcceptance: true,
    allowClientVersionRestore: false,
    requireClientEmail: false,
    hideCommentCount: false,
    clientWelcomeMessage: null,
    clientLogoUrl: null,
    accentColor: null,
    defaultRenderOrder: "asc",
    notifyClientOnStatusChange: true,
    notifyClientOnReply: true,
    showProfileName: true,
    showClientLogo: false,
    navMode: "sidebar",
    colorTheme: null,
  },
};

const mockRender = {
  id: "render-1",
  projectId: "proj-1",
  title: "Render Salon",
  status: "pending",
  viewCount: 0,
};

// Pomocnik: klient ma dostęp do projektu
function mockClientAccess() {
  vi.mocked(prisma.projectClient.findFirst).mockResolvedValue({ id: "pc-1" } as any);
  vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as any);
}

beforeEach(() => vi.clearAllMocks());

// ─── PATCH /api/client/[projectId]/renders/[renderId] ────────────────────────

describe("PATCH /api/client/[projectId]/renders/[renderId] — zmiana statusu przez klienta", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await renderStatusPATCH(
      makeRequest("PATCH", { status: "accepted" }),
      makeParams({ projectId: "proj-1", renderId: "render-1" })
    );
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy klient nie ma dostępu do projektu", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue(null);

    const res = await renderStatusPATCH(
      makeRequest("PATCH", { status: "accepted" }),
      makeParams({ projectId: "proj-1", renderId: "render-1" })
    );
    expect(res.status).toBe(404);
  });

  it("zwraca 403 gdy projektant nie zezwala klientowi na zmianę statusu", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue({ id: "pc-1" } as any);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      ...mockProject,
      user: { ...mockProject.user, allowClientAcceptance: false, allowDirectStatusChange: false },
    } as any);

    const res = await renderStatusPATCH(
      makeRequest("PATCH", { status: "accepted" }),
      makeParams({ projectId: "proj-1", renderId: "render-1" })
    );
    expect(res.status).toBe(403);
  });

  it("zwraca 404 gdy render nie istnieje w projekcie", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    mockClientAccess();
    vi.mocked(prisma.render.findFirst).mockResolvedValue(null);

    const res = await renderStatusPATCH(
      makeRequest("PATCH", { status: "accepted" }),
      makeParams({ projectId: "proj-1", renderId: "nieistniejacy" })
    );
    expect(res.status).toBe(404);
  });

  it("aktualizuje status rendera gdy klient ma uprawnienia", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    mockClientAccess();
    vi.mocked(prisma.render.findFirst).mockResolvedValue(mockRender as any);
    vi.mocked(prisma.render.update).mockResolvedValue({ ...mockRender, status: "accepted" } as any);

    const res = await renderStatusPATCH(
      makeRequest("PATCH", { status: "accepted" }),
      makeParams({ projectId: "proj-1", renderId: "render-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("accepted");

    const updateCall = vi.mocked(prisma.render.update).mock.calls[0][0];
    expect(updateCall.data.status).toBe("accepted");
    expect(updateCall.where.id).toBe("render-1");
  });
});

// ─── POST /api/client/[projectId]/renders/[renderId]/comments ────────────────

describe("POST /api/client/[projectId]/renders/[renderId]/comments — klient dodaje komentarz", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await renderCommentPOST(
      makeRequest("POST", { content: "Świetny render!" }),
      makeParams({ projectId: "proj-1", renderId: "render-1" })
    );
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy klient nie ma dostępu do projektu", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue(null);

    const res = await renderCommentPOST(
      makeRequest("POST", { content: "Świetny render!" }),
      makeParams({ projectId: "proj-1", renderId: "render-1" })
    );
    expect(res.status).toBe(404);
  });

  it("zwraca 403 gdy komentarze są wyłączone przez projektanta", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue({ id: "pc-1" } as any);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      ...mockProject,
      user: { ...mockProject.user, allowClientComments: false },
    } as any);

    const res = await renderCommentPOST(
      makeRequest("POST", { content: "Świetny render!" }),
      makeParams({ projectId: "proj-1", renderId: "render-1" })
    );
    expect(res.status).toBe(403);
  });

  it("zwraca 400 gdy brak treści komentarza", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    mockClientAccess();
    vi.mocked(prisma.render.findFirst).mockResolvedValue(mockRender as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "client-1", name: "Jan Kowalski" } as any);

    const res = await renderCommentPOST(
      makeRequest("POST", { content: "   " }), // tylko spacje
      makeParams({ projectId: "proj-1", renderId: "render-1" })
    );
    expect(res.status).toBe(400);
  });

  it("tworzy komentarz z imieniem klienta i pozycją pinezki", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    mockClientAccess();
    vi.mocked(prisma.render.findFirst).mockResolvedValue(mockRender as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "client-1", name: "Jan Kowalski" } as any);
    vi.mocked(prisma.comment.create).mockResolvedValue({
      id: "comment-1",
      content: "Zmień kolor ściany",
      author: "Jan Kowalski",
      posX: 0.42,
      posY: 0.68,
      renderId: "render-1",
      replies: [],
    } as any);

    const res = await renderCommentPOST(
      makeRequest("POST", { content: "Zmień kolor ściany", posX: 0.42, posY: 0.68, title: null }),
      makeParams({ projectId: "proj-1", renderId: "render-1" })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.content).toBe("Zmień kolor ściany");
    expect(body.author).toBe("Jan Kowalski");
    expect(body.posX).toBe(0.42);

    const createCall = vi.mocked(prisma.comment.create).mock.calls[0][0];
    expect(createCall.data.author).toBe("Jan Kowalski");
    expect(createCall.data.renderId).toBe("render-1");
  });

  it('używa "Klient" jako autora gdy klient nie ma imienia', async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    mockClientAccess();
    vi.mocked(prisma.render.findFirst).mockResolvedValue(mockRender as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "client-1", name: null } as any);
    vi.mocked(prisma.comment.create).mockResolvedValue({
      id: "comment-2",
      content: "Zmień kolor",
      author: "Klient",
      posX: null,
      posY: null,
      renderId: "render-1",
      replies: [],
    } as any);

    await renderCommentPOST(
      makeRequest("POST", { content: "Zmień kolor" }),
      makeParams({ projectId: "proj-1", renderId: "render-1" })
    );

    const createCall = vi.mocked(prisma.comment.create).mock.calls[0][0];
    expect(createCall.data.author).toBe("Klient");
  });
});

// ─── POST /api/client/[projectId]/renders/[renderId]/view ────────────────────

describe("POST /api/client/[projectId]/renders/[renderId]/view — licznik wyświetleń", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await renderViewPOST(
      makeRequest("POST"),
      makeParams({ projectId: "proj-1", renderId: "render-1" })
    );
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy klient nie ma dostępu do projektu", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue(null);

    const res = await renderViewPOST(
      makeRequest("POST"),
      makeParams({ projectId: "proj-1", renderId: "render-1" })
    );
    expect(res.status).toBe(404);
  });

  it("inkrementuje viewCount i zwraca ok", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    mockClientAccess();
    vi.mocked(prisma.render.update).mockResolvedValue({ ...mockRender, viewCount: 1 } as any);

    const res = await renderViewPOST(
      makeRequest("POST"),
      makeParams({ projectId: "proj-1", renderId: "render-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    const updateCall = vi.mocked(prisma.render.update).mock.calls[0][0];
    expect(updateCall.data.viewCount).toEqual({ increment: 1 });
  });
});

// ─── GET /api/client/[projectId]/lists/[listId] ──────────────────────────────

describe("GET /api/client/[projectId]/lists/[listId] — klient przegląda listę zakupową", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await listGET(
      makeRequest("GET"),
      makeParams({ projectId: "proj-1", listId: "list-1" })
    );
    expect(res.status).toBe(401);
  });

  it("zwraca 403 dla projektanta (nie klienta)", async () => {
    vi.mocked(auth).mockResolvedValue(DESIGNER_SESSION as any);
    const res = await listGET(
      makeRequest("GET"),
      makeParams({ projectId: "proj-1", listId: "list-1" })
    );
    expect(res.status).toBe(403);
  });

  it("zwraca 404 gdy klient nie ma dostępu do projektu", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue(null);

    const res = await listGET(
      makeRequest("GET"),
      makeParams({ projectId: "proj-1", listId: "list-1" })
    );
    expect(res.status).toBe(404);
  });

  it("zwraca 404 gdy lista nie istnieje lub jest zarchiwizowana", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    mockClientAccess();
    vi.mocked(prisma.shoppingList.findUnique).mockResolvedValue(null);

    const res = await listGET(
      makeRequest("GET"),
      makeParams({ projectId: "proj-1", listId: "nieistniejaca" })
    );
    expect(res.status).toBe(404);
  });

  it("zwraca dane listy z sekcjami i produktami (bez ukrytych)", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    mockClientAccess();
    vi.mocked(prisma.shoppingList.findUnique).mockResolvedValue({
      id: "list-1",
      name: "Lista Makowska",
      shareToken: "share-abc",
      hidePrices: false,
      sections: [
        {
          id: "sec-1",
          name: "Salon",
          order: 0,
          unsorted: false,
          products: [
            {
              id: "prod-1",
              name: "Sofa Velvet",
              url: "https://example.com/sofa",
              imageUrl: null,
              price: "2999",
              manufacturer: "Sits",
              color: "granatowy",
              dimensions: "230x90",
              description: null,
              deliveryTime: null,
              quantity: 1,
              order: 0,
              approval: "pending",
              note: null,
              _count: { comments: 2 },
            },
          ],
        },
      ],
    } as any);

    const res = await listGET(
      makeRequest("GET"),
      makeParams({ projectId: "proj-1", listId: "list-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Lista Makowska");
    expect(body.sections).toHaveLength(1);
    expect(body.sections[0].products).toHaveLength(1);
    expect(body.sections[0].products[0].name).toBe("Sofa Velvet");
    expect(body.sections[0].products[0].commentCount).toBe(2);
    // ceny widoczne gdy hidePrices: false
    expect(body.sections[0].products[0].price).toBe("2999");
    // sharePassword nie powinno wyciekać
    expect(body.sharePassword).toBeUndefined();
  });

  it("zapytanie do bazy filtruje po projectId i archived: false", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    mockClientAccess();
    vi.mocked(prisma.shoppingList.findUnique).mockResolvedValue({
      id: "list-1", name: "Test", shareToken: "t", hidePrices: false, sections: [],
    } as any);

    await listGET(
      makeRequest("GET"),
      makeParams({ projectId: "proj-1", listId: "list-1" })
    );

    const findCall = vi.mocked(prisma.shoppingList.findUnique).mock.calls[0][0];
    expect(findCall.where).toMatchObject({ id: "list-1", projectId: "proj-1", archived: false });
  });
});
