/* ════════════════════════════════════════════════════════════
   THEME · crimson or steel blue
   The stylesheets carry both palettes (tools/palette.py writes the blue twin of every crimson
   color at build time). This file chooses between them by setting data-theme="blue" on <html>,
   or leaving it off for crimson. It is loaded in the <head> without defer so the choice is
   applied before the page is drawn. The choice is kept in this browser only (localStorage);
   if storage is unavailable it lasts until the page is left.
   The help menu's "Switch to blue" / "Switch to crimson" button is hidden in the markup and
   shown here, so it never appears where it cannot work.
════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var KEY = 'lul-whatifai-theme-v1', root = document.documentElement;
  var BAR = { crimson: '#5b0a1f', blue: '#163442' };       // the browser's toolbar tint (<meta name="theme-color">)

  function stored(){ try { return window.localStorage.getItem(KEY) === 'blue' ? 'blue' : 'crimson'; } catch(_){ return 'crimson'; } }
  function store(theme){ try { if(theme === 'blue') window.localStorage.setItem(KEY, 'blue'); else window.localStorage.removeItem(KEY); } catch(_){} }
  function current(){ return root.getAttribute('data-theme') === 'blue' ? 'blue' : 'crimson'; }

  function apply(theme){
    if(theme === 'blue') root.setAttribute('data-theme', 'blue'); else root.removeAttribute('data-theme');
    var meta = document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content', BAR[theme]);
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for(var i = 0; i < buttons.length; i++){
      var label = buttons[i].querySelector('[data-theme-label]');
      if(label) label.textContent = theme === 'blue' ? 'Switch to crimson' : 'Switch to blue';
      buttons[i].hidden = false;
    }
  }

  apply(stored());                                           // before first paint: the attribute and the toolbar tint

  function ready(){
    apply(current());                                        // now the menu exists: label and show its button
    document.addEventListener('click', function(e){
      var btn = e.target && e.target.closest ? e.target.closest('[data-theme-toggle]') : null;
      if(!btn) return;
      var next = current() === 'blue' ? 'crimson' : 'blue';
      apply(next); store(next);
    });
    // another tab or the other tool changed the choice: follow it
    window.addEventListener('storage', function(e){ if(e.key === KEY || e.key === null) apply(stored()); });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
