// Event bus: the game announces what happened; views, sounds, chat and rank listen.

/* =====================================================================================
   Observer · https://refactoring.guru/design-patterns/observer
   ===================================================================================== */
export const bus = (() => {
  const subs = new Map();
  return {
    on(evt, fn) { if (!subs.has(evt)) subs.set(evt, []); subs.get(evt).push(fn); },
    emit(evt, data = {}) { for (const fn of (subs.get(evt) || []).slice()) { try { fn(data); } catch (e) { console.error(`[${evt}]`, e); } } },
  };
})();
