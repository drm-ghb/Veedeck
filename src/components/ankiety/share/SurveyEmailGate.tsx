"use client";

import { useState } from "react";
import { Mail } from "@/components/ui/icons";
import SurveyForm from "./SurveyForm";
import type { SurveyQuestion, SurveySection } from "../SurveyEditor";

interface Answer {
  id: string;
  questionId: string;
  value: unknown;
}

interface Props {
  token: string;
  survey: {
    id: string;
    name: string;
    sections: SurveySection[];
    questions: SurveyQuestion[];
  };
}

type Stage =
  | { type: "gate" }
  | { type: "completed" }
  | { type: "form"; responseId: string; existingAnswers: Answer[] };

export default function SurveyEmailGate({ token, survey }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState<Stage>({ type: "gate" });

  async function handleStart() {
    if (!email.trim()) { setError("Wpisz adres e-mail."); return; }
    if (!email.includes("@")) { setError("Podaj poprawny adres e-mail."); return; }
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/share/survey/${token}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Nie udało się rozpocząć ankiety.");
        return;
      }

      if (data.completed) {
        setStage({ type: "completed" });
      } else {
        setStage({ type: "form", responseId: data.responseId, existingAnswers: data.existingAnswers ?? [] });
      }
    } catch {
      setError("Błąd połączenia. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  if (stage.type === "completed") {
    return (
      <div className="bg-card border border-border rounded-2xl p-10 text-center space-y-3">
        <div className="text-4xl">✓</div>
        <h2 className="text-xl font-bold">Ankieta już wypełniona</h2>
        <p className="text-sm text-muted-foreground">
          Twoje odpowiedzi zostały wcześniej zapisane. Dziękujemy za udział!
        </p>
      </div>
    );
  }

  if (stage.type === "form") {
    return (
      <SurveyForm
        token={token}
        survey={survey}
        responseId={stage.responseId}
        existingAnswers={stage.existingAnswers}
      />
    );
  }

  // Gate — email form
  return (
    <div className="bg-card border border-border rounded-2xl p-8 space-y-5">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Mail size={18} />
        Aby wypełnić ankietę, podaj swój adres e-mail.
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Adres e-mail *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            placeholder="twoj@email.com"
            disabled={loading}
            className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Imię i nazwisko <span className="font-normal text-muted-foreground">(opcjonalne)</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            placeholder="Jan Kowalski"
            disabled={loading}
            className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <button
        onClick={handleStart}
        disabled={loading || !email.trim()}
        className="w-full py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Sprawdzanie..." : "Rozpocznij ankietę"}
      </button>
    </div>
  );
}
