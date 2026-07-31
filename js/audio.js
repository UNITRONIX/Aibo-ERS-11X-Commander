/**
 * AIBO Sound Commander Web Audio engine.
 * Timing calibrated from real remote recordings: ~640ms notes, ~40ms crossfade, no silence gaps.
 */
(function (global) {
  const NOTE_TO_SEMITONE = {
    C: 0,
    "C#": 1,
    D: 2,
    "D#": 3,
    E: 4,
    F: 5,
    "F#": 6,
    G: 7,
    "G#": 8,
    A: 9,
    "A#": 10,
    B: 11,
  };

  const DEFAULTS = {
    noteMs: 640,
    crossfadeMs: 40,
    volumes: [0.22, 0.38, 0.55],
  };

  function freq(note, octave) {
    const semitone = NOTE_TO_SEMITONE[note];
    if (semitone === undefined) throw new Error("Unknown note: " + note);
    const midi = 12 * (octave + 1) + semitone;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function createToneEngine(options) {
    const cfg = Object.assign({}, DEFAULTS, options || {});
    let ctx = null;
    let master = null;
    let volumeIndex = 1;
    let playing = false;

    function ensureCtx() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = cfg.volumes[volumeIndex];
        master.connect(ctx.destination);
      }
      if (ctx.state === "suspended") return ctx.resume();
      return Promise.resolve();
    }

    function setVolumeIndex(i) {
      volumeIndex = ((i % cfg.volumes.length) + cfg.volumes.length) % cfg.volumes.length;
      if (master) master.gain.value = cfg.volumes[volumeIndex];
      return volumeIndex;
    }

    function cycleVolume() {
      return setVolumeIndex(volumeIndex + 1);
    }

    function getVolumeIndex() {
      return volumeIndex;
    }

    function scheduleNote(hz, startTime, duration, fadeIn, fadeOut, amp) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const o3 = ctx.createOscillator();
      const o5 = ctx.createOscillator();
      const mix = ctx.createGain();

      osc.type = "sine";
      o3.type = "sine";
      o5.type = "sine";
      osc.frequency.value = hz;
      o3.frequency.value = hz * 3;
      o5.frequency.value = hz * 5;

      const g1 = ctx.createGain();
      const g3 = ctx.createGain();
      const g5 = ctx.createGain();
      g1.gain.value = 0.88;
      g3.gain.value = 0.1;
      g5.gain.value = 0.02;

      osc.connect(g1);
      o3.connect(g3);
      o5.connect(g5);
      g1.connect(mix);
      g3.connect(mix);
      g5.connect(mix);
      mix.connect(gain);
      gain.connect(master);

      const a = amp == null ? 1 : amp;
      const t0 = startTime;
      const t1 = startTime + duration;
      const fi = Math.min(fadeIn, duration / 3);
      const fo = Math.min(fadeOut, duration / 3);

      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(a, t0 + fi);
      gain.gain.setValueAtTime(a, Math.max(t0 + fi, t1 - fo));
      gain.gain.linearRampToValueAtTime(0.0001, t1);

      osc.start(t0);
      o3.start(t0);
      o5.start(t0);
      osc.stop(t1 + 0.02);
      o3.stop(t1 + 0.02);
      o5.stop(t1 + 0.02);
    }

    function melodyDuration(noteCount) {
      if (noteCount <= 0) return 0;
      const noteSec = cfg.noteMs / 1000;
      const xf = cfg.crossfadeMs / 1000;
      return noteCount * noteSec - Math.max(0, noteCount - 1) * xf;
    }

    async function playNotes(noteNames, octave) {
      await ensureCtx();
      if (!noteNames || !noteNames.length) return;
      playing = true;
      const now = ctx.currentTime + 0.02;
      const noteSec = cfg.noteMs / 1000;
      const xf = cfg.crossfadeMs / 1000;
      const total = melodyDuration(noteNames.length);

      noteNames.forEach((name, i) => {
        const start = now + i * (noteSec - xf);
        const isFirst = i === 0;
        const isLast = i === noteNames.length - 1;
        scheduleNote(
          freq(name, octave),
          start,
          noteSec,
          isFirst ? 0.012 : 0.008,
          isLast ? 0.02 : 0.008,
          1
        );
      });

      await wait(total * 1000 + 40);
      playing = false;
    }

    function wait(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async function playNote(note, octave) {
      return playNotes([note], octave);
    }

    async function playMelody(notes, octave) {
      return playNotes(notes, octave);
    }

    function isPlaying() {
      return playing;
    }

    return {
      ensureCtx,
      playNote,
      playMelody,
      playNotes,
      cycleVolume,
      setVolumeIndex,
      getVolumeIndex,
      isPlaying,
      melodyDurationMs: (n) => melodyDuration(n) * 1000,
      freq,
    };
  }

  global.AiboToneEngine = { createToneEngine, freq, NOTE_TO_SEMITONE };
})(window);
