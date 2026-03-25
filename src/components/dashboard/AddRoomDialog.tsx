"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { ROOM_TYPE_LABELS, ICON_OPTIONS, getRoomIcon, type RoomType } from "@/lib/roomIcons";

const ROOM_TYPES = Object.entries(ROOM_TYPE_LABELS) as [RoomType, string][];

interface AddRoomDialogProps {
  projectId: string;
}

export default function AddRoomDialog({ projectId }: AddRoomDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<RoomType>("INNE");
  const [icon, setIcon] = useState<string>("INNE");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const SelectedIcon = getRoomIcon(null, icon);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name: name.trim(), type, icon }),
      });

      if (!res.ok) throw new Error();

      toast.success(`Pomieszczenie "${name.trim()}" dodane`);
      setOpen(false);
      setName("");
      setType("INNE");
      setIcon("INNE");
      router.refresh();
    } catch {
      toast.error("Błąd dodawania pomieszczenia");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        + Dodaj
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nowe pomieszczenie</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="roomName">Nazwa *</Label>
            <Input
              id="roomName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Kuchnia główna, Sypialnia 1..."
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Typ pomieszczenia</Label>
            <DropdownMenu>
              <DropdownMenuTrigger type="button" className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm hover:border-gray-400 transition-colors">
                <span className="text-gray-700">{ROOM_TYPE_LABELS[type]}</span>
                <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                {ROOM_TYPES.map(([value, label]) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => setType(value)}
                    className={type === value ? "bg-gray-100 font-medium" : ""}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-1.5">
            <Label>Ikona</Label>
            <div className="grid grid-cols-4 gap-2">
              {ICON_OPTIONS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  title={label}
                  onClick={() => setIcon(key)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-xs ${
                    icon === key
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-400"
                  }`}
                >
                  <Icon size={20} className={icon === key ? "text-white" : "text-orange-400"} />
                  <span className="truncate w-full text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Dodawanie..." : "Dodaj"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
