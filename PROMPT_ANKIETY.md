# Implementacja modułu Ankiety — instrukcja dla Claude Code

## Kontekst projektu

Aplikacja RenderFlow — platforma dla projektantów wnętrz. Stack:
- Next.js 16.2.1 (App Router), React 19.2.4
- Prisma 7.x z PostgreSQL — **`prisma db push` zamiast migracji** (nigdy `prisma migrate`)
- NextAuth v5 beta (`next-auth@^5.0.0-beta.30`)
- UI dialogi: `@base-ui/react` — **NIE Radix UI** (inne API!)
- Tailwind CSS v4, Lucide React, Sonner (toasty), @dnd-kit (drag & drop)
- Testy: Vitest (`npm test`)
- Język UI: **polski** (etykiety, komunikaty błędów, toasty)

## Krytyczne pułapki — przeczytaj przed kodowaniem

### 1. @base-ui/react — NIE używaj `<form onSubmit>` w dialogach
```tsx
// ❌ Nie działa — DialogClose przechwytuje submit
<form onSubmit={handleSubmit}>
  <Button type="submit">Zapisz</Button>
</form>

// ✅ Prawidłowy wzorzec (wzoruj się na AddFolderDialog.tsx)
<Button onClick={handleSubmit}>Zapisz</Button>
<Input onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
```

### 2. Next.js 16 — params jest Promise
```typescript
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // wymagane!
}
```

### 3. uniqueSlug w testach — zawsze mockuj
```typescript
vi.mock("@/lib/slug", () => ({
  uniqueSlug: vi.fn().mockResolvedValue("test-slug"),
}));
```
Bez mocka — pętla nieskończona → OOM.

### 4. Autoryzacja API
- 401 = brak sesji, 403 = brak dostępu do zasobu, 404 = nie znaleziono
- Zawsze sprawdzaj `session.user.id` i własność zasobu

### 5. Nie modyfikuj nic poza plikami wymienionymi w każdej fazie
Jeśli coś warto poprawić — wspomnij w komentarzu, nie zmieniaj.

---

## Schemat danych — docelowy

Dodaj do `prisma/schema.prisma` następujące modele (i relacje do istniejących):

```prisma
model Survey {
  id         String    @id @default(cuid())
  name       String
  slug       String    @unique
  shareToken String    @unique @default(cuid())
  status     String    @default("DRAFT") // DRAFT | ACTIVE | CLOSED
  archived   Boolean   @default(false)
  pinned     Boolean   @default(false)
  order      Int       @default(0)
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  projectId  String?
  project    Project?  @relation(fields: [projectId], references: [id], onDelete: SetNull)
  clientId   String?
  client     ProjectClient? @relation(fields: [clientId], references: [id], onDelete: SetNull)
  sections   SurveySection[]
  responses  SurveyResponse[]
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}

model SurveySection {
  id        String           @id @default(cuid())
  name      String
  order     Int              @default(0)
  surveyId  String
  survey    Survey           @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  questions SurveyQuestion[]
}

model SurveyQuestion {
  id          String         @id @default(cuid())
  label       String
  description String?
  type        String
  // typy: short_text | long_text | single_choice | multiple_choice | rating | yes_no | budget_range
  required    Boolean        @default(false)
  order       Int            @default(0)
  options     Json?          // ["opcja A", "opcja B"] dla choice types
  config      Json?          // { min: 1, max: 10 } dla rating; { min: 0, max: 100000 } dla budget_range
  sectionId   String?
  section     SurveySection? @relation(fields: [sectionId], references: [id], onDelete: SetNull)
  surveyId    String
  survey      Survey         @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  answers     SurveyAnswer[]
}

model SurveyResponse {
  id               String        @id @default(cuid())
  respondentEmail  String
  respondentName   String?
  completedAt      DateTime?     // null = partial save (niedokończone)
  surveyId         String
  survey           Survey        @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  answers          SurveyAnswer[]
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
}

model SurveyAnswer {
  id         String         @id @default(cuid())
  value      Json           // string | string[] | number — zależy od typu pytania
  questionId String
  question   SurveyQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
  responseId String
  response   SurveyResponse @relation(fields: [responseId], references: [id], onDelete: Cascade)
  createdAt  DateTime       @default(now())
}
```

