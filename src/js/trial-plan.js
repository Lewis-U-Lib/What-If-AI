/* The worksheet belongs to the reader. Plans contain plain text only. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TrialPlan = factory();
})(typeof window === 'undefined' ? this : window, function () {
  'use strict';
  const questions = [
    ['goal','What am I trying to improve?'],
    ['trial','What will I try, and what remains my responsibility?'],
    ['preparation','What preparation and checking will this require?'],
    ['success','What would indicate that it helped?'],
    ['reconsider','When would I revise or abandon the approach?']
  ];
  const fields = new Set(questions.map(([field]) => field));
  const maxBytes = 2000000;
  function validId(id) {
    return typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(id) &&
      !['constructor','prototype','__proto__'].includes(id);
  }
  function object(value) {return value !== null && typeof value === 'object' && !Array.isArray(value);}
  function planMap(input, canonical) {
    if (!object(input) || Object.keys(input).length > 3000) throw Error('The collection has an invalid list of trial plans.');
    const plans = Object.create(null);
    for (const [id, value] of Object.entries(input)) {
      if (!validId(id) || !object(value)) throw Error('The file has an invalid trial plan.');
      const key = canonical(id), plan = Object.create(null);
      if (!validId(key) || Object.hasOwn(plans,key)) throw Error('This collection repeats a trial plan.');
      for (const [field, text] of Object.entries(value)) {
        if (!fields.has(field) || typeof text !== 'string' || text.length > 5000)
          throw Error('A trial response uses an unsupported field or exceeds 5,000 characters.');
        if (text !== '') plan[field] = text;
      }
      if (Object.keys(plan).length) plans[key] = plan;
    }
    return plans;
  }
  function file(saved, plans) {return {format:'what-if-ai-collection', version:1, saved, plans};}
  function checkSize(saved, plans) {
    if (saved.length > 3000 || Object.keys(plans).length > 3000 ||
        new TextEncoder().encode(JSON.stringify(file(saved,plans),null,2) + '\n').length > maxBytes)
      throw Error('The combined collection exceeds the file limit. Shorten a response or use a smaller collection.');
  }
  function blocks(plan) {
    if (!plan || !Object.keys(plan).length) return [];
    const result = [{text:'My small-trial plan',style:'Heading1'}];
    for (const [field, label] of questions) {
      result.push({text:label,style:'Heading2'}, {text:plan[field] || 'No response recorded.'});
    }
    return result;
  }
  return {questions, validId, planMap, file, blocks, maxBytes, checkSize};
});
