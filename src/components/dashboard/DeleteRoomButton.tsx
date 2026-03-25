"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";

interface DeleteRoomButtonProps {
  roomId: string;
  roomName: string;
}

export default function DeleteRoomButton({ roomId, roomName }: DeleteRoomButtonProps) {
  const router = useRouter();

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Usunąć pomieszczenie "${roomName}"?`)) return;

    const res = await fetch(`/api/rooms/${roomId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Pomieszczenie usunięte");
      router.refresh();
    } else {
      toast.error("Błąd usuwania");
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="text-gray-400 hover:text-red-500 transition-colors ml-1"
      title="Usuń pomieszczenie"
    >
      <X size={14} />
    </button>
  );
}
