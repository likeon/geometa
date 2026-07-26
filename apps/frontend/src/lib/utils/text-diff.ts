export type DiffLine = { type: 'same' | 'add' | 'del'; text: string };

// Above this many changed lines we skip the LCS (O(n*m) memory) and render a
// plain replace-all diff.
const MAX_LCS_LINES = 1500;

// Simple LCS-based line diff, sufficient for meta notes (small texts).
export function diffLines(oldText: string, newText: string): DiffLine[] {
  if (oldText === newText) {
    return oldText.split('\n').map((text) => ({ type: 'same' as const, text }));
  }
  if (oldText === '') {
    return newText.split('\n').map((text) => ({ type: 'add' as const, text }));
  }
  if (newText === '') {
    return oldText.split('\n').map((text) => ({ type: 'del' as const, text }));
  }

  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  // strip common prefix/suffix so the DP only covers the changed middle
  let start = 0;
  while (
    start < oldLines.length &&
    start < newLines.length &&
    oldLines[start] === newLines[start]
  ) {
    start++;
  }
  let oldEnd = oldLines.length;
  let newEnd = newLines.length;
  while (oldEnd > start && newEnd > start && oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }

  const prefix: DiffLine[] = oldLines
    .slice(0, start)
    .map((text) => ({ type: 'same' as const, text }));
  const suffix: DiffLine[] = oldLines
    .slice(oldEnd)
    .map((text) => ({ type: 'same' as const, text }));
  const oldMid = oldLines.slice(start, oldEnd);
  const newMid = newLines.slice(start, newEnd);

  if (oldMid.length > MAX_LCS_LINES || newMid.length > MAX_LCS_LINES) {
    return [
      ...prefix,
      ...oldMid.map((text) => ({ type: 'del' as const, text })),
      ...newMid.map((text) => ({ type: 'add' as const, text })),
      ...suffix
    ];
  }

  const n = oldMid.length;
  const m = newMid.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        oldMid[i] === newMid[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const middle: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (oldMid[i] === newMid[j]) {
      middle.push({ type: 'same', text: oldMid[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      middle.push({ type: 'del', text: oldMid[i] });
      i++;
    } else {
      middle.push({ type: 'add', text: newMid[j] });
      j++;
    }
  }
  while (i < n) {
    middle.push({ type: 'del', text: oldMid[i] });
    i++;
  }
  while (j < m) {
    middle.push({ type: 'add', text: newMid[j] });
    j++;
  }

  return [...prefix, ...middle, ...suffix];
}
