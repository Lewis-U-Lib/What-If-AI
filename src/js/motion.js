/* Pause motion: one button in the top bar holds every moving light still (the pulse along a seam, the breathing
   of the lit bar, the logo's reflection) and starts them again. The choice lasts for this browser tab, so it
   carries from one tool to the other; nothing is sent anywhere. The button is hidden when the reader's system
   already asks for reduced motion or more contrast, because nothing moves then (see theme-alloy.css). */
(function(){
  'use strict';
  var KEY = 'wia.motion', root = document.documentElement;
  var btn = document.querySelector('[data-motion-toggle]');
  if(!btn) return;
  function stored(){ try { return window.sessionStorage.getItem(KEY) === 'paused'; } catch(_){ return false; } }
  function store(paused){ try { if(paused) window.sessionStorage.setItem(KEY, 'paused'); else window.sessionStorage.removeItem(KEY); } catch(_){} }
  function apply(paused){
    if(paused) root.setAttribute('data-motion', 'paused'); else root.removeAttribute('data-motion');
    btn.textContent = paused ? 'Play motion' : 'Pause motion';
  }
  apply(stored());
  btn.hidden = false;
  btn.addEventListener('click', function(){
    var paused = root.getAttribute('data-motion') !== 'paused';
    apply(paused); store(paused);
  });
})();
