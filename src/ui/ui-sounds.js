// Menu sounds: press, hover and select.
import { TABLES } from '../data/economy.js';
import { Sound } from '../audio/sound.js';

export const UiSounds = {
  bind() {
    let hovered = null;
    document.addEventListener('pointerdown', e => {
      const el = e.target.closest('button, label.sw'); if (!el || el.disabled) return;
      if (el.closest('.grid') || el.classList.contains('pick') || el.classList.contains('hold')) return;
      Sound.press();
    }, true);
    document.addEventListener('click', e => {
      const el = e.target.closest('button'); if (!el || el.disabled) return;
      if (el.matches('.tbl')) Sound.select(Math.max(0, TABLES.findIndex(t => t.id === el.dataset.t)));
      else if (el.matches('.quick button, .side-btn, .betrow .btn')) Sound.pop(el.dataset.q === 'max' || el.dataset.q === '1' ? 2 : 0);
      else if (el.matches('.acard')) Sound.card();
      else if (el.matches('.t-flag, .t-probe')) Sound.pop(1);
    }, true);
    if (matchMedia('(hover: hover)').matches) document.addEventListener('mouseover', e => {
      const el = e.target.closest('.btn, .tbl, .acard, .tabs button, .tool, .quick button');
      if (el === hovered) return; hovered = el;
      if (el && !el.disabled) Sound.hover();
    });
  },
};
