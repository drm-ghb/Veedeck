"use client";

import { CornerDownLeft } from "lucide-react";
import { useChatGestures } from "@/lib/use-chat-gestures";

interface Props {
  isOwn: boolean;
  onReply?: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
}

export function SwipeableMessage({ isOwn, onReply, onLongPress, children }: Props) {
  const { touchHandlers, swipeOffset, swipeProgress } = useChatGestures({ isOwn, onReply, onLongPress });

  return (
    <div className="relative">
      {/* Reply hint icon — revealed as bubble slides */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? "right-2" : "left-2"} pointer-events-none`}
        style={{ opacity: swipeProgress }}
      >
        <CornerDownLeft size={16} className="text-primary" />
      </div>

      {/* Sliding bubble content */}
      <div
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 ? "transform 0.2s ease-out" : "none",
          willChange: "transform",
        }}
        {...touchHandlers}
      >
        {children}
      </div>
    </div>
  );
}
