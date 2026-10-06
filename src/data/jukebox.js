// The jukebox's tracks, written out note by note (src/audio/music.js plays them; their names are in src/content/jukebox.js).
// Each track loops a few bars. Per bar: the chords (one, or two that split the bar), the bass (spread evenly over
// the bar, _ is a rest), and the tune as [step, note, steps long]. A step is a beat / sub; swing pushes the off-beats late.
export const MUSIC = {
  LEVEL: .5,          // the music under everything else, at 100% on its slider
  VOL: .6,            // where the Music slider starts
  AHEAD: .6,          // seconds of music queued up ahead of the clock
  SHUFFLE_LOOPS: 3,   // on shuffle, a new track after this many times round
};
export const TRACKS = [
  { id: 'lounge', bpm: 84, beats: 4, sub: 2, swing: .64, keys: 'epiano', lead: 'vibes', low: 'upright', kit: 'brush', leadEvery: 2,
    comp: [[0, 2.5, .9], [3, 1.4, .6], [5, 2.6, .55]],
    drums: { kick: ['x...x...', .5], brush: ['..x...x.', 1], ride: ['x.xxx.xx', 1] },
    bars: [
      ['A3 C4 E4 G4', 'F2 A2 C3 C#3', [[0, 'A4', 2], [2, 'C5', 2], [4, 'E5', 3], [7, 'D5', 1]]],
      ['F#3 C4 E4 A4', 'D3 A2 F#2 Ab2', [[0, 'C5', 3], [3, 'A4', 1], [4, 'F#4', 2], [6, 'A4', 2]]],
      ['Bb3 D4 F4 A4', 'G2 Bb2 D3 Db3', [[0, 'Bb4', 2], [2, 'D5', 2], [4, 'F5', 3], [7, 'E5', 1]]],
      ['Bb3 D4 E4 A4', 'C3 G2 E2 G#2', [[0, 'D5', 3], [3, 'Bb4', 1], [4, 'G4', 4]]],
      ['C4 E4 G4 B4', 'A2 C3 E3 Eb3', [[0, 'C5', 2], [2, 'E5', 2], [4, 'G5', 3], [7, 'F5', 1]]],
      ['C4 E4 F#4 A4', 'D3 C3 A2 Ab2', [[0, 'E5', 2], [2, 'C5', 2], [4, 'A4', 2], [6, 'F#4', 2]]],
      [['Bb3 D4 F4 A4', 'Bb3 D4 E4 A4'], 'G2 Bb2 C3 E2', [[0, 'G4', 2], [2, 'Bb4', 2], [4, 'E5', 2], [6, 'D5', 1], [7, 'C5', 1]]],
      ['A3 C4 E4 G4', 'F2 A2 C3 E2', [[0, 'A4', 6]]],
    ] },
  { id: 'pub', bpm: 112, beats: 4, sub: 2, swing: .58, keys: 'piano', lead: 'piano', low: 'piano', kit: 'pub', leadFrom: 1,
    comp: [[2, 1, .8], [6, 1, .8]],
    drums: { kick: ['x...x...', .6], tamb: ['..x...x.', 1] },
    bars: [
      ['B3 D4 G4', 'G2 _ D2 _', [[0, 'D5', 2], [2, 'B4', 2], [4, 'G4', 2], [6, 'B4', 2]]],
      ['C4 E4 G4', 'C3 _ G2 _', [[0, 'C5', 2], [2, 'E5', 2], [4, 'D5', 2], [6, 'C5', 2]]],
      ['B3 D4 G4', 'G2 _ D2 _', [[0, 'B4', 2], [2, 'D5', 2], [4, 'G4', 3], [7, 'A4', 1]]],
      ['A3 C4 D4 F#4', 'D2 _ A2 _', [[0, 'A4', 2], [2, 'F#4', 2], [4, 'A4', 2], [6, 'C5', 2]]],
      ['B3 D4 G4', 'G2 _ D2 _', [[0, 'D5', 2], [2, 'B4', 2], [4, 'G4', 2], [6, 'B4', 2]]],
      ['C4 E4 G4', 'C3 _ G2 _', [[0, 'E5', 2], [2, 'G5', 2], [4, 'E5', 2], [6, 'C5', 2]]],
      [['B3 D4 G4', 'A3 C4 D4 F#4'], 'G2 _ D2 _', [[0, 'B4', 2], [2, 'D5', 2], [4, 'A4', 2], [6, 'F#4', 2]]],
      ['B3 D4 G4', 'G2 _ D2 F#2', [[0, 'G4', 6]]],
    ] },
  { id: 'chip', bpm: 126, beats: 4, sub: 4, swing: .5, keys: '', arp: true, lead: 'square', low: 'tri', kit: 'chip', leadFrom: 1,
    comp: [],
    drums: { kick: ['x.....x.x.......', 1], snare: ['....x.......x...', 1], hat: ['x.x.x.x.x.x.x.x.', 1] },
    bars: [
      ['A3 C4 E4', 'A2 A3 A2 A3 A2 A3 A2 A3', [[0, 'E5', 4], [4, 'A5', 4], [8, 'G5', 2], [10, 'E5', 2], [12, 'C5', 4]]],
      ['F3 A3 C4', 'F2 F3 F2 F3 F2 F3 F2 F3', [[0, 'D5', 4], [4, 'C5', 2], [6, 'A4', 2], [8, 'C5', 8]]],
      ['G3 C4 E4', 'C3 C4 C3 C4 C3 C4 C3 C4', [[0, 'E5', 4], [4, 'G5', 4], [8, 'C6', 4], [12, 'B5', 2], [14, 'G5', 2]]],
      ['G3 B3 D4', 'G2 G3 G2 G3 G2 G3 G2 G3', [[0, 'D5', 8], [8, 'B4', 4], [12, 'D5', 4]]],
      ['A3 C4 E4', 'A2 A3 A2 A3 A2 A3 A2 A3', [[0, 'E5', 2], [2, 'E5', 2], [4, 'A5', 4], [8, 'B5', 2], [10, 'C6', 2], [12, 'B5', 4]]],
      ['F3 A3 C4', 'F2 F3 F2 F3 F2 F3 F2 F3', [[0, 'A5', 4], [4, 'F5', 4], [8, 'C5', 4], [12, 'F5', 4]]],
      ['G3 B3 D4', 'G2 G3 G2 G3 G2 G3 G2 G3', [[0, 'G5', 4], [4, 'D5', 4], [8, 'B4', 4], [12, 'G5', 4]]],
      ['G#3 B3 E4', 'E2 E3 E2 E3 E2 E3 B2 G#2', [[0, 'G#5', 8], [8, 'E5', 4], [12, 'B4', 4]]],
    ] },
  { id: 'waltz', bpm: 92, beats: 3, sub: 2, swing: .5, keys: 'organ', lead: 'musicbox', low: 'soft', kit: '',
    comp: [[2, 1.7, .8], [4, 1.7, .7]],
    drums: {},
    bars: [
      ['G3 C4 E4', 'C3 _ _', [[0, 'E5', 4], [4, 'D5', 2]]],
      ['G3 C4 E4', 'G2 _ _', [[0, 'C5', 2], [2, 'E5', 2], [4, 'G5', 2]]],
      ['A3 C4 E4', 'A2 _ _', [[0, 'A5', 4], [4, 'G5', 2]]],
      ['A3 C4 E4', 'E2 _ _', [[0, 'E5', 6]]],
      ['A3 C4 F4', 'F2 _ _', [[0, 'F5', 4], [4, 'E5', 2]]],
      ['A3 C4 F4', 'C3 _ _', [[0, 'D5', 2], [2, 'C5', 2], [4, 'A4', 2]]],
      ['B3 D4 F4', 'G2 _ _', [[0, 'B4', 4], [4, 'D5', 2]]],
      ['B3 D4 F4', 'D3 _ _', [[0, 'G5', 6]]],
      ['G3 C4 E4', 'C3 _ _', [[0, 'E5', 4], [4, 'D5', 2]]],
      ['G3 C4 E4', 'G2 _ _', [[0, 'C5', 2], [2, 'E5', 2], [4, 'G5', 2]]],
      ['A3 C4 E4', 'A2 _ _', [[0, 'C6', 4], [4, 'B5', 2]]],
      ['A3 C4 E4', 'E2 _ _', [[0, 'A5', 6]]],
      ['A3 D4 F4', 'D3 _ _', [[0, 'F5', 2], [2, 'A5', 2], [4, 'F5', 2]]],
      ['B3 D4 F4', 'G2 _ _', [[0, 'D5', 2], [2, 'F5', 2], [4, 'B4', 2]]],
      ['G3 C4 E4', 'C3 _ _', [[0, 'C5', 6]]],
      ['G3 C4 E4', 'C3 _ G2', []],
    ] },
  // only on the jukebox at Halloween: a spooky swing in D minor, with a theremin
  { id: 'haunted', season: 'halloween', bpm: 100, beats: 4, sub: 2, swing: .6, keys: 'organ', lead: 'theremin', low: 'upright', kit: 'brush', leadFrom: 1,
    comp: [[2, 1.5, .8], [6, 1.5, .8]],
    drums: { kick: ['x...x...', .5], brush: ['..x...x.', .8] },
    bars: [
      ['A3 D4 F4', 'D2 A2 D3 A2', [[0, 'D5', 2], [2, 'F5', 2], [4, 'A5', 3], [7, 'G#5', 1]]],
      ['A3 D4 F4', 'D2 A2 C3 C#3', [[0, 'A5', 4], [4, 'F5', 2], [6, 'D5', 2]]],
      ['G3 Bb3 D4', 'G2 D3 Bb2 D3', [[0, 'G5', 2], [2, 'Bb5', 2], [4, 'D6', 3], [7, 'C#6', 1]]],
      ['G3 C#4 E4', 'A2 E3 C#3 E3', [[0, 'C#6', 4], [4, 'A5', 2], [6, 'E5', 2]]],
      ['A3 D4 F4', 'D2 A2 D3 A2', [[0, 'D5', 2], [2, 'F5', 2], [4, 'A5', 2], [6, 'D6', 2]]],
      ['Bb3 D4 F4', 'Bb2 F2 Bb2 F2', [[0, 'D6', 3], [3, 'C6', 1], [4, 'Bb5', 4]]],
      [['G3 Bb3 D4', 'G3 C#4 E4'], 'G2 D3 A2 E3', [[0, 'G5', 2], [2, 'Bb5', 2], [4, 'A5', 2], [6, 'C#6', 2]]],
      ['A3 D4 F4', 'D2 A2 D2 C#2', [[0, 'D6', 6]]],
    ] },
];
export const TRACK_BY = Object.fromEntries(TRACKS.map(t => [t.id, t]));
