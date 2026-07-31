(function () {
  const remoteEl = document.getElementById("remote");
  const statusEl = document.getElementById("status");
  const ledEls = Array.from(document.querySelectorAll(".led"));
  const modeBtns = Array.from(document.querySelectorAll(".mode-btn"));

  const state = {
    data: null,
    audio: null,
    busy: false,
    powered: true,
    commandType: "A", // A | B | L | H
    palette: "normal", // normal | game
    digitBuffer: "",
    lastMelody: null,
    lastLabel: "",
    singleBuffer: [],
  };

  function octaveForType(t) {
    return t === "B" || t === "H" ? 6 : 5;
  }

  function isNumericType(t) {
    return t === "A" || t === "B";
  }

  function isSingleType(t) {
    return t === "L" || t === "H";
  }

  function setBusy(on) {
    state.busy = on;
    remoteEl.classList.toggle("is-busy", on);
    modeBtns.forEach((b) => {
      b.disabled = on;
    });
  }

  async function withBusy(fn) {
    if (state.busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
      updateLeds();
      updateStatus();
    }
  }

  function updateRemoteClasses() {
    remoteEl.classList.toggle("palette-normal", state.palette === "normal");
    remoteEl.classList.toggle("palette-game", state.palette === "game");
    remoteEl.classList.toggle("mode-numeric", isNumericType(state.commandType));
    remoteEl.classList.toggle("mode-single", isSingleType(state.commandType));
    remoteEl.classList.remove("type-a", "type-b", "type-l", "type-h");
    remoteEl.classList.add("type-" + state.commandType.toLowerCase());
  }

  function updateLeds() {
    const n = state.digitBuffer.length;
    ledEls.forEach((led, i) => {
      let on = false;
      if (state.palette === "game") {
        on = true;
      } else if (state.busy) {
        on = i < 4;
      } else if (isNumericType(state.commandType)) {
        on = i < n || (n === 0 && i === 0 && state.powered);
      } else {
        on = i < state.singleBuffer.length || (state.powered && i === 0 && state.singleBuffer.length === 0);
      }
      led.classList.toggle("is-on", on);
    });
  }

  function updateStatus(extra) {
    const bits = [];
    if (state.palette === "game") bits.push("GAME");
    bits.push(state.commandType);
    bits.push(isNumericType(state.commandType) ? "numeric" : "single");
    bits.push("vol " + (state.audio.getVolumeIndex() + 1) + "/3");
    if (state.digitBuffer) bits.push("code " + state.digitBuffer);
    if (extra) bits.push(extra);
    else if (state.lastLabel) bits.push(state.lastLabel);
    statusEl.textContent = bits.join(" · ");
  }

  async function playScmd(name, labelOverride) {
    const scmd = AiboCommands.resolveScmd(state.data, name);
    if (!scmd) {
      updateStatus("unknown " + name);
      return;
    }
    state.lastMelody = scmd.notes.slice();
    state.lastLabel = labelOverride || scmd.label || name;
    updateStatus("▶ " + state.lastLabel);
    await state.audio.playMelody(scmd.notes, octaveForType(state.commandType));
  }

  async function playResolved(resolved) {
    if (!resolved) {
      updateStatus("unknown command");
      return;
    }
    state.lastMelody = resolved.notes.slice();
    state.lastLabel = resolved.label || resolved.scmd;
    updateStatus("▶ " + state.lastLabel);
    await state.audio.playMelody(resolved.notes, octaveForType(state.commandType));
  }

  async function onSend() {
    await withBusy(async () => {
      if (state.palette === "game") {
        if (state.lastMelody) {
          updateStatus("▶ repeat");
          await state.audio.playMelody(state.lastMelody, octaveForType(state.commandType));
        }
        return;
      }

      if (isSingleType(state.commandType)) {
        if (state.singleBuffer.length) {
          const notes = state.singleBuffer.slice();
          state.singleBuffer = [];
          state.lastMelody = notes;
          state.lastLabel = notes.join("-");
          updateStatus("▶ " + state.lastLabel);
          await state.audio.playMelody(notes, octaveForType(state.commandType));
        } else if (state.lastMelody) {
          await state.audio.playMelody(state.lastMelody, octaveForType(state.commandType));
        }
        return;
      }

      // numeric
      let code = state.digitBuffer;
      state.digitBuffer = "";
      if (!code) {
        if (state.lastMelody) {
          updateStatus("▶ repeat");
          await state.audio.playMelody(state.lastMelody, octaveForType(state.commandType));
        }
        return;
      }
      // pad single digit if needed for known keys like none
      const resolved =
        AiboCommands.resolveNumeric(state.data, code) ||
        AiboCommands.resolveNumeric(state.data, code.padStart(2, "0"));
      await playResolved(resolved);
    });
  }

  async function onGame() {
    await withBusy(async () => {
      if (state.palette === "normal") {
        state.palette = "game";
        state.digitBuffer = "";
        state.singleBuffer = [];
        updateRemoteClasses();
        await playScmd("GOGAME", "Enter GAME");
      } else {
        state.palette = "normal";
        updateRemoteClasses();
        await playScmd("GOAUTO", "Exit GAME → autonomous");
      }
    });
  }

  async function onVol() {
    // volume change itself is silent UI; still brief lock not required by plan for silent ops,
    // but plan says all buttons lock when sound plays. VOL is silent — no busy.
    if (state.busy) return;
    const idx = state.audio.cycleVolume();
    updateStatus("volume " + (idx + 1) + "/3");
  }

  function onCancel() {
    if (state.busy) return;
    state.digitBuffer = "";
    state.singleBuffer = [];
    state.powered = true;
    updateLeds();
    updateStatus("cancel");
  }

  async function onKey(key) {
    if (state.busy) return;

    if (state.palette === "game") {
      const resolved = AiboCommands.resolveGame(state.data, key);
      await withBusy(async () => {
        await playResolved(resolved);
      });
      return;
    }

    if (isSingleType(state.commandType)) {
      const note = state.data.notes[key];
      if (!note) return;
      await withBusy(async () => {
        state.singleBuffer.push(note);
        if (state.singleBuffer.length > 3) state.singleBuffer = state.singleBuffer.slice(-3);
        updateLeds();
        updateStatus("note " + note);
        await state.audio.playNote(note, octaveForType(state.commandType));
        if (state.singleBuffer.length === 3) {
          state.lastMelody = state.singleBuffer.slice();
          state.lastLabel = state.singleBuffer.join("-");
          state.singleBuffer = [];
        }
      });
      return;
    }

    // numeric: only digit-like keys 0-9 (and * # ignored for buffer, or treat as invalid)
    if (!/^[0-9]$/.test(key)) {
      updateStatus("digit only in numeric");
      return;
    }
    if (state.digitBuffer.length >= 2) state.digitBuffer = "";
    state.digitBuffer += key;
    updateLeds();
    updateStatus();
  }

  function setCommandType(t) {
    if (state.busy) return;
    state.commandType = t;
    modeBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.type === t));
    updateRemoteClasses();
    updateLeds();
    updateStatus();
  }

  const fsBtn = remoteEl.querySelector('[data-action="fullscreen"]');

  function fsElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function canFullscreen() {
    const el = document.documentElement;
    return !!(el.requestFullscreen || el.webkitRequestFullscreen);
  }

  function syncFullscreenUi() {
    if (!fsBtn) return;
    const active = !!fsElement();
    fsBtn.classList.toggle("is-active", active);
    fsBtn.setAttribute("aria-pressed", active ? "true" : "false");
    fsBtn.setAttribute("aria-label", active ? "Exit fullscreen" : "Fullscreen");
    fsBtn.title = active ? "Exit fullscreen" : "Fullscreen";
  }

  async function toggleFullscreen() {
    if (state.busy) return;
    if (!canFullscreen()) {
      updateStatus("fullscreen niedostępny");
      return;
    }
    try {
      if (fsElement()) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } else {
        const el = document.documentElement;
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      }
    } catch (err) {
      updateStatus("fullscreen: " + (err && err.message ? err.message : "error"));
    }
    syncFullscreenUi();
  }

  function bind() {
    remoteEl.addEventListener("click", (ev) => {
      const btn = ev.target.closest("button");
      if (!btn || !remoteEl.contains(btn)) return;
      const action = btn.dataset.action;
      const key = btn.dataset.key;
      if (action === "send") onSend();
      else if (action === "game") onGame();
      else if (action === "vol") onVol();
      else if (action === "on") onCancel();
      else if (action === "fullscreen") toggleFullscreen();
      else if (key != null) onKey(key);
    });

    modeBtns.forEach((b) => {
      b.addEventListener("click", () => setCommandType(b.dataset.type));
    });

    document.addEventListener("fullscreenchange", syncFullscreenUi);
    document.addEventListener("webkitfullscreenchange", syncFullscreenUi);

    // Keyboard helpers for desktop testing
    window.addEventListener("keydown", (ev) => {
      if (state.busy) return;
      if (ev.key >= "0" && ev.key <= "9") onKey(ev.key);
      else if (ev.key === "*") onKey("*");
      else if (ev.key === "#") onKey("#");
      else if (ev.key === "Enter") onSend();
      else if (ev.key === "Escape") onCancel();
      else if (ev.key.toLowerCase() === "g") onGame();
      else if (ev.key.toLowerCase() === "f" && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        toggleFullscreen();
      }
    });
  }

  async function init() {
    state.data = await AiboCommands.loadCommands("data/commands.json");
    state.audio = AiboToneEngine.createToneEngine({
      noteMs: state.data.noteMs || 640,
      crossfadeMs: state.data.crossfadeMs || 40,
    });
    bind();
    if (fsBtn && !canFullscreen()) {
      fsBtn.classList.add("is-unsupported");
    }
    syncFullscreenUi();
    updateRemoteClasses();
    updateLeds();
    updateStatus("ready");
  }

  init().catch((err) => {
    console.error(err);
    statusEl.textContent = "Load error: " + err.message;
  });
})();
