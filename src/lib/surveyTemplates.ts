export type QuestionType =
  | "short_text"
  | "long_text"
  | "single_choice"
  | "multiple_choice"
  | "rating"
  | "yes_no"
  | "budget_range";

export interface TemplateQuestion {
  label: string;
  type: QuestionType;
  required: boolean;
  description?: string;
  options?: string[];
  config?: Record<string, number>;
}

export interface TemplateSection {
  name: string;
  questions: TemplateQuestion[];
}

export interface SurveyTemplate {
  id: string;
  name: string;
  description: string;
  sections: TemplateSection[];
  /** Questions not in any section */
  questions: TemplateQuestion[];
}

export const surveyTemplates: SurveyTemplate[] = [
  {
    id: "onboarding",
    name: "Onboarding klienta",
    description: "Zbierz kluczowe informacje o projekcie, budżecie i preferencjach stylistycznych klienta.",
    questions: [],
    sections: [
      {
        name: "O projekcie",
        questions: [
          {
            label: "Jakie pomieszczenia obejmuje projekt?",
            type: "multiple_choice",
            required: true,
            options: ["Salon", "Kuchnia", "Sypialnia", "Łazienka", "Korytarz", "Gabinet", "Inne"],
          },
          {
            label: "Jaki jest planowany termin realizacji?",
            type: "single_choice",
            required: true,
            options: ["Do 3 miesięcy", "3–6 miesięcy", "6–12 miesięcy", "Powyżej roku", "Nie wiem jeszcze"],
          },
          {
            label: "Czy mieszkanie/dom jest nowe czy do remontu?",
            type: "single_choice",
            required: true,
            options: ["Nowe (deweloperski stan)", "Do remontu (istniejące)"],
          },
        ],
      },
      {
        name: "Budżet",
        questions: [
          {
            label: "Jaki jest Twój całkowity budżet na projekt?",
            type: "budget_range",
            required: true,
            config: { min: 0, max: 500000, step: 5000 },
          },
          {
            label: "Czy budżet obejmuje meble i dekoracje?",
            type: "yes_no",
            required: true,
          },
        ],
      },
      {
        name: "Styl i preferencje",
        questions: [
          {
            label: "Jaki styl wnętrz Ci odpowiada?",
            type: "multiple_choice",
            required: true,
            options: ["Minimalistyczny", "Skandynawski", "Industrialny", "Klasyczny/Hampton", "Nowoczesny", "Boho", "Nie mam preferencji"],
          },
          {
            label: "Preferowane kolory ścian",
            type: "single_choice",
            required: true,
            options: ["Jasne/neutralne", "Ciemne/głębokie", "Kolorowe akcenty", "Brak preferencji"],
          },
          {
            label: "Czy masz dzieci lub zwierzęta?",
            type: "yes_no",
            required: true,
          },
          {
            label: "Dodatkowe uwagi i inspiracje",
            type: "long_text",
            required: false,
          },
        ],
      },
    ],
  },
  {
    id: "ocena",
    name: "Ocena projektu",
    description: "Krótka ankieta satysfakcji po zakończeniu współpracy z klientem.",
    sections: [],
    questions: [
      { label: "Jak oceniasz współpracę?", type: "rating", required: true, config: { min: 1, max: 5 } },
      { label: "Czy projekt spełnił Twoje oczekiwania?", type: "yes_no", required: true },
      { label: "Co najbardziej podobało Ci się w projekcie?", type: "long_text", required: true },
      { label: "Co moglibyśmy poprawić?", type: "long_text", required: false },
      { label: "Czy polecił(a)byś nas znajomym?", type: "yes_no", required: true },
    ],
  },
  {
    id: "koncept",
    name: "Szybka ankieta konceptu",
    description: "Zbierz szybki feedback od klienta po prezentacji konceptu.",
    sections: [],
    questions: [
      {
        label: "Który kierunek stylistyczny preferujesz?",
        type: "single_choice",
        required: true,
        options: ["Kierunek A", "Kierunek B", "Kierunek C", "Podoba mi się każdy"],
      },
      { label: "Czy paleta kolorów jest odpowiednia?", type: "yes_no", required: true },
      { label: "Twoje uwagi do konceptu", type: "long_text", required: false },
    ],
  },
];
