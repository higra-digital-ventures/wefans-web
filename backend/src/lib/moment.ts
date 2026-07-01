// Trava efetiva de um Moment (regra 8): travado por 1 ano OU trava temporária de
// leaderboard. Um lock expirado (lockedUntil no passado) não bloqueia mais.
export function isMomentLocked(m: {
  locked: boolean;
  lockedUntil: Date | null;
  tempLockUntil: Date | null;
}): boolean {
  const now = new Date();
  if (m.locked && m.lockedUntil && m.lockedUntil > now) return true;
  if (m.tempLockUntil && m.tempLockUntil > now) return true;
  return false;
}
