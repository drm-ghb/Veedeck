import { NextResponse } from "next/server";
import { validateExtensionKey } from "@/lib/extension-auth";

export async function GET(req: Request) {
  const user = await validateExtensionKey(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ id: user.id, name: user.name, email: user.email });
}
