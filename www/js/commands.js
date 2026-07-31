(function (global) {
  async function loadCommands(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to load commands: " + res.status);
    return res.json();
  }

  function resolveScmd(data, name) {
    return data.scmd[name] || null;
  }

  function resolveNumeric(data, code) {
    const key = data.numeric[code];
    if (!key) return null;
    const scmd = resolveScmd(data, key);
    if (!scmd) return null;
    return { code: code, scmd: key, notes: scmd.notes, label: scmd.label };
  }

  function resolveGame(data, key) {
    const name = data.game[key];
    if (!name) return null;
    const scmd = resolveScmd(data, name);
    if (!scmd) return null;
    return { key: key, scmd: name, notes: scmd.notes, label: scmd.label };
  }

  global.AiboCommands = {
    loadCommands,
    resolveScmd,
    resolveNumeric,
    resolveGame,
  };
})(window);
