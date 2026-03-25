"use client";

import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ShareDialogProps {
  shareUrl: string;
}

export default function ShareDialog({ shareUrl }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <Share2 size={15} />
        Udostępnij
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Udostępnij projekt</DialogTitle>
          <DialogDescription>
            Udostępnij ten link klientowi, aby mógł zobaczyć projekt i dodawać komentarze.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input readOnly value={shareUrl} className="text-xs" />
          <Button variant="outline" size="icon" onClick={handleCopy} title="Kopiuj link">
            {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
