/**
 * Testy systemu płatności i dostępu:
 *  - PATCH /api/admin/users/[id]/trial   — zmiana trialu i isFree
 *  - POST  /api/admin/users/[id]/discount — dodawanie rabatu
 *  - DELETE /api/admin/users/[id]/discount — usuwanie rabatu
 *  - GET  /api/subscription               — dane subskrypcji zalogowanego usera
 *  - POST /api/subscription               — aktywacja/zmiana subskrypcji
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, makeParams } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    discount: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
  },
}));
vi.mock("@/lib/activity-log", () => ({ logActivity: vi.fn().mockResolvedValue(undefined) }));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { PATCH as trialPATCH } from "@/app/api/admin/users/[id]/trial/route";
import { POST as discountPOST, DELETE as discountDELETE } from "@/app/api/admin/users/[id]/discount/route";
import { GET as subscriptionGET, POST as subscriptionPOST } from "@/app/api/subscription/route";

const ADMIN_SESSION = { user: { id: "admin-1", email: "admin@test.com", isAdmin: true } };
const USER_SESSION  = { user: { id: "user-1", email: "user@test.com" } };

const mockUser = {
  id: "target-1",
  email: "target@test.com",
  trialEndsAt: new Date("2026-06-01T00:00:00.000Z"),
  isFree: false,
};

const mockDiscount = {
  id: "disc-1",
  userId: "target-1",
  type: "percent",
  value: 20,
  validFrom: new Date("2026-01-01"),
  validUntil: new Date("2026-12-31"),
  note: "Rabat powitalny",
  createdAt: new Date(),
};

const mockSubscription = {
  id: "sub-1",
  userId: "user-1",
  plan: "commercial",
  status: "active",
  billingName: "Jan Kowalski",
  billingEmail: null,
  cardLast4: "4242",
  cardBrand: "Visa",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

// ─── PATCH /api/admin/users/[id]/trial ────────────────────────────────────────

describe("PATCH /api/admin/users/[id]/trial — zarządzanie trialem", () => {
  it("zwraca 403 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await trialPATCH(makeRequest("PATCH", {}), makeParams({ id: "target-1" }));
    expect(res.status).toBe(403);
  });

  it("zwraca 403 dla non-admin", async () => {
    vi.mocked(auth).mockResolvedValue(USER_SESSION as any);
    const res = await trialPATCH(makeRequest("PATCH", { isFree: true }), makeParams({ id: "target-1" }));
    expect(res.status).toBe(403);
  });

  it("zwraca 404 gdy user nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const res = await trialPATCH(makeRequest("PATCH", { isFree: true }), makeParams({ id: "nieznany" }));
    expect(res.status).toBe(404);
  });

  it("ustawia isFree=true bez zmiany trialu", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, isFree: true } as any);

    const res = await trialPATCH(makeRequest("PATCH", { isFree: true }), makeParams({ id: "target-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isFree).toBe(true);

    const updateCall = vi.mocked(prisma.user.update).mock.calls[0][0];
    expect(updateCall.data.isFree).toBe(true);
    expect(updateCall.data.trialEndsAt).toBeUndefined();
  });

  it("ustawia isFree=false bez zmiany trialu", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    const userWithFree = { ...mockUser, isFree: true };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(userWithFree as any);
    vi.mocked(prisma.user.update).mockResolvedValue({ ...userWithFree, isFree: false } as any);

    const res = await trialPATCH(makeRequest("PATCH", { isFree: false }), makeParams({ id: "target-1" }));
    expect(res.status).toBe(200);

    const updateCall = vi.mocked(prisma.user.update).mock.calls[0][0];
    expect(updateCall.data.isFree).toBe(false);
  });

  it("dodaje extra dni do istniejącego aktywnego trialu", async () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // za 10 dni
    const userWithTrial = { ...mockUser, trialEndsAt: futureDate };
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(userWithTrial as any);

    const expectedNewDate = new Date(futureDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...userWithTrial,
      trialEndsAt: expectedNewDate,
    } as any);

    const res = await trialPATCH(makeRequest("PATCH", { extraDays: 7 }), makeParams({ id: "target-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(new Date(body.trialEndsAt).getTime()).toBeGreaterThan(futureDate.getTime());

    const updateCall = vi.mocked(prisma.user.update).mock.calls[0][0];
    const savedDate = new Date(updateCall.data.trialEndsAt);
    // Nowa data powinna być mniej więcej o 7 dni dalsza niż aktualna data końca trialu
    const diffMs = savedDate.getTime() - futureDate.getTime();
    expect(diffMs).toBeCloseTo(7 * 24 * 60 * 60 * 1000, -3);
  });

  it("liczy extra dni od teraz gdy trial już wygasł", async () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 dni temu
    const userExpired = { ...mockUser, trialEndsAt: pastDate };
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(userExpired as any);
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...userExpired,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    } as any);

    const before = Date.now();
    const res = await trialPATCH(makeRequest("PATCH", { extraDays: 14 }), makeParams({ id: "target-1" }));
    const after = Date.now();
    expect(res.status).toBe(200);

    const updateCall = vi.mocked(prisma.user.update).mock.calls[0][0];
    const savedDate = new Date(updateCall.data.trialEndsAt);
    // Baza powinna być teraz (nie stary wygasły trial)
    const diffMs = savedDate.getTime() - before;
    expect(diffMs).toBeGreaterThan(13 * 24 * 60 * 60 * 1000);
    expect(savedDate.getTime()).toBeLessThanOrEqual(after + 15 * 24 * 60 * 60 * 1000);
  });

  it("liczy extra dni od teraz gdy trial jest null", async () => {
    const userNoTrial = { ...mockUser, trialEndsAt: null };
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(userNoTrial as any);
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...userNoTrial,
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    } as any);

    const res = await trialPATCH(makeRequest("PATCH", { extraDays: 30 }), makeParams({ id: "target-1" }));
    expect(res.status).toBe(200);

    const updateCall = vi.mocked(prisma.user.update).mock.calls[0][0];
    expect(updateCall.data.trialEndsAt).toBeDefined();
    const savedDate = new Date(updateCall.data.trialEndsAt);
    const diffDays = (savedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(29);
    expect(diffDays).toBeLessThan(31);
  });

  it("odejmuje dni gdy extraDays jest ujemne", async () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // za 30 dni
    const userWithTrial = { ...mockUser, trialEndsAt: futureDate };
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(userWithTrial as any);
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...userWithTrial,
      trialEndsAt: new Date(futureDate.getTime() - 10 * 24 * 60 * 60 * 1000),
    } as any);

    const res = await trialPATCH(makeRequest("PATCH", { extraDays: -10 }), makeParams({ id: "target-1" }));
    expect(res.status).toBe(200);

    const updateCall = vi.mocked(prisma.user.update).mock.calls[0][0];
    const savedDate = new Date(updateCall.data.trialEndsAt);
    // Nowa data powinna być o 10 dni krótsza
    const diffMs = futureDate.getTime() - savedDate.getTime();
    expect(diffMs).toBeCloseTo(10 * 24 * 60 * 60 * 1000, -3);
  });

  it("nie zmienia trialEndsAt gdy extraDays=0", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

    const res = await trialPATCH(makeRequest("PATCH", { extraDays: 0 }), makeParams({ id: "target-1" }));
    expect(res.status).toBe(200);

    const updateCall = vi.mocked(prisma.user.update).mock.calls[0][0];
    expect(updateCall.data.trialEndsAt).toBeUndefined();
  });

  it("jednoczesna zmiana isFree i extraDays działa poprawnie", async () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const userWithTrial = { ...mockUser, trialEndsAt: futureDate };
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(userWithTrial as any);
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...userWithTrial,
      isFree: true,
      trialEndsAt: new Date(futureDate.getTime() + 14 * 24 * 60 * 60 * 1000),
    } as any);

    const res = await trialPATCH(
      makeRequest("PATCH", { isFree: true, extraDays: 14 }),
      makeParams({ id: "target-1" })
    );
    expect(res.status).toBe(200);

    const updateCall = vi.mocked(prisma.user.update).mock.calls[0][0];
    expect(updateCall.data.isFree).toBe(true);
    expect(updateCall.data.trialEndsAt).toBeDefined();
  });

  it("loguje aktywność po udanej zmianie", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, isFree: true } as any);

    await trialPATCH(makeRequest("PATCH", { isFree: true }), makeParams({ id: "target-1" }));

    expect(vi.mocked(logActivity)).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ADMIN_TRIAL_UPDATE",
        level: "info",
        userId: "admin-1",
      })
    );
  });
});

// ─── POST /api/admin/users/[id]/discount ─────────────────────────────────────

describe("POST /api/admin/users/[id]/discount — dodawanie rabatu", () => {
  it("zwraca 403 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await discountPOST(
      makeRequest("POST", { type: "percent", value: 20 }),
      makeParams({ id: "target-1" })
    );
    expect(res.status).toBe(403);
  });

  it("zwraca 403 dla non-admin", async () => {
    vi.mocked(auth).mockResolvedValue(USER_SESSION as any);
    const res = await discountPOST(
      makeRequest("POST", { type: "percent", value: 20 }),
      makeParams({ id: "target-1" })
    );
    expect(res.status).toBe(403);
  });

  it("zwraca 400 dla nieprawidłowego type", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    const res = await discountPOST(
      makeRequest("POST", { type: "invalid", value: 20 }),
      makeParams({ id: "target-1" })
    );
    expect(res.status).toBe(400);
  });

  it("zwraca 400 gdy value=0", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    const res = await discountPOST(
      makeRequest("POST", { type: "percent", value: 0 }),
      makeParams({ id: "target-1" })
    );
    expect(res.status).toBe(400);
  });

  it("zwraca 400 gdy value ujemne", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    const res = await discountPOST(
      makeRequest("POST", { type: "amount", value: -10 }),
      makeParams({ id: "target-1" })
    );
    expect(res.status).toBe(400);
  });

  it("zwraca 400 gdy value nie jest liczbą", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    const res = await discountPOST(
      makeRequest("POST", { type: "percent", value: "dwadziescia" }),
      makeParams({ id: "target-1" })
    );
    expect(res.status).toBe(400);
  });

  it("tworzy rabat procentowy z podanymi datami", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    vi.mocked(prisma.discount.create).mockResolvedValue(mockDiscount as any);

    const res = await discountPOST(
      makeRequest("POST", {
        type: "percent",
        value: 20,
        validFrom: "2026-01-01",
        validUntil: "2026-12-31",
        note: "Rabat powitalny",
      }),
      makeParams({ id: "target-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("percent");
    expect(body.value).toBe(20);

    const createCall = vi.mocked(prisma.discount.create).mock.calls[0][0];
    expect(createCall.data.type).toBe("percent");
    expect(createCall.data.value).toBe(20);
    expect(createCall.data.userId).toBe("target-1");
    expect(createCall.data.validUntil).toBeDefined();
    expect(createCall.data.note).toBe("Rabat powitalny");
  });

  it("tworzy rabat kwotowy (amount)", async () => {
    const amountDiscount = { ...mockDiscount, type: "amount", value: 30 };
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    vi.mocked(prisma.discount.create).mockResolvedValue(amountDiscount as any);

    const res = await discountPOST(
      makeRequest("POST", { type: "amount", value: 30 }),
      makeParams({ id: "target-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("amount");
    expect(body.value).toBe(30);
  });

  it("używa bieżącej daty jako validFrom gdy nie podano", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    vi.mocked(prisma.discount.create).mockResolvedValue(mockDiscount as any);

    const before = Date.now();
    await discountPOST(
      makeRequest("POST", { type: "percent", value: 15 }),
      makeParams({ id: "target-1" })
    );
    const after = Date.now();

    const createCall = vi.mocked(prisma.discount.create).mock.calls[0][0];
    const savedDate = new Date(createCall.data.validFrom).getTime();
    expect(savedDate).toBeGreaterThanOrEqual(before);
    expect(savedDate).toBeLessThanOrEqual(after);
  });

  it("ustawia validUntil=null gdy nie podano", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    vi.mocked(prisma.discount.create).mockResolvedValue({ ...mockDiscount, validUntil: null } as any);

    await discountPOST(
      makeRequest("POST", { type: "percent", value: 10 }),
      makeParams({ id: "target-1" })
    );

    const createCall = vi.mocked(prisma.discount.create).mock.calls[0][0];
    expect(createCall.data.validUntil).toBeNull();
  });

  it("loguje aktywność po dodaniu rabatu", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    vi.mocked(prisma.discount.create).mockResolvedValue(mockDiscount as any);

    await discountPOST(
      makeRequest("POST", { type: "percent", value: 20 }),
      makeParams({ id: "target-1" })
    );

    expect(vi.mocked(logActivity)).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ADMIN_DISCOUNT_ADDED",
        level: "info",
        userId: "admin-1",
      })
    );
  });
});

// ─── DELETE /api/admin/users/[id]/discount ────────────────────────────────────

describe("DELETE /api/admin/users/[id]/discount — usuwanie rabatu", () => {
  it("zwraca 403 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await discountDELETE(
      makeRequest("DELETE", { discountId: "disc-1" }),
      makeParams({ id: "target-1" })
    );
    expect(res.status).toBe(403);
  });

  it("zwraca 403 dla non-admin", async () => {
    vi.mocked(auth).mockResolvedValue(USER_SESSION as any);
    const res = await discountDELETE(
      makeRequest("DELETE", { discountId: "disc-1" }),
      makeParams({ id: "target-1" })
    );
    expect(res.status).toBe(403);
  });

  it("usuwa rabat i zwraca { success: true }", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    vi.mocked(prisma.discount.deleteMany).mockResolvedValue({ count: 1 });

    const res = await discountDELETE(
      makeRequest("DELETE", { discountId: "disc-1" }),
      makeParams({ id: "target-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("deleteMany filtruje zarówno po id rabatu jak i userId — nie można usunąć cudzego rabatu", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    vi.mocked(prisma.discount.deleteMany).mockResolvedValue({ count: 0 });

    await discountDELETE(
      makeRequest("DELETE", { discountId: "disc-1" }),
      makeParams({ id: "target-1" })
    );

    const deleteCall = vi.mocked(prisma.discount.deleteMany).mock.calls[0][0];
    expect(deleteCall.where.id).toBe("disc-1");
    expect(deleteCall.where.userId).toBe("target-1");
  });
});

// ─── GET /api/subscription ────────────────────────────────────────────────────

describe("GET /api/subscription — dane subskrypcji", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await subscriptionGET();
    expect(res.status).toBe(401);
  });

  it("zwraca subscription, discounts, trialEndsAt i isFree", async () => {
    vi.mocked(auth).mockResolvedValue(USER_SESSION as any);
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription as any);
    vi.mocked(prisma.discount.findMany).mockResolvedValue([mockDiscount] as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      trialEndsAt: new Date("2026-06-01"),
      isFree: false,
    } as any);

    const res = await subscriptionGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subscription).toBeDefined();
    expect(body.subscription.plan).toBe("commercial");
    expect(body.discounts).toHaveLength(1);
    expect(body.trialEndsAt).toBeDefined();
    expect(body.isFree).toBe(false);
  });

  it("zwraca subscription=null gdy brak aktywnej subskrypcji", async () => {
    vi.mocked(auth).mockResolvedValue(USER_SESSION as any);
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.discount.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ trialEndsAt: null, isFree: false } as any);

    const res = await subscriptionGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subscription).toBeNull();
    expect(body.discounts).toHaveLength(0);
    expect(body.isFree).toBe(false);
  });

  it("zwraca isFree=true dla bezpłatnego konta", async () => {
    vi.mocked(auth).mockResolvedValue(USER_SESSION as any);
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.discount.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ trialEndsAt: null, isFree: true } as any);

    const res = await subscriptionGET();
    const body = await res.json();
    expect(body.isFree).toBe(true);
  });

  it("pobiera rabaty posortowane malejąco po createdAt", async () => {
    vi.mocked(auth).mockResolvedValue(USER_SESSION as any);
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ trialEndsAt: null, isFree: false } as any);
    vi.mocked(prisma.discount.findMany).mockResolvedValue([]);

    await subscriptionGET();

    const findManyCall = vi.mocked(prisma.discount.findMany).mock.calls[0][0];
    expect(findManyCall.where.userId).toBe("user-1");
    expect(findManyCall.orderBy).toEqual({ createdAt: "desc" });
  });
});

// ─── POST /api/subscription ───────────────────────────────────────────────────

describe("POST /api/subscription — aktywacja / zmiana planu", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await subscriptionPOST(makeRequest("POST", { plan: "standard" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 400 dla nieznanych planów", async () => {
    vi.mocked(auth).mockResolvedValue(USER_SESSION as any);
    const res = await subscriptionPOST(makeRequest("POST", { plan: "premium_ultra" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("akceptuje plan standard", async () => {
    vi.mocked(auth).mockResolvedValue(USER_SESSION as any);
    vi.mocked(prisma.subscription.upsert).mockResolvedValue({
      ...mockSubscription,
      plan: "standard",
    } as any);

    const res = await subscriptionPOST(makeRequest("POST", { plan: "standard" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subscription.plan).toBe("standard");
  });

  it("akceptuje plan commercial", async () => {
    vi.mocked(auth).mockResolvedValue(USER_SESSION as any);
    vi.mocked(prisma.subscription.upsert).mockResolvedValue(mockSubscription as any);

    const res = await subscriptionPOST(makeRequest("POST", {
      plan: "commercial",
      billingName: "Jan Kowalski",
      cardLast4: "4242",
      cardBrand: "Visa",
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subscription.plan).toBe("commercial");
  });

  it("akceptuje plan enterprise", async () => {
    vi.mocked(auth).mockResolvedValue(USER_SESSION as any);
    vi.mocked(prisma.subscription.upsert).mockResolvedValue({
      ...mockSubscription,
      plan: "enterprise",
    } as any);

    const res = await subscriptionPOST(makeRequest("POST", { plan: "enterprise" }));
    expect(res.status).toBe(200);
  });

  it("upsert — aktualizuje istniejącą subskrypcję (zmiana planu)", async () => {
    vi.mocked(auth).mockResolvedValue(USER_SESSION as any);
    vi.mocked(prisma.subscription.upsert).mockResolvedValue({
      ...mockSubscription,
      plan: "enterprise",
    } as any);

    const res = await subscriptionPOST(makeRequest("POST", { plan: "enterprise" }));
    expect(res.status).toBe(200);

    const upsertCall = vi.mocked(prisma.subscription.upsert).mock.calls[0][0];
    expect(upsertCall.where).toEqual({ userId: "user-1" });
    expect(upsertCall.create.plan).toBe("enterprise");
    expect(upsertCall.update.plan).toBe("enterprise");
    expect(upsertCall.create.status).toBe("active");
    expect(upsertCall.update.status).toBe("active");
  });

  it("zapisuje dane karty i rozliczenia", async () => {
    vi.mocked(auth).mockResolvedValue(USER_SESSION as any);
    vi.mocked(prisma.subscription.upsert).mockResolvedValue(mockSubscription as any);

    await subscriptionPOST(makeRequest("POST", {
      plan: "commercial",
      billingName: "Anna Nowak",
      billingEmail: "anna@firma.pl",
      cardLast4: "1234",
      cardBrand: "Mastercard",
    }));

    const upsertCall = vi.mocked(prisma.subscription.upsert).mock.calls[0][0];
    expect(upsertCall.create.billingName).toBe("Anna Nowak");
    expect(upsertCall.create.billingEmail).toBe("anna@firma.pl");
    expect(upsertCall.create.cardLast4).toBe("1234");
    expect(upsertCall.create.cardBrand).toBe("Mastercard");
  });

  it("ustawia null dla opcjonalnych pól gdy nie podano", async () => {
    vi.mocked(auth).mockResolvedValue(USER_SESSION as any);
    vi.mocked(prisma.subscription.upsert).mockResolvedValue({
      ...mockSubscription,
      billingName: null,
      cardLast4: null,
    } as any);

    await subscriptionPOST(makeRequest("POST", { plan: "standard" }));

    const upsertCall = vi.mocked(prisma.subscription.upsert).mock.calls[0][0];
    expect(upsertCall.create.billingName).toBeNull();
    expect(upsertCall.create.cardLast4).toBeNull();
  });
});
