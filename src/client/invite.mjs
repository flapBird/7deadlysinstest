// Invite context parsing (spec §4 好友回流).
// Incoming link shape: /?vs={firstDominant}#s={totals in fixed order}
// An invalid or missing scores fragment keeps only a legal vs slug; an illegal vs
// falls back to a normal quiz.
import { validateInvite } from '../quiz/scoring.mjs';

export function readInviteFromLocation() {
  try {
    const params = new URLSearchParams(window.location.search);
    const vs = params.get('vs');
    if (!vs) return null;
    const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    const scoresStr = hashParams.get('s');
    return validateInvite(vs, scoresStr);
  } catch {
    return null;
  }
}