**Dodaj relacje do istniejących modeli:**
```prisma
// w model User — dodaj:
surveys Survey[]

// w model Project — dodaj:
surveys Survey[]

// w model ProjectClient — dodaj:
surveys Survey[]
```

Po zmianach w schema.prisma uruchom: `npx prisma db push && npx prisma generate`

---

---

# FAZA 1 — Fundament: DB + listing + tworzenie ankiety

**Cel:** Projektant może tworzyć ankiety i widzieć je na liście. Brak edytora pytań — to Faza 2.

## Zadania Fazy 1

### 1.1 Schema Prisma
Dodaj modele i relacje opisane powyżej. Uruchom `npx prisma db push`.

### 1.2 API routes

**`src/app/api/surveys/route.ts`** — GET (lista) + POST (tworzenie)
- GET: zwraca `surveys` zalogowanego usera, z `_count: { responses: true }`, sortowane po `order`
- POST body: `{ name, projectId?, clientId? }` → tworzy Survey ze statusem `DRAFT`, generuje slug via `uniqueSlug()` z `@/lib/slug`

**`src/app/api/surveys/[id]/route.ts`** — GET (szczegóły) + PATCH (edycja) + DELETE
- Weryfikuj własność (`survey.userId === session.user.id`)
- PATCH pozwala zmieniać: `name`, `status`, `archived`, `pinned`, `order`, `projectId`, `clientId`
- DELETE: sprawdź czy nie ma `completedAt` responses (wypełnionych) — jeśli są, zwróć 409 z komunikatem

**`src/app/api/surveys/[id]/archive/route.ts`** — POST (toggle archived)

**`src/app/api/surveys/[id]/pin/route.ts`** — POST (toggle pinned)

### 1.3 Strona listingu

**`src/app/(dashboard)/ankiety/page.tsx`** — server component
- Pobiera sesję via `auth()`, sprawdza czy `session.user`
- Pobiera listę projektów usera (dla filtrów i dla dialogu tworzenia)
- Pobiera listę klientów (ProjectClient z relacją project) dla dialogu tworzenia
- Renderuje `<SurveysClient surveys={...} projects={...} clients={...} />`

**`src/components/ankiety/SurveysClient.tsx`** — client component
UI wzorowany na listingu list zakupowych:
- Toolbar: wyszukiwanie (input), sortowanie (ręczne/A-Z/data), przełącznik widoku (grid/lista)
- Tabs: "Aktywne" / "Zarchiwizowane"
- Grid view: karty 3-kolumnowe (md:grid-cols-3)
- List view: tabela
- Przycisk "+ Nowa ankieta" otwiera `NewSurveyDialog`

**Karta ankiety** (grid i lista) zawiera:
- Nazwa ankiety
- Status badge: `Szkic` (szary) / `Aktywna` (zielony) / `Zamknięta` (czerwony)
- Projekt (jeśli przypisany)
- Klient (jeśli przypisany)
- Data utworzenia
- Liczba odpowiedzi (z `_count.responses`)
- Dropdown menu: Edytuj, Kopiuj link (tylko dla ACTIVE), Archiwizuj/Przywróć, Usuń

### 1.4 Dialog tworzenia

**`src/components/ankiety/NewSurveyDialog.tsx`**

Pola:
- Nazwa ankiety (wymagana)
- Przypisz do projektu (opcjonalne) — Select z listą projektów usera
- Gdy wybrany projekt → pojawia się "Przypisz do klienta" — Select z klientami tego projektu
- Checkbox/toggle: "Ankieta bez przypisania do klienta" — gdy zaznaczony, pola projekt/klient są ukryte; generowany będzie publiczny link

Logika:
- Bez przypisania klienta: `clientId = null`, dostęp przez publiczny link (shareToken)
- Z klientem: `clientId = X`, ankieta widoczna w panelu klienta

