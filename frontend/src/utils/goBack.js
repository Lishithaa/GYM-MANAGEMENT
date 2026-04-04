/**
 * Tracks in-app paths in sessionStorage so "Back" works even when login used
 * history.replace (no browser stack). Falls back to navigate(-1) or fallbackPath.
 */
const NAV_STACK_KEY = 'hg_nav_stack';

function readStack() {
  try {
    const raw = sessionStorage.getItem(NAV_STACK_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeStack(stack) {
  try {
    sessionStorage.setItem(NAV_STACK_KEY, JSON.stringify(stack));
  } catch {
    /* ignore */
  }
}

export function recordNavigationPath(pathname) {
  if (!pathname || typeof pathname !== 'string') return;
  const stack = readStack();
  const last = stack[stack.length - 1];
  if (last === pathname) return;
  stack.push(pathname);
  if (stack.length > 40) stack.splice(0, stack.length - 40);
  writeStack(stack);
}

export function goBack(navigate, fallbackPath) {
  const stack = readStack();
  if (stack.length >= 2) {
    stack.pop();
    const prev = stack[stack.length - 1];
    writeStack(stack);
    navigate(prev);
    return;
  }

  const state = window.history.state;
  if (state && typeof state.idx === 'number' && state.idx > 0) {
    navigate(-1);
    return;
  }
  if (window.history.length > 1) {
    navigate(-1);
    return;
  }
  navigate(fallbackPath);
}
