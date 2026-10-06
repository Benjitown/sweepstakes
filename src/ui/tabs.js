// The Upgrades / Add-ons / Stats tabs.
import { $, $$ } from '../core/util.js';
import { Sound } from '../audio/sound.js';
import { RackView } from './addon-views.js';
import { StatsView } from './stats-view.js';

export const Tabs = {
  current: 'shop',
  show(id) {
    this.current = id;
    $$('.tabs [data-tab]').forEach(x => x.setAttribute('aria-selected', x.dataset.tab === id));
    ['shop', 'rack', 'stats'].forEach(k => { $('#' + k).hidden = k !== id; });
    if (id === 'stats') StatsView.render();
    if (id === 'rack') RackView.render();
  },
  bind() { $$('.tabs [data-tab]').forEach((tb, k) => tb.onclick = () => { Sound.tab(k * 2); this.show(tb.dataset.tab); }); },
  showing: id => !$('#' + id).hidden,
};
