/**
 * Sound feedback module for AgentFlow
 *
 * Uses the Web Audio API (OscillatorNode) to generate simple tones.
 * No audio files needed — tones are synthesized in real-time.
 *
 * All sounds are subtle, short, and non-intrusive:
 * - Error: low descending tone
 * - Connected: gentle ascending chime
 * - Disconnected: soft descending tone
 * - Search complete: quick high ping
 */

let audioCtx: AudioContext | null = null;

/** Lazily create and return the shared AudioContext */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') {
    return null;
  }
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (browsers require user gesture before playing audio)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a tone sequence using OscillatorNode.
 * @param notes Array of { frequency, duration, startTime } objects
 * @param volume Gain value (0-1)
 */
function playToneSequence(
  notes: { frequency: number; duration: number; startTime: number }[],
  volume: number = 0.08,
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const gainNode = ctx.createGain();
  gainNode.connect(ctx.destination);
  gainNode.gain.value = volume;

  for (const note of notes) {
    const oscillator = ctx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = note.frequency;

    const noteGain = ctx.createGain();
    noteGain.connect(gainNode);
    noteGain.gain.value = 0;
    oscillator.connect(noteGain);

    const start = ctx.currentTime + note.startTime;
    const end = start + note.duration;

    // Fade in/out to avoid clicks
    noteGain.gain.linearRampToValueAtTime(1, start + 0.01);
    noteGain.gain.linearRampToValueAtTime(0, end);

    oscillator.start(start);
    oscillator.stop(end + 0.01);
  }
}

/** Play error alert sound — low descending tone */
export function playErrorSound(): void {
  playToneSequence([
    { frequency: 440, duration: 0.12, startTime: 0 },
    { frequency: 330, duration: 0.18, startTime: 0.1 },
  ], 0.06);
}

/** Play connected sound — gentle ascending chime */
export function playConnectedSound(): void {
  playToneSequence([
    { frequency: 523, duration: 0.1, startTime: 0 },
    { frequency: 659, duration: 0.1, startTime: 0.08 },
    { frequency: 784, duration: 0.15, startTime: 0.16 },
  ], 0.05);
}

/** Play disconnected sound — soft descending tone */
export function playDisconnectedSound(): void {
  playToneSequence([
    { frequency: 523, duration: 0.12, startTime: 0 },
    { frequency: 392, duration: 0.18, startTime: 0.1 },
  ], 0.05);
}

/** Play search complete sound — quick high ping */
export function playSearchCompleteSound(): void {
  playToneSequence([
    { frequency: 880, duration: 0.08, startTime: 0 },
  ], 0.04);
}
