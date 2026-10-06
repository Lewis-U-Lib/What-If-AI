/* Terms decoded by the ✦ tooltips. Mark up prose as:
   <span class="jargon" data-j="tensor">the spreadsheets</span> */
window.JARGON = {
  /* tensor:{met:'the "spreadsheets"', term:'Tensor', def:'...', refs:'1, 2'} */
};

/* ════════════════════════════════════════════════════════════
   LEWIS UNIVERSITY LIBRARY · CORE INTERACTION ENGINES
   Companion to lul-core.css. ES5-only, no dependencies, no build step.
   Drop this in ONE <script> at the very bottom of <body>.
   (LibGuides' CKEditor strips <script> tags placed mid-markup.)
════════════════════════════════════════════════════════════ */
(function(){
"use strict";

var reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ── page zoom awareness ──────────────────────────────────────
   The stylesheet applies zoom:1.25 above 761px. Any code that
   positions a fixed-position element from getBoundingClientRect()
   must divide by this factor, or tooltips land in the wrong place. */
var zq = window.matchMedia('(min-width:761px)');
function pageZoom(){ return zq.matches ? 1.25 : 1; }

/* ── measure-and-lock registry ────────────────────────────────
   The anti-jump engine. Panels that swap content (tabs, steppers,
   carousels) measure their tallest state once, lock the container
   to it, and stop resizing the page on every interaction.
   Register a locking function; it re-runs on debounced resize. */
var heightLocks = [];
function registerHeightLock(fn){ heightLocks.push(fn); try{ fn(false); }catch(e){} }
function runHeightLocks(force){
  heightLocks.forEach(function(f){ try{ f(force); }catch(e){} });
}
var hlResizeT = null;
window.addEventListener('resize', function(){
  clearTimeout(hlResizeT);
  hlResizeT = setTimeout(function(){ runHeightLocks(true); }, 160);
});

/* Standard lock: clone each panel off-screen, find the tallest, pin the row.
   Pass a container and a selector for its swappable children. */
function lockTallest(container, childSel, cap){
  if(!container) return;
  var kids = Array.prototype.slice.call(container.querySelectorAll(childSel));
  if(!kids.length) return;
  var need = 0;
  kids.forEach(function(k){
    var clone = k.cloneNode(true);
    clone.style.cssText = 'position:absolute;visibility:hidden;display:block;width:' +
      container.clientWidth + 'px;';
    container.appendChild(clone);
    if(clone.scrollHeight + 2 > need){ need = clone.scrollHeight + 2; }
    container.removeChild(clone);
  });
  if(cap && need > cap){ need = cap; }
  container.style.minHeight = need + 'px';
}

/* ── scroll progress bar ── */
var prog = document.getElementById('progress');
if(prog){
  window.addEventListener('scroll', function(){
    var h = document.documentElement;
    var pct = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
    prog.style.width = pct + '%';
  }, {passive:true});
}

/* ── scroll reveal ── */
var io = new IntersectionObserver(function(es){
  es.forEach(function(e){
    if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
  });
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

/* ── step-pill scrollspy ──
   Each .step is an <a href="#section-id">. The observer margins are
   tuned so the pill flips when the section owns the middle of the screen. */
var stepLinks = Array.prototype.slice.call(document.querySelectorAll('.steps .step'));
if(stepLinks.length){
  var secs = stepLinks.map(function(a){ return document.querySelector(a.getAttribute('href')); });
  var spy = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(e.isIntersecting){
        stepLinks.forEach(function(a){
          a.classList.toggle('current', a.getAttribute('href') === '#' + e.target.id);
        });
      }
    });
  },{rootMargin:'-30% 0px -60% 0px'});
  secs.forEach(function(s){ if(s) spy.observe(s); });
}

/* ── jargon tooltips ──
   Populate window.JARGON with {key:{met,term,def,refs}} before this runs,
   then mark up terms as <span class="jargon" data-j="key">plain words</span>.
   met = the metaphor the reader just encountered; term = the technical name. */
(function(){
  var els = Array.prototype.slice.call(document.querySelectorAll('.jargon'));
  if(!els.length || !window.JARGON) return;
  var jt = document.createElement('div');
  jt.className = 'jtip'; jt.setAttribute('role','tooltip');
  document.body.appendChild(jt);
  var hideT = null, cur = null;
  function show(el){
    var d = window.JARGON[el.getAttribute('data-j')]; if(!d) return;
    clearTimeout(hideT); cur = el;
    jt.innerHTML = '<div class="jt-met">You read: ' + d.met + '</div>' +
      '<div class="jt-term">' + d.term + '</div>' +
      '<p class="jt-def">' + d.def + '</p>' +
      (d.refs ? '<a class="jt-src" href="#refs">→ sources: refs [' + d.refs + ']</a>' : '');
    jt.classList.add('show');
    var z = pageZoom(), r = el.getBoundingClientRect();
    var tw = jt.offsetWidth * z, th = jt.offsetHeight * z;
    var vx = Math.max(8, Math.min(r.left + r.width/2 - tw/2, window.innerWidth - tw - 8));
    var vy = r.top - th - 10;
    if(vy < 8){ vy = r.bottom + 10; }
    jt.style.left = (vx/z).toFixed(1) + 'px';
    jt.style.top  = (vy/z).toFixed(1) + 'px';
  }
  function hide(){
    hideT = setTimeout(function(){ jt.classList.remove('show'); cur = null; }, 160);
  }
  els.forEach(function(el){
    el.addEventListener('mouseenter', function(){ show(el); });
    el.addEventListener('mouseleave', hide);
    el.addEventListener('focus', function(){ show(el); });
    el.addEventListener('blur', hide);
    el.addEventListener('click', function(e){
      e.stopPropagation();
      if(cur === el && jt.classList.contains('show')){ jt.classList.remove('show'); cur = null; }
      else { show(el); }
    });
  });
  jt.addEventListener('mouseenter', function(){ clearTimeout(hideT); });
  jt.addEventListener('mouseleave', hide);
  document.addEventListener('click', function(e){
    var t = e.target;
    if(!(t.closest && (t.closest('.jargon') || t.closest('.jtip')))){
      jt.classList.remove('show'); cur = null;
    }
  });
})();

