let audioCtx: AudioContext | null = null;

// Unlock AudioContext on first user interaction (browser requires this)
if (typeof window !== "undefined") {
  const unlock = () => {
    if (!audioCtx) {
      try {
        audioCtx = new AudioContext();
      } catch {}
    }
    if (audioCtx?.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
  };
  document.addEventListener("click", unlock, { passive: true });
  document.addEventListener("keydown", unlock, { passive: true });
  document.addEventListener("touchstart", unlock, { passive: true });
}

export async function playMessageSound() {
  if (typeof window === "undefined") return;
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") await audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.15);
  } catch {}
}
