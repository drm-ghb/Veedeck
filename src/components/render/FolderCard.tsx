"use client";

import Link from "next/link";
import { Folder, Pin } from "lucide-react";
import FolderMenu from "./FolderMenu";

interface FolderCardProps {
  folder: { id: string; name: string; renderCount: number; pinned: boolean };
  projectId: string;
  roomId: string;
}

export default function FolderCard({ folder, projectId, roomId }: FolderCardProps) {
  const count = folder.renderCount;

  return (
    <Link
      href={`/projects/${projectId}/rooms/${roomId}/folders/${folder.id}`}
      className="group relative bg-white dark:bg-card border border-gray-100 dark:border-border rounded-2xl p-5 shadow-sm hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-[#19213D]/30 transition-all"
    >
      <div className="w-14 h-14 bg-gray-100 dark:bg-muted rounded-xl flex items-center justify-center mb-4 group-hover:bg-gray-200 dark:group-hover:bg-muted/80 transition-colors">
        <Folder size={28} className="text-[#19213D] dark:text-foreground" />
      </div>
      <p className="font-semibold text-gray-800 dark:text-foreground truncate flex items-center gap-1.5">
        {folder.pinned && <Pin size={13} className="text-red-500 fill-red-500 shrink-0 translate-y-px" />}
        {folder.name}
      </p>
      <p className="text-xs text-gray-400 mt-1">
        {count} plik{count === 1 ? "" : count < 5 ? "i" : "ów"}
      </p>
      <div
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.preventDefault()}
      >
        <FolderMenu folder={{ id: folder.id, name: folder.name, pinned: folder.pinned }} />
      </div>
    </Link>
  );
}
