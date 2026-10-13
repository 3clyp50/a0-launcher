export function selectWindowsWslDistro(text, preferred = '', runningOnly = false) {
  const distros = [];
  for (const rawLine of String(text || '').replace(/\0/g, '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^NAME\s+STATE\s+VERSION$/i.test(line)) continue;
    if (/^(default\s+(distribution|version)|distribuzione\s+predefinita|versione\s+predefinita)\s*:/i.test(line)) continue;
    const isDefault = line.startsWith('*');
    const parts = line.replace(/^\*\s*/, '').trim().split(/\s+/);
    if (parts.length < 3) continue;
    const version = Number(parts.pop());
    const state = parts.pop();
    if (runningOnly && !/^running$/i.test(state)) continue;
    const name = parts.join(' ');
    if (!name || version !== 2 || /^docker-desktop(?:-data)?$/i.test(name)) continue;
    distros.push({ name, state, version, default: isDefault });
  }
  if (preferred) return distros.find((distro) => distro.name === preferred) || null;
  return distros.find((distro) => distro.default)
    || distros.find((distro) => /^Ubuntu$/i.test(distro.name))
    || distros.find((distro) => /^Ubuntu/i.test(distro.name))
    || distros[0]
    || null;
}
