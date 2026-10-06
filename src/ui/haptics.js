// Phone vibration for the big moments. Android browsers buzz; iPhones ignore it. There's an off switch in Stats.
import { pref } from '../core/state.js';

export const Haptics = {
  buzz(pattern) {
    if (!pref('vibe') || typeof navigator.vibrate !== 'function') return;
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    try { navigator.vibrate(pattern); } catch (e) { /* not allowed yet (no tap so far) */ }
  },
};
