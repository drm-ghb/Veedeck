import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { sendSurveyReminderEmail } from "@/lib/email";

const REMIND_INTERVAL_MS = 24 * 60 * 60 * 1000;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { id } = await params;
  const survey = await prisma.survey.findFirst({ where: { id, userId } });
  if (!survey) return NextResponse.json({ error: "Nie znaleziono" }, { status: 403 });

  // Rate limit: 24h between reminders
  if (survey.lastReminderAt) {
    const elapsed = Date.now() - new Date(survey.lastReminderAt).getTime();
    if (elapsed < REMIND_INTERVAL_MS) {
      return NextResponse.json(
        { error: "Przypomnienie można wysłać raz na 24 godziny.", nextAllowedMs: REMIND_INTERVAL_MS - elapsed },
        { status: 429 }
      );
    }
  }

  const body = await req.json().catch(() => ({}));
  const emails: string[] = Array.isArray(body.emails) ? body.emails : [];
  if (emails.length === 0) {
    return NextResponse.json({ error: "Brak adresów email" }, { status: 400 });
  }

  const APP_URL = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const shareLink = `${APP_URL}/share/survey/${survey.shareToken}`;

  let sent = 0;
  for (const email of emails) {
    if (!email?.includes("@")) continue;
    try {
      await sendSurveyReminderEmail({ to: email, surveyName: survey.name, shareLink });
      sent++;
    } catch {
      // skip failed sends
    }
  }

  await prisma.survey.update({ where: { id }, data: { lastReminderAt: new Date() } });

  return NextResponse.json({ success: true, sent });
}
