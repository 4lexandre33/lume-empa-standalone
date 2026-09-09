/**
 * Lightweight SemVer comparison & matching helper (dependency-free)
 */

export interface ParsedSemver {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

export function parseSemver(version: string): ParsedSemver | null {
  const cleaned = version.trim().replace(/^[v^~>=<\s]+/, '');
  const match = cleaned.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?/);
  if (!match) return null;

  return {
    major: parseInt(match[1], 10),
    minor: match[2] !== undefined ? parseInt(match[2], 10) : 0,
    patch: match[3] !== undefined ? parseInt(match[3], 10) : 0,
    prerelease: match[4]
  };
}

export function compareSemver(v1: string, v2: string): number {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);

  if (!p1 || !p2) return 0;

  if (p1.major !== p2.major) return p1.major - p2.major;
  if (p1.minor !== p2.minor) return p1.minor - p2.minor;
  if (p1.patch !== p2.patch) return p1.patch - p2.patch;
  return 0;
}

export function satisfiesSemver(version: string, range: string): boolean {
  if (!range || range === '*' || range === 'latest') return true;

  const target = parseSemver(version);
  if (!target) return false;

  const trimmedRange = range.trim();

  // Caret ^1.2.3 (compatible with 1.x.x >= 1.2.3)
  if (trimmedRange.startsWith('^')) {
    const min = parseSemver(trimmedRange.slice(1));
    if (!min) return false;
    if (target.major !== min.major) return false;
    return compareSemver(version, trimmedRange.slice(1)) >= 0;
  }

  // Tilde ~1.2.3 (compatible with 1.2.x >= 1.2.3)
  if (trimmedRange.startsWith('~')) {
    const min = parseSemver(trimmedRange.slice(1));
    if (!min) return false;
    if (target.major !== min.major || target.minor !== min.minor) return false;
    return compareSemver(version, trimmedRange.slice(1)) >= 0;
  }

  // Greater than or equal >=1.0.0
  if (trimmedRange.startsWith('>=')) {
    return compareSemver(version, trimmedRange.slice(2)) >= 0;
  }

  // Exact match or partial like "1.0"
  const expected = parseSemver(trimmedRange);
  if (!expected) return false;

  if (trimmedRange.includes('.')) {
    const parts = trimmedRange.split('.');
    if (parts.length === 1) {
      return target.major === expected.major;
    }
    if (parts.length === 2) {
      return target.major === expected.major && target.minor === expected.minor;
    }
    return compareSemver(version, trimmedRange) === 0;
  }

  return target.major === expected.major;
}