Po utworzeniu: `router.refresh()` + toast "Ankieta utworzona" + redirect do `/ankiety/[id]/edytuj`

### 1.5 Nawigacja

Dodaj "Ankiety" do `src/components/dashboard/NavSidebar.tsx` — znajdź gdzie są inne pozycje menu (Listy, Zadania itp.) i dodaj analogicznie z ikoną `ClipboardList` z lucide-react.

Sprawdź też `src/components/dashboard/MobileMenu.tsx` i dodaj tam też.

---

## Testy Fazy 1

Lokalizacja: `src/__tests__/api/surveys.test.ts`

Wzorzec testów (wzoruj się na istniejących plikach w `src/__tests__/api/`):

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    survey: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock("@/lib/slug", () => ({ uniqueSlug: vi.fn().mockResolvedValue("test-slug") }));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { makeRequest, makeParams, SESSION } from "../helpers";
```

**Przypadki testowe dla `GET /api/surveys`:**
- 401 gdy brak sesji
- 200 + lista ankiet usera

**Przypadki testowe dla `POST /api/surveys`:**
- 401 gdy brak sesji
- 400 gdy brak nazwy
- 201 + nowa ankieta (ze slugiem, shareToken, status DRAFT)

**Przypadki testowe dla `PATCH /api/surveys/[id]`:**
- 401 gdy brak sesji
- 403 gdy ankieta należy do innego usera
- 200 + zaktualizowana ankieta

**Przypadki testowe dla `DELETE /api/surveys/[id]`:**
- 401 gdy brak sesji
- 403 gdy nie właściciel
- 409 gdy są wypełnione responses (completedAt != null)
- 200 gdy brak wypełnionych responses

**Po Fazie 1 uruchom:** `npm test` — wszystkie testy muszą przejść.

---

---

# FAZA 2 — Edytor pytań + szablony

**Cel:** Projektant może budować formularz — dodawać/edytować/usuwać pytania, tworzyć sekcje, korzystać z szablonów.

## Zadania Fazy 2

### 2.1 API routes — pytania i sekcje

**`src/app/api/surveys/[id]/questions/route.ts`** — GET + POST
- POST body: `{ label, type, required?, description?, options?, config?, sectionId?, order? }`
- Weryfikuj własność survey

**`src/app/api/surveys/[id]/questions/[questionId]/route.ts`** — PATCH + DELETE
- PATCH: label, description, required, options, config, order
- DELETE: usuwa pytanie

**`src/app/api/surveys/[id]/questions/reorder/route.ts`** — POST
- Body: `{ questions: [{ id, order }] }` — masowa aktualizacja kolejności

**`src/app/api/surveys/[id]/sections/route.ts`** — GET + POST
- POST body: `{ name, order? }`

**`src/app/api/surveys/[id]/sections/[sectionId]/route.ts`** — PATCH + DELETE

### 2.2 Strona edytora

**`src/app/(dashboard)/ankiety/[id]/edytuj/page.tsx`** — server component
- Sprawdza autoryzację, pobiera survey z sekcjami i pytaniami
- Renderuje `<SurveyEditor survey={...} />`

**`src/components/ankiety/SurveyEditor.tsx`** — główny klient edytora
Układ: lewa kolumna (lista pytań + sekcje) + prawa kolumna (panel konfiguracji zaznaczonego pytania)

Funkcje:
- Dodawanie pytania (pasek z typami na dole lub przycisk "+")
- Drag & drop kolejności pytań (`@dnd-kit`) — przy upuszczeniu wywołaj `reorder` endpoint
- Kliknięcie pytania → panel konfiguracji po prawej
- Przycisk "Dodaj sekcję" — dialog z nazwą
- Status survey (DRAFT/ACTIVE/CLOSED) — przełącznik na górze strony
- Przycisk "Podgląd" → `/ankiety/[id]/podglad`

**Typy pytań i ich konfiguracja:**

| Typ | Opcje konfiguracji |
|---|---|
| `short_text` | placeholder (opcjonalny) |
| `long_text` | placeholder (opcjonalny) |
| `single_choice` | lista opcji (dodaj/usuń), min 2 |
| `multiple_choice` | lista opcji (dodaj/usuń), min 2 |
| `rating` | min (domyślnie 1), max (domyślnie 5) — zapisz w `config` |
| `yes_no` | brak dodatkowej konfiguracji |
| `budget_range` | min (domyślnie 0), max (domyślnie 200000), krok (domyślnie 1000) — zapisz w `config` |

Każde pytanie ma: etykietę, opis pomocniczy (opcjonalny), flagę "wymagane".

### 2.3 Szablony wbudowane

**`src/lib/surveyTemplates.ts`** — plik z definicjami szablonów (nie DB, statyczne dane)

Zdefiniuj 3 szablony jako tablicę obiektów `SurveyTemplate[]`:

**Szablon 1: "Onboarding klienta"**
Sekcje i pytania:
- Sekcja "O projekcie":
  - "Jakie pomieszczenia obejmuje projekt?" (multiple_choice): Salon, Kuchnia, Sypialnia, Łazienka, Korytarz, Gabinet, Inne
  - "Jaki jest planowany termin realizacji?" (single_choice): Do 3 miesięcy, 3–6 miesięcy, 6–12 miesięcy, Powyżej roku, Nie wiem jeszcze
  - "Czy mieszkanie/dom jest nowe czy do remontu?" (single_choice): Nowe (deweloperski stan), Do remontu (istniejące)
- Sekcja "Budżet":
  - "Jaki jest Twój całkowity budżet na projekt?" (budget_range, config: { min: 0, max: 500000, step: 5000 })
  - "Czy budżet obejmuje meble i dekoracje?" (yes_no)
- Sekcja "Styl i preferencje":
  - "Jaki styl wnętrz Ci odpowiada?" (multiple_choice): Minimalistyczny, Skandynawski, Industrialny, Klasyczny/Hampton, Nowoczesny, Boho, Nie mam preferencji
  - "Preferowane kolory ścian" (single_choice): Jasne/neutralne, Ciemne/głębokie, Kolorowe akcenty, Brak preferencji
  - "Czy masz dzieci lub zwierzęta?" (yes_no)
  - "Dodatkowe uwagi i inspiracje" (long_text, niewymagane)

**Szablon 2: "Ocena projektu"**
Bez sekcji:
- "Jak oceniasz współpracę?" (rating, config: { min: 1, max: 5 })
- "Czy projekt spełnił Twoje oczekiwania?" (yes_no)
- "Co najbardziej podobało Ci się w projekcie?" (long_text)
- "Co moglibyśmy poprawić?" (long_text, niewymagane)
- "Czy polecił(a)byś nas znajomym?" (yes_no)

**Szablon 3: "Szybka ankieta konceptu"**
Bez sekcji:
- "Który kierunek stylistyczny preferujesz?" (single_choice): Kierunek A, Kierunek B, Kierunek C, Podoba mi się każdy
- "Czy paleta kolorów jest odpowiednia?" (yes_no)
- "Twoje uwagi do konceptu" (long_text, niewymagane)

**`src/components/ankiety/SurveyTemplateDialog.tsx`** — dialog wyboru szablonu
- Otwierany przyciskiem "Zacznij od szablonu" (w pustym edytorze)
- Karty szablonów z nazwą i skrótowym opisem
- Po wyborze: POST do API — tworzy sekcje i pytania z szablonu

### 2.4 API — apply template

**`src/app/api/surveys/[id]/apply-template/route.ts`** — POST
- Body: `{ templateId: "onboarding" | "ocena" | "koncept" }`
- Sprawdza czy survey nie ma jeszcze pytań (jeśli ma — 409 z komunikatem)
- Tworzy sekcje i pytania z definicji w `surveyTemplates.ts`
- Transakcja Prisma (`prisma.$transaction`)

---

## Testy Fazy 2

`src/__tests__/api/survey-questions.test.ts`:
- POST /questions — 401, 403, 201 (z typem i walidacją)
- PATCH /questions/[questionId] — 403, 200
- DELETE /questions/[questionId] — 403, 200
- POST /questions/reorder — 200

`src/__tests__/api/survey-sections.test.ts`:
- POST /sections — 201
- PATCH + DELETE /sections/[sectionId]

`src/__tests__/api/survey-apply-template.test.ts`:
- 200 — tworzy pytania z szablonu
- 409 — gdy ankieta ma już pytania

**Po Fazie 2 uruchom:** `npm test`

---

---

# FAZA 3 — Widok klienta (publiczny link + panel klienta)

**Cel:** Klient może wypełnić ankietę. Dwa tryby dostępu: publiczny link (e-mail gate) i panel klienta.

## Zadania Fazy 3

### 3.1 Publiczny widok ankiety

**`src/app/share/survey/[token]/page.tsx`** — server component

Logika dostępu:
1. Pobierz `Survey` po `shareToken` (z pytaniami i sekcjami, status ACTIVE — jeśli DRAFT lub CLOSED → 404)
2. Sprawdź `clientId`:
   - `clientId` ustawiony → sprawdź czy zalogowany user to ten klient → jeśli nie zalogowany, redirect do loginu klienta
   - `clientId` null → tryb publiczny → renderuj `<SurveyEmailGate />`

**`src/components/ankiety/share/SurveyEmailGate.tsx`**
- Formularz z polem e-mail + przycisk "Rozpocznij"
- Po wpisaniu e-mail: POST `/api/share/survey/[token]/start` — sprawdza czy response z tym e-mailem już istnieje
  - Jeśli istnieje i `completedAt != null` → komunikat "Ankieta już wypełniona"
  - Jeśli istnieje i `completedAt == null` → wczytuje partial save, otwiera formularz
  - Jeśli nie istnieje → tworzy nowy `SurveyResponse`, otwiera formularz

**`src/components/ankiety/share/SurveyForm.tsx`** — główny formularz
- Jedna sekcja/strona na raz (lub wszystkie — do konfiguracji, domyślnie wszystkie naraz)
- Progress bar (liczba sekcji lub pytań)
- Każde pytanie renderuje odpowiedni komponent inputa:
  - `short_text` → `<Input />`
  - `long_text` → `<Textarea />`
  - `single_choice` → radio buttons
  - `multiple_choice` → checkboxy
  - `rating` → gwiazdki lub przyciski 1–N
  - `yes_no` → dwa przyciski "Tak" / "Nie"
  - `budget_range` → slider + input liczbowy z wartością w PLN
- Walidacja wymaganych pytań przed przejściem dalej / submitem
- Auto-save co 30 sekund (PUT `/api/share/survey/[token]/response`) — partial save
- Przycisk "Wyślij ankietę" → ustawia `completedAt`
- Po wysłaniu: ekran potwierdzenia z logo projektanta

### 3.2 API publiczne (bez autoryzacji NextAuth)

**`src/app/api/share/survey/[token]/start/route.ts`** — POST
- Body: `{ email, name? }`
- Weryfikuje `shareToken`, sprawdza status ACTIVE
- Sprawdza e-mail: NIE waliduje czy jest w bazie (tryb publiczny = dowolny e-mail)
- Deduplikacja: `findFirst({ where: { surveyId, respondentEmail: email } })`
- Zwraca `{ responseId, existingAnswers?, completed: boolean }`

**`src/app/api/share/survey/[token]/response/route.ts`** — PUT (partial save) + POST (submit)
- PUT: body `{ responseId, answers: [{ questionId, value }] }` — upsert answers, NIE ustawia `completedAt`
- POST: body `{ responseId, answers }` — upsert answers + ustawia `completedAt = now()` + wysyła powiadomienie e-mail do projektanta (Faza 4)
- Weryfikuj że `response.survey.shareToken === token`
- Weryfikuj że `completedAt` jest null (nie można wysłać dwa razy)

### 3.3 Panel klienta — moduł Ankiety

**`src/app/client/[projectId]/ankiety/page.tsx`** (lub analogiczna ścieżka do istniejącego panelu klienta — sprawdź jak są zbudowane inne moduły klienta w `src/app/client/` lub `src/app/share/`)

Logika: pobierz wszystkie `Survey` gdzie `clientId` to zalogowany klient i `status = ACTIVE`.

Lista ankiet klienta:
- Karta ankiety: nazwa, projekt, data, status wypełnienia ("Do wypełnienia" / "Wypełniona")
- Kliknięcie → otwiera formularz (lub widok read-only jeśli już wypełniona)

**Widok read-only** — po wypełnieniu klient widzi swoje odpowiedzi (nie może edytować).

### 3.4 Partial save — mechanizm

`SurveyResponse.completedAt = null` → w trakcie wypełniania
`SurveyResponse.completedAt = DateTime` → zakończona

Gdy klient wraca przez ten sam e-mail → `SurveyEmailGate` wykrywa istniejący response (partial) i wczytuje zapisane odpowiedzi do formularza.

---

## Testy Fazy 3

`src/__tests__/api/survey-share.test.ts`:
- POST /start — tworzy nowy response
- POST /start — wykrywa duplikat (ten sam e-mail)
- POST /start — błąd 404 dla DRAFT survey
- POST /start — błąd 404 dla CLOSED survey
- PUT /response — zapisuje odpowiedzi (partial save)
- POST /response — finalizuje ankietę (ustawia completedAt)
- POST /response — 409 gdy już wypełniona (completedAt != null)

**Po Fazie 3 uruchom:** `npm test`

---

---

# FAZA 4 — Widok odpowiedzi + powiadomienia + remindery

**Cel:** Projektant widzi odpowiedzi. Klient dostaje e-mail po wysłaniu ankiety. Projektant może wysłać reminder.

## Zadania Fazy 4

### 4.1 Widok odpowiedzi — strona projektanta

**`src/app/(dashboard)/ankiety/[id]/odpowiedzi/page.tsx`** — server component
- Sprawdza autoryzację, pobiera survey z responses (tylko `completedAt != null`) i answers

**`src/components/ankiety/SurveyResponsesView.tsx`** — client component

Dwa widoki (tabsy):
- **"Przegląd"** — aggregacja dla pytań zamkniętych:
  - `single_choice` / `multiple_choice` / `yes_no`: słupki z % odpowiedzi
  - `rating`: średnia ocena + rozkład
  - `budget_range`: median, min, max
- **"Odpowiedzi"** — tabela respondentów: e-mail, data, akcja "Zobacz"

Kliknięcie respondenta → modal z jego pełnymi odpowiedziami.

Eksport: przycisk "Eksportuj CSV" — pobiera `/api/surveys/[id]/export`

### 4.2 API — odpowiedzi i eksport

**`src/app/api/surveys/[id]/responses/route.ts`** — GET
- Zwraca responses z answers, tylko zalogowany właściciel
- Filtr: `completedAt != null`

**`src/app/api/surveys/[id]/export/route.ts`** — GET
- Zwraca CSV: kolumny = pytania, wiersze = respondenci
- Content-Type: `text/csv`, Content-Disposition: `attachment; filename="ankieta-[slug].csv"`

### 4.3 Powiadomienie e-mail do projektanta

**Trigger:** POST `/api/share/survey/[token]/response` (submit) → wyślij e-mail.

Projekt używa już powiadomień e-mail — sprawdź jak są zaimplementowane w `src/lib/` lub `src/app/api/notifications/`. Użyj tego samego mechanizmu.

Treść e-maila do projektanta:
- Temat: "Nowa odpowiedź na ankietę: [nazwa ankiety]"
- Treść: imię/e-mail respondenta, nazwa ankiety, link do `/ankiety/[id]/odpowiedzi`

Sprawdź `User.emailNotifEnabled` i `User.emailNotifModules` — wysyłaj tylko jeśli aktywne (lub dodaj "ankiety" do listy modułów).

### 4.4 Reminder do klienta

**`src/app/api/surveys/[id]/remind/route.ts`** — POST
- Weryfikuj własność survey
- Sprawdź czy survey ma `clientId` (tylko tryb z klientem) lub weź e-mail z istniejącego partial response
- Wyślij e-mail z linkiem do ankiety
- Rate limit: nie pozwól wysyłać częściej niż raz na 24h (przechowaj `lastReminderAt` — dodaj pole do Survey lub sprawdź przez responses)
- Zwróć 429 jeśli za wcześnie

Przycisk "Wyślij przypomnienie" dodaj do karty/szczegółów ankiety w listingu.

### 4.5 Pole `lastReminderAt` w Survey

Dodaj do modelu `Survey` w schema.prisma:
```prisma
lastReminderAt DateTime?
```
Po zmianie: `npx prisma db push`.

---

## Testy Fazy 4

`src/__tests__/api/survey-responses.test.ts`:
- GET /responses — 401, 403, 200 (tylko completed)

`src/__tests__/api/survey-remind.test.ts`:
- POST /remind — 200 wysyła e-mail
- POST /remind — 429 gdy < 24h od ostatniego

`src/__tests__/api/survey-export.test.ts`:
- GET /export — 200 + content-type CSV
- GET /export — 403 dla nieautoryzowanego

**Po Fazie 4 uruchom:** `npm test` — wszystkie testy muszą przejść.

---

---

## Podsumowanie plików do stworzenia

### Prisma
- `prisma/schema.prisma` — dodaj modele Survey, SurveySection, SurveyQuestion, SurveyResponse, SurveyAnswer

### API (src/app/api/)
- `surveys/route.ts`
- `surveys/[id]/route.ts`
- `surveys/[id]/archive/route.ts`
- `surveys/[id]/pin/route.ts`
- `surveys/[id]/questions/route.ts`
- `surveys/[id]/questions/[questionId]/route.ts`
- `surveys/[id]/questions/reorder/route.ts`
- `surveys/[id]/sections/route.ts`
- `surveys/[id]/sections/[sectionId]/route.ts`
- `surveys/[id]/apply-template/route.ts`
- `surveys/[id]/responses/route.ts`
- `surveys/[id]/export/route.ts`
- `surveys/[id]/remind/route.ts`
- `share/survey/[token]/start/route.ts`
- `share/survey/[token]/response/route.ts`

### Strony (src/app/)
- `(dashboard)/ankiety/page.tsx`
- `(dashboard)/ankiety/[id]/edytuj/page.tsx`
- `(dashboard)/ankiety/[id]/odpowiedzi/page.tsx`
- `share/survey/[token]/page.tsx`
- panel klienta: ankiety (sprawdź strukturę istniejącego panelu klienta)

### Komponenty (src/components/ankiety/)
- `SurveysClient.tsx`
- `NewSurveyDialog.tsx`
- `SurveyEditor.tsx`
- `SurveyTemplateDialog.tsx`
- `SurveyResponsesView.tsx`
- `share/SurveyEmailGate.tsx`
- `share/SurveyForm.tsx`

### Lib
- `src/lib/surveyTemplates.ts`

### Testy (src/__tests__/api/)
- `surveys.test.ts`
- `survey-questions.test.ts`
- `survey-sections.test.ts`
- `survey-apply-template.test.ts`
- `survey-share.test.ts`
- `survey-responses.test.ts`
- `survey-remind.test.ts`
- `survey-export.test.ts`

---

## Zasady ogólne (nie zmieniaj bez potrzeby)

- Nie modyfikuj istniejących komponentów poza dodaniem linku do Ankiety w NavSidebar i MobileMenu
- Nie zmieniaj istniejących API routes
- Każda faza kończy się `npm test` — wszystkie testy muszą przejść zanim zaczniesz kolejną fazę
- Używaj `router.refresh()` po mutacjach w komponentach klienckich
- Toasty przez `sonner` (`import { toast } from "sonner"`)
- Ikony tylko z `lucide-react`
- Nie używaj `<form onSubmit>` w dialogach @base-ui/react
