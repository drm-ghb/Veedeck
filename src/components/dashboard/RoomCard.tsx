"use client";

import Link from "next/link";
import { getRoomIcon } from "@/lib/roomIcons";
import RoomMenu from "./RoomMenu";

interface RoomCardProps {
  room: {
    id: string;
    name: string;
    type: string;
    icon?: string | null;
    _count: { renders: number };
  };
  projectId: string;
}

export default function RoomCard({ room, projectId }: RoomCardProps) {
  const Icon = getRoomIcon(room.type, room.icon);
  const count = room._count.renders;

  return (
    <Link
      href={`/projects/${projectId}/rooms/${room.id}`}
      className="group relative bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-orange-200 transition-all"
    >
      {/* Icon */}
      <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-100 transition-colors">
        <Icon size={28} className="text-orange-400" />
      </div>

      {/* Name */}
      <p className="font-semibold text-gray-800 truncate">{room.name}</p>

      {/* Count */}
      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
        <span>☰</span>
        {count} render{count === 1 ? "" : count < 5 ? "y" : "ów"}
      </p>

      {/* Menu */}
      <div
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.preventDefault()}
      >
        <RoomMenu room={{ id: room.id, name: room.name, type: room.type, icon: room.icon }} />
      </div>
    </Link>
  );
}
