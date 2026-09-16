let enabled = true;
type SoundKind = 'select' | 'confirm' | 'create' | 'done';
export function setSoundEnabled(value: boolean) { enabled = value; }
export function playUiSound(kind: SoundKind) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const base = kind === 'done' ? 520 : kind === 'create' ? 180 : kind === 'confirm' ? 360 : 280;
    osc.frequency.value = base;
    osc.type = kind === 'create' ? 'sawtooth' : 'sine';
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.055, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (kind === 'create' ? 0.22 : 0.11));
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.24);
    osc.addEventListener('ended', () => { void ctx.close(); });
  } catch {}
}
