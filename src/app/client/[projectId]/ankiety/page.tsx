"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ClipboardList, ChevronLeft, CheckCircle } from "@/components/ui/icons";

interface Survey {
  id: string;
  name: string;
  shareToken: string;
  createdAt: string;
  completed: boolean;
}

export default function ClientSurveysPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;
    if ((session?.user as any)?.role !== "client") { router.push("/dashboard"); return; }

    fetch(`/api/client/${projectId}/surveys`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setSurveys(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, session, projectId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Ładowanie...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href={`/client/${projectId}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <ClipboardList size={20} className="text-muted-foreground" />
            <h1 className="text-xl font-bold">Ankiety</h1>
          </div>
        </div>

        {surveys.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center space-y-2">
            <ClipboardList size={32} className="mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Brak dostępnych ankiet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{survey.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(survey.createdAt).toLocaleDateString("pl-PL")}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {survey.completed ? (
                    <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                      <CheckCircle size={14} />
                      Wypełniona
                    </div>
                  ) : (
                    <Link
                      href={`/share/survey/${survey.shareToken}`}
                      target="_blank"
                      className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Wypełnij
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
