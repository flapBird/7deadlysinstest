// Copy-text action (spec §4 一键复制文案): clipboard with execCommand fallback,
// selectable-text fallback box, and share_click / share_success tracking.
import { track } from './events.mjs';
import { escapeHtml, interpolate } from './quiz-view.mjs';

export function buildShareText(t, top, url) {
  const n1 = t.sins[top.first.sin].name;
  if (top.dual) {
    const n2 = t.sins[top.second.sin].name;
    return interpolate(t.result.shareTextDual, {
      sin1: n1,
      score1: top.first.score,
      sin2: n2,
      score2: top.second.score,
      url,
    });
  }
  return interpolate(t.result.shareTextSingle, {
    sin: n1,
    score: top.first.score,
    url,
  });
}

export async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to execCommand */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

// Selectable-text fallback when no clipboard path works (spec: 展示可选中的完整文本).
function showFallbackBox(button, text, label) {
  const box = document.createElement('div');
  box.className = 'copy-fallback-box';
  box.innerHTML =
    '<p>' + escapeHtml(label) + '</p>' +
    '<textarea rows="3" readonly></textarea>';
  const ta = box.querySelector('textarea');
  ta.value = text;
  button.after(box);
  ta.focus();
  ta.select();
}

export async function copyAction({ button, text, copiedLabel, fallbackLabel, kind }) {
  track('share_click', { kind });
  const ok = await copyText(text);
  if (ok) {
    track('share_success', { method: 'copy', kind });
    if (button) {
      const original = button.textContent;
      button.textContent = copiedLabel;
      button.classList.add('is-copied');
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove('is-copied');
      }, 1600);
    }
    return true;
  }
  if (button && !button.nextElementSibling?.classList?.contains('copy-fallback-box')) {
    showFallbackBox(button, text, fallbackLabel);
  }
  return false;
}
