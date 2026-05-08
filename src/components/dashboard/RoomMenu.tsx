"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Archive, Trash2, Pin, PinOff, Download } from "@/components/ui/icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EditRoomDialog from "./EditRoomDialog";

interface RoomMenuProps {
  room: {
    id: string;
    name: string;
    type: string;
    icon?: string | null;
    pinned?: boolean;
  };
}

export default function RoomMenu({ room }: RoomMenuProps) {
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  async function handlePin() {
    const res = await fetch(`/api/rooms/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !room.pinned }),
    });
    if (res.ok) {
      toast.success(room.pinned ? "Odpięto pomieszczenie" : "Pomieszczenie przypięte");
      router.refresh();
    } else {
      toast.error("Błąd operacji");
    }
  }

  async function handleArchive() {
    const res = await fetch(`/api/rooms/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (res.ok) {
      toast.success("Pomieszczenie zarchiwizowane");
      router.refresh();
    } else {
      toast.error("Błąd archiwizacji");
    }
  }

  async function handleDelete() {
    if (!confirm(`Usunąć pomieszczenie "${room.name}"?`)) return;
    const res = await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Pomieszczenie usunięte");
      router.refresh();
    } else {
      toast.error("Błąd usuwania");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-white/80 transition-colors"
          onClick={(e) => e.preventDefault()}
        >
          <MoreHorizontal size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handlePin}>
            {room.pinned ? <PinOff size={14} /> : <Pin size={14} />}
            {room.pinned ? "Odepnij" : "Przypnij"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { window.location.href = `/api/rooms/${room.id}/download`; }}>
            <Download size={14} />
            Pobierz
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil size={14} />
            Edytuj
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleArchive}>
            <Archive size={14} />
            Archiwizuj
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 size={14} />
            Usuń
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditRoomDialog
        room={room}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
