function systemEventWindowResized(p) {
  if (!p.shared) p.shared = {};
  if (!p.shared.debounce) p.shared.debounce = {};

  clearTimeout(p.shared.debounce.resizeTimer);
  p.shared.debounce.resizeTimer = setTimeout(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    p.resizeCanvas(w, h);
    p.shared.viewport = { width: w, height: h };
    console.log(`Window resized to ${w}x${h}`);
    //How to notify subscribers
    // p.shared.ui?.onResize?.(w, h);
    // p.shared.menu?.onResize?.(w, h);
  }, 150);
}

function systemEventDeviceTurned(p) {
  if (!p.shared) p.shared = {};
  if (!p.shared.debounce) p.shared.debounce = {};

  clearTimeout(p.shared.debounce.deviceTimer);
  p.shared.debounce.deviceTimer = setTimeout(() => {
    let angle = 0;
    let type = 'unknown';

    if (screen.orientation) {
      angle = screen.orientation.angle || 0;
      type = screen.orientation.type || 'unknown';
    } else {
      type = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }

    if (p.onDeviceTurned) p.onDeviceTurned({ angle, type });
  }, 150);
}

export function registerSystemEvents(p) {
  window.addEventListener('resize', () => systemEventWindowResized(p));
  window.addEventListener('orientationchange', () => systemEventDeviceTurned(p));
  screen.orientation?.addEventListener('change', () => systemEventDeviceTurned(p));

  window.addEventListener('focus', () => p.onWindowFocus?.());
  window.addEventListener('blur', () => p.onWindowBlur?.());
}