/* ── flip cards ── */
document.querySelectorAll('.flip').forEach(function(f){
  f.addEventListener('click', function(){ f.classList.toggle('flipped'); });
  f.setAttribute('tabindex','0');
  f.addEventListener('keydown', function(e){
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); f.classList.toggle('flipped'); }
  });
});

/* ── FAB menu + Ask Us chat modal ── */
(function(){
  var fabWrap   = document.getElementById('fabWrap'),
      fabToggle = document.getElementById('fabToggle'),
      fabMenu   = document.getElementById('fabMenu'),
      fabScrim  = document.getElementById('fabScrim'),
      fabAskUs  = document.getElementById('fabAskUs'),
      chatModal = document.getElementById('chatModal'),
      chatFrame = document.getElementById('chatFrame'),
      chatClose = document.getElementById('chatModalClose');
  if(!fabWrap || !fabToggle) return;

  function fabClose(){
    if(fabMenu && fabMenu.contains(document.activeElement)) fabToggle.focus();
    fabWrap.classList.remove('open');
    if(fabScrim) fabScrim.classList.remove('show');
    fabToggle.setAttribute('aria-expanded','false');
  }
  /* While the chat is open it behaves as a modal dialog: focus moves to its title, the rest of the page
     is inert, Tab stays inside, and closing it returns focus to the menu button that opened it. */
  var chatOpener = null, madeInert = [];
  function chatFocusables(){
    return [].filter.call(chatModal.querySelectorAll('a[href],button,iframe,[tabindex]:not([tabindex="-1"])'),
      function(el){ return !el.disabled && el.getClientRects().length; });
  }
  function setBackgroundInert(on){
    if(on){
      [].forEach.call(document.body.children, function(el){
        if(el === chatModal || el.contains(chatModal) || el.hasAttribute('inert') || el.tagName === 'SCRIPT') return;
        el.setAttribute('inert',''); madeInert.push(el);
      });
    } else {
      madeInert.forEach(function(el){ el.removeAttribute('inert'); }); madeInert = [];
    }
  }
  /* the iframe stays unloaded until first open — keeps initial paint fast */
  function openChat(){
    fabClose();
    if(chatFrame && !chatFrame.getAttribute('src')){
      chatFrame.setAttribute('src', chatFrame.getAttribute('data-src'));
    }
    if(chatModal && !chatModal.classList.contains('open')){
      chatOpener = fabToggle;
      chatModal.classList.add('open');
      chatModal.setAttribute('aria-hidden','false');
      document.body.classList.add('chat-open');
      setBackgroundInert(true);
      var title = document.getElementById('chatModalTitle');
      if(title){ title.setAttribute('tabindex','-1'); title.focus({preventScroll:true}); }
    }
  }
  function closeChat(){
    if(chatModal && chatModal.classList.contains('open')){
      chatModal.classList.remove('open');
      chatModal.setAttribute('aria-hidden','true');
      document.body.classList.remove('chat-open');
      setBackgroundInert(false);
      var back = chatOpener; chatOpener = null;
      if(back && document.contains(back)){ try{ back.focus({preventScroll:true}); }catch(_){} }
    }
  }
  if(chatModal) chatModal.addEventListener('keydown', function(e){
    if(e.key !== 'Tab') return;
    var list = chatFocusables(); if(!list.length) return;
    var first = list[0], last = list[list.length-1], here = document.activeElement;
    var inside = chatModal.contains(here) && list.indexOf(here) >= 0;
    if(e.shiftKey && (here === first || !inside)){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && (here === last || !inside)){ e.preventDefault(); first.focus(); }
  });
  fabToggle.addEventListener('click', function(e){
    var open = fabWrap.classList.toggle('open');
    if(fabScrim) fabScrim.classList.toggle('show', open);
    fabToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if(open && e.detail === 0 && fabMenu){
      var first = fabMenu.querySelector('a[href],button');
      if(first) first.focus();
    }
  });
  if(fabScrim) fabScrim.addEventListener('click', fabClose);
  if(fabMenu) fabMenu.addEventListener('click', function(e){
    if(e.target.closest('[data-open-register-tour]')) fabClose();
  });
  if(fabAskUs) fabAskUs.addEventListener('click', function(e){ e.preventDefault(); openChat(); });
  if(chatClose) chatClose.addEventListener('click', closeChat);
  if(chatModal) chatModal.addEventListener('click', function(e){
    if(e.target === chatModal) closeChat();
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){
      if(chatModal && chatModal.classList.contains('open')){ closeChat(); }
      else { fabClose(); }
    }
  });
})();

/* expose the pieces later scripts need */
window.LUL = {
  pageZoom: pageZoom,
  reduce: reduce,
  registerHeightLock: registerHeightLock,
  runHeightLocks: runHeightLocks,
  lockTallest: lockTallest
};

})();
