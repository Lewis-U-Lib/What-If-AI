/* Content shared by clipboard, Word, comparison, and planning sheets. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./license-badges'));
  else root.IdeaExport = factory(root.LicenseBadges);
})(typeof window === 'undefined' ? this : window, function (badges) {
  'use strict';
  const missing = 'Not stated';
  function noDerivatives(a) {
    return [a.lic, a.licu, a.lics].some(value => {
      if (!value) return false;
      const license = badges.identify(value);
      return license && ['by-nd','by-nc-nd'].includes(license.family) ||
        /\b(?:no[- ]?deriv(?:s|atives)|by(?:[- ]nc)?[- ]nd)\b/i.test(value);
    });
  }
  const note = 'NoDerivatives. This idea is reproduced verbatim. Share the original wording under its stated license. Your own trial notes are separate.';
  function comparison(a, site) {
    const goal = (a.srp || []).find(pair => pair[0] === 'goal' && pair[1]);
    const participants = [site.L.actor[a.ac], ...(a.sc || []).map(key => site.L.scale[key])].filter(Boolean);
    const access = [a.eq && a.eq !== 'not_specified' ? site.costLabel(a) : '', site.L.pc[a.pc], site.L.sa[a.sa]].filter(Boolean);
    return [
      ['Purpose', a.purpose || (goal && goal[1]) || missing],
      ['Participants', participants.join(' · ') || missing],
      ['Preparation', a.preparation || missing],
      ['Access requirements', access.join('. ') || missing],
      ['Human judgment', a.gate || missing]
    ];
  }
  function blocks(a, entryUrl) {
    const out = [];
    const add = (text, style) => { if (text) out.push({text: text, style: style || ''}); };
    const section = (name, value) => { if (value) {add(name,'Heading2'); add(value);} };
    add(a.t, 'Title');
    if (noDerivatives(a)) add(note);
    add(a.sum);
    // These are the published fields. Leave their wording, paragraph breaks, and ordering intact.
    section('What to produce', a.dl);
    section('Human judgment', a.gate);
    section('Checking the work', a.chk);
    section('Reflection or assessment', a.rf);
    section('A route without AI', a.na);
    if (noDerivatives(a)) {
      // Retain every additional narrative section in a verbatim export, including reported wording.
      section('Evidence and limitations', a.evs);
      section('What it depends on the AI tool for', a.dep);
      section('Risks and accessibility', a.risk);
      section('Adapting it', a.ad);
      for (const [label, value] of a.pa || []) section(label || 'A possible adaptation', value);
      for (const detail of a.miss || []) section('Detail the source leaves open', detail);
      for (const [field, value] of a.srp || []) {
        const label = {goal:'Goal',procedure:'Procedure',expected_output:'Expected output',verification_step:'How results are checked'}[field];
        section(label || field,value);
      }
      section('A prompt the source provides', a.pr);
      section('Tool named in the source', a.tool);
    }
    if (a.sa) section('Linked source material', {
      unmodified: 'Use the linked source item as published. It has its own reuse terms.',
      not_open: 'The linked source has no clear open license. Consult the source for its terms.',
      restricted: 'The linked source may require a purchase, subscription, membership, or permission.'
    }[a.sa]);
    add('Sources and attribution', 'Heading1');
    add(a.cr); add(a.cit); add(a.loc); add(a.url);
    add(a.lic || 'License not stated'); add(a.licu); add(a.lics); add(a.licn); add(a.attr); add(a.chg);
    if ((a.rel || []).length) {
      add('Works it draws on','Heading2');
      for (const [id, role, title, location] of a.rel) {
        add([role, title, location].filter(Boolean).join(' · '));
        if (entryUrl && id) add(entryUrl.split('#')[0] + '#src=' + encodeURIComponent(id));
      }
    }
    add('Collection entry','Heading2'); add('What If AI and The Register, Lewis University Library'); add(entryUrl);
    return out;
  }
  function text(blocks) { return blocks.map(block => block.text).join('\n\n'); }
  return {noDerivatives, note, comparison, blocks, text};
});
