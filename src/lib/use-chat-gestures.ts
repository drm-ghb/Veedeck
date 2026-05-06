import { useRef, useState } from "react";

const SWIPE_THRESHOLD = 60;
const LONG_PRESS_DELAY = 500;

interface Options {
  isOwn: boolean;
  onReply?: () => void;
  onLongPress?: () => void;
}

export function useChatGestures({ isOwn, onReply, onLongPress }: Options) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeRef = useRef(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const scrolling = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    scrolling.current = false;
    longPressFired.current = false;

    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        longPressFired.current = true;
        onLongPress();
      }, LONG_PRESS_DELAY);
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startX.current === null || startY.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      scrolling.current = true;
      cancelLongPress();
      swipeRef.current = 0;
      setSwipeOffset(0);
      return;
    }

    if (scrolling.current) return;

    if (Math.abs(dx) > 5) cancelLongPress();

    const correctDirection = isOwn ? dx < 0 : dx > 0;
    if (!correctDirection) {
      swipeRef.current = 0;
      setSwipeOffset(0);
      return;
    }

    const abs = Math.abs(dx);
    const capped = abs < SWIPE_THRESHOLD
      ? abs
      : SWIPE_THRESHOLD + (abs - SWIPE_THRESHOLD) * 0.25;
    const offset = isOwn ? -capped : capped;
    swipeRef.current = offset;
    setSwipeOffset(offset);
  }

  function handleTouchEnd() {
    cancelLongPress();
    if (!scrolling.current && !longPressFired.current && Math.abs(swipeRef.current) >= SWIPE_THRESHOLD) {
      onReply?.();
    }
    swipeRef.current = 0;
    setSwipeOffset(0);
    startX.current = null;
    startY.current = null;
    scrolling.current = false;
    longPressFired.current = false;
  }

  return {
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    swipeOffset,
    swipeProgress: Math.min(Math.abs(swipeOffset) / SWIPE_THRESHOLD, 1),
  };
}
