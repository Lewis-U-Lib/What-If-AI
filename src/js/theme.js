/* ════════════════════════════════════════════════════════════
   THEME · crimson, steel blue or light; textured or plain
   The stylesheets carry all three palettes (tools/palette.py writes the steel-blue twin of every
   crimson color, and the light twin of every color, at build time). This file chooses between
   them by setting data-theme="blue" or data-theme="light" on <html>, or leaving it off for crimson. It is loaded in the <head> without defer so the choice is
   applied before the page is drawn. The choice is kept in this browser only (localStorage);
   if storage is unavailable it lasts until the page is left.
   The help menu's palette button steps through them in order (crimson, blue, light, and back to
   crimson) and always names the one it will switch to. It is hidden in the markup and shown here,
   so it never appears where it cannot work.

   A second, separate choice is the plain reading view (src/css/plain.css): data-plain on <html>
   takes the textures, glows and display type off the same pages. It works in any palette and
   is kept the same way, under its own key.
════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var KEY = 'lul-whatifai-theme-v1', PLAIN = 'lul-whatifai-plain-v1', root = document.documentElement;
  var THEMES = ['crimson', 'blue', 'light'];                // the order the help menu's button steps through
  var BAR = { crimson: '#5b0a1f', blue: '#163442', light: '#e9e6df' };   // the browser's toolbar tint (<meta name="theme-color">)

  function known(theme){ return THEMES.indexOf(theme) > 0 ? theme : 'crimson'; }
  function stored(){ try { return known(window.localStorage.getItem(KEY)); } catch(_){ return 'crimson'; } }
  function store(theme){ try { if(theme === 'crimson') window.localStorage.removeItem(KEY); else window.localStorage.setItem(KEY, theme); } catch(_){} }
  function current(){ return known(root.getAttribute('data-theme')); }
  function after(theme){ return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]; }

  function apply(theme){
    if(theme === 'crimson') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content', BAR[theme]);
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for(var i = 0; i < buttons.length; i++){
      var label = buttons[i].querySelector('[data-theme-label]');
      if(label) label.textContent = 'Switch to ' + after(theme);
      buttons[i].hidden = false;
    }
  }

  function storedPlain(){ try { return window.localStorage.getItem(PLAIN) === '1'; } catch(_){ return false; } }
  function storePlain(on){ try { if(on) window.localStorage.setItem(PLAIN, '1'); else window.localStorage.removeItem(PLAIN); } catch(_){} }
  function isPlain(){ return root.hasAttribute('data-plain'); }
  function applyPlain(on){
    if(on) root.setAttribute('data-plain', ''); else root.removeAttribute('data-plain');
    var buttons = document.querySelectorAll('[data-plain-toggle]');
    for(var i = 0; i < buttons.length; i++){
      var label = buttons[i].querySelector('[data-plain-label]');
      if(label) label.textContent = on ? 'Switch to textured view' : 'Switch to plain reading view';
      buttons[i].hidden = false;
    }
  }

  apply(stored());                                           // before first paint: the attribute and the toolbar tint
  applyPlain(storedPlain());

  function ready(){
    apply(current());                                        // now the menu exists: label and show its buttons
    applyPlain(isPlain());
    document.addEventListener('click', function(e){
      var plain = e.target && e.target.closest ? e.target.closest('[data-plain-toggle]') : null;
      if(plain){ var on = !isPlain(); applyPlain(on); storePlain(on); return; }
      var btn = e.target && e.target.closest ? e.target.closest('[data-theme-toggle]') : null;
      if(!btn) return;
      var next = after(current());
      apply(next); store(next);
    });
    // another tab or the other tool changed the choice: follow it
    window.addEventListener('storage', function(e){
      if(e.key === KEY || e.key === null) apply(stored());
      if(e.key === PLAIN || e.key === null) applyPlain(storedPlain());
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
