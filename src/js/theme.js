/* ════════════════════════════════════════════════════════════
   THEME · the palette family
   The stylesheets carry every palette (tools/palette.py writes each color's twin in each palette
   at build time). This file chooses between them by setting data-theme on <html>, or leaving it
   off for crimson, and data-tone="light" for the palettes that put dark ink on light plates.
   It is loaded in the <head> without defer so the choice is applied before the page is drawn.
   The choice is kept in this browser only (localStorage); if storage is unavailable it lasts
   until the page is left.
   The help menu's palette swatches are hidden in the markup and shown here, so they never
   appear where they cannot work. The list below matches tools/palette.py (tests/palette_test.py checks).
════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var KEY = 'lul-whatifai-theme-v1', root = document.documentElement;
  // name: [menu label, the browser's toolbar tint (<meta name="theme-color">), tone]
  var PALETTES = {
    crimson:  ['Crimson', '#5b0a1f', 'dark'],
    blue:     ['Steel blue', '#163442', 'dark'],
    charcoal: ['Charcoal', '#3f413a', 'dark'],
    green:    ['Fern green', '#718954', 'light'],
    khaki:    ['Khaki', '#8b865a', 'light'],
    ice:      ['Ice blue', '#5ab3c4', 'light'],
    bone:     ['Bone', '#b8b48f', 'light'],
    gold:     ['Gold', '#d7b026', 'light'],
    lemon:    ['Pale yellow', '#f5cd38', 'light']
  };

  function known(name){ return Object.prototype.hasOwnProperty.call(PALETTES, name) ? name : 'crimson'; }
  function stored(){ try { return known(window.localStorage.getItem(KEY)); } catch(_){ return 'crimson'; } }
  function store(theme){ try { if(theme === 'crimson') window.localStorage.removeItem(KEY); else window.localStorage.setItem(KEY, theme); } catch(_){} }
  function current(){ return known(root.getAttribute('data-theme')); }

  function apply(theme){
    var p = PALETTES[theme];
    if(theme === 'crimson') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', theme);
    if(p[2] === 'light') root.setAttribute('data-tone', 'light'); else root.removeAttribute('data-tone');
    var meta = document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content', p[1]);
    var scheme = document.querySelector('meta[name="color-scheme"]');
    if(scheme) scheme.setAttribute('content', p[2]);
    var pickers = document.querySelectorAll('[data-theme-picker]');
    for(var i = 0; i < pickers.length; i++){
      var label = pickers[i].querySelector('[data-theme-label]');
      if(label) label.textContent = p[0];
      var choices = pickers[i].querySelectorAll('[data-theme-choice]');
      for(var j = 0; j < choices.length; j++)
        choices[j].setAttribute('aria-pressed', choices[j].getAttribute('data-theme-choice') === theme ? 'true' : 'false');
      pickers[i].hidden = false;
    }
  }

  apply(stored());                                           // before first paint: the attributes and the toolbar tint

  function ready(){
    apply(current());                                        // now the menu exists: mark the chosen swatch and show the row
    document.addEventListener('click', function(e){
      var btn = e.target && e.target.closest ? e.target.closest('[data-theme-choice]') : null;
      if(!btn) return;
      var next = known(btn.getAttribute('data-theme-choice'));
      apply(next); store(next);
    });
    // another tab or the other tool changed the choice: follow it
    window.addEventListener('storage', function(e){ if(e.key === KEY || e.key === null) apply(stored()); });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
