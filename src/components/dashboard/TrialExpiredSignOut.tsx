"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "@/components/ui/icons";

export default function TrialExpiredSignOut() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-2 text-sm transition-colors px-3 py-1.5 rounded-lg"
      style={{ color: "#6b7280" }}
    >
      <LogOut size={15} />
      Wyloguj
    </button>
  );
}
