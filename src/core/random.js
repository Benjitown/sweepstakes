// Seeded random numbers: the Daily Challenge board is built from the date alone, so it's identical for everyone
// (the Kotlin, C# and Python versions use these exact two functions too).

// mulberry32: tiny, fast, good enough for shuffling a board. Returns a function giving floats in [0, 1).
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a: turns a string like "sweepstakes-daily-2026-10-06" into a 32-bit seed.
export function hashString(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
