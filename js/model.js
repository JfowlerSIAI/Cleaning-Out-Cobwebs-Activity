/* Proposal 25: economic concepts by David Friedman; development by Eric McKee.
   Fresh, DOM-free annual cobweb and inventory-clearing model. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CobwebModel = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var EPS = 1e-9;
  var LIMITS = {
    A: [50, 500, 1], B: [0.5, 5, 0.1], C: [0, 100, 1], D: [0.1, 8, 0.1],
    initialPrice: [0, 1000, 0.1], cash: [0, 10000, 0.01],
    buy: [0, 1000, 0.1], sell: [0, 1000, 0.1], years: [1, 100, 1]
  };
  var PROMPTS = {
    converge: { title: '1. Follow convergence', years: 10, question: 'Where does the baseline price go after ten years?', answer: 'converges',
      options: [['converges', 'Approaches equilibrium'], ['repeats', 'Repeats the original two prices'], ['diverges', 'Moves farther from equilibrium']],
      explanation: 'D/B = 0.75. Each annual deviation reverses sign and shrinks by 25%, so the price approaches $50.' },
    repeat: { title: '2. Find a repeating cycle', years: 4, question: 'What happens to the baseline price over four years?', answer: 'repeats',
      options: [['converges', 'Approaches equilibrium'], ['repeats', 'Repeats'], ['diverges', 'Moves farther from equilibrium']],
      explanation: 'D/B = 1. The baseline alternates between $30 and $70 instead of converging. Speculation narrows the cycle to $40–$60 in this example.' },
    stabilize: { title: '3. Compare speculation', years: 5, question: 'What does the $2,000 speculator change in this example?', answer: 'stabilizes',
      options: [['stabilizes', 'Speculation stabilizes this example'], ['same', 'Both runs follow the same prices'], ['always', 'Speculation guarantees stability for every policy']],
      explanation: 'Buying 30 units at $40 leaves $800 cash and holds the speculative run at its $40 equilibrium. The baseline reaches the linear model boundary before year 5. This is an example, not a universal guarantee.' },
    limits: { title: '4. Discover the cash limit', years: 5, question: 'What does the same policy with only $100 demonstrate?', answer: 'limited',
      options: [['limited', 'Limited cash can prevent stabilization'], ['always', 'Any positive cash guarantees stabilization'], ['none', 'Cash has no effect on purchases']],
      explanation: 'The first purchase exhausts the $100 budget before the $40 threshold is reached. This run also reaches the model boundary before year 5; financial limits can prevent stabilization.' }
  };
  function zero(n) { return Math.abs(n) < EPS ? 0 : n; }
  function initial() { return { A: 200, B: 2, C: 25, D: 1.5, initialPrice: 70, cash: 2000, buy: 40, sell: 60, years: 40 }; }
  function validate(value, key) {
    if (!LIMITS[key]) return 'Unknown parameter.';
    if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '' || !Number.isFinite(Number(value))) return 'Enter a finite number.';
    var n = Number(value), lim = LIMITS[key];
    if (n < lim[0] || n > lim[1]) return 'Use a value from ' + lim[0] + ' to ' + lim[1] + '.';
    if (Math.abs(n / lim[2] - Math.round(n / lim[2])) > 1e-7) return 'Use steps of ' + lim[2] + '.';
    return '';
  }
  function validateParameters(p) {
    var errors = {};
    Object.keys(LIMITS).forEach(function (key) { var error = validate(p && p[key], key); if (error) errors[key] = error; });
    if (!errors.A && !errors.C && Number(p.C) >= Number(p.A)) errors.C = 'Supply intercept C must be smaller than demand intercept A.';
    if (!errors.A && !errors.B) {
      var choke = Number(p.A) / Number(p.B);
      ['initialPrice', 'buy', 'sell'].forEach(function (key) {
        if (!errors[key] && Number(p[key]) > choke + EPS) errors[key] = 'Use a price no greater than A/B (' + choke.toFixed(2) + ').';
      });
    }
    if (!errors.buy && !errors.sell && Number(p.buy) >= Number(p.sell)) errors.sell = 'The selling threshold must exceed the buying threshold.';
    return errors;
  }
  function parameters(p) {
    if (Object.keys(validateParameters(p)).length) throw new RangeError('Invalid cobweb parameters.');
    var copy = {}; Object.keys(LIMITS).forEach(function (key) { copy[key] = Number(p[key]); }); return copy;
  }
  function preset(id, base) {
    var p = Object.assign({}, base || initial(), { A: 200, B: 2 });
    if (id === 'converge') Object.assign(p, { C: 25, D: 1.5, initialPrice: 70 });
    else if (id === 'repeat') Object.assign(p, { C: 0, D: 2, initialPrice: 70 });
    else if (id === 'diverge') Object.assign(p, { C: 0, D: 3, initialPrice: 50 });
    else throw new RangeError('Unknown preset.');
    return p;
  }
  function scenario(id) {
    if (!PROMPTS[id]) throw new RangeError('Unknown prompt.');
    var p = preset(id === 'converge' ? 'converge' : id === 'repeat' ? 'repeat' : 'diverge');
    if (id === 'limits') p.cash = 100;
    return p;
  }
  function equilibrium(p) {
    p = parameters(p);
    var price = (p.A - p.C) / (p.B + p.D), ratio = p.D / p.B;
    return { price: price, quantity: p.C + p.D * price, ratio: ratio,
      behavior: Math.abs(ratio - 1) < EPS ? 'Repeating' : ratio < 1 ? 'Converging' : 'Diverging' };
  }
  function start(p) {
    p = parameters(p);
    function run(speculation) {
      return { speculation: speculation, status: 'active', stop: null, history: [{ year: 0, price: p.initialPrice,
        production: null, consumption: null, trade: 0, cash: p.cash, inventory: 0, valuation: 0, wealth: p.cash, constraint: '', previousPrice: null, preTradePrice: null }] };
    }
    return { params: p, year: 0, baseline: run(false), speculation: run(true) };
  }
  function next(p, run) {
    p = parameters(p);
    if (run.status !== 'active') return run;
    var old = run.history[run.history.length - 1], year = old.year + 1;
    var q = zero(p.C + p.D * old.price), p0 = zero((p.A - q) / p.B);
    if (q < 0 || p0 < 0) {
      return Object.assign({}, run, { status: 'boundary', stop: { year: year, production: q, preTradePrice: p0,
        reason: q < 0 ? 'Negative production' : 'Negative price before speculation' } });
    }
    var x = 0, constraint = '';
    if (run.speculation && p0 < p.buy - EPS) {
      var wanted = p.B * (p.buy - p0);
      var cashLimit = old.cash > 0 ? 2 * old.cash / (Math.sqrt(p0 * p0 + 4 * old.cash / p.B) + p0) : 0;
      x = Math.min(wanted, q, cashLimit);
      if (cashLimit < wanted - EPS && cashLimit <= q + EPS) constraint = 'Cash limits buying.';
      if (q < wanted - EPS && q <= cashLimit + EPS) constraint += (constraint ? ' ' : '') + 'Production limits buying.';
    } else if (run.speculation && p0 > p.sell + EPS) {
      var wantedSale = p.B * (p0 - p.sell);
      x = -Math.min(old.inventory, wantedSale);
      if (old.inventory < wantedSale - EPS) constraint = 'Inventory limits selling.';
    }
    x = zero(x);
    var price = zero(p0 + x / p.B), cash = zero(old.cash - x * price), inventory = zero(old.inventory + x);
    var row = { year: year, price: price, production: q, consumption: zero(q - x), trade: x, cash: cash,
      inventory: inventory, valuation: inventory * price, wealth: cash + inventory * price, constraint: constraint,
      previousPrice: old.price, preTradePrice: p0 };
    return Object.assign({}, run, { history: run.history.concat([row]), status: year >= p.years ? 'horizon' : 'active' });
  }
  function advance(state) {
    if (finished(state)) return state;
    return { params: state.params, year: state.year + 1, baseline: next(state.params, state.baseline), speculation: next(state.params, state.speculation) };
  }
  function finished(state) { return state.baseline.status !== 'active' && state.speculation.status !== 'active'; }
  function checkPrompt(id, state, answer) {
    var prompt = PROMPTS[id];
    if (!prompt) return { done: false, message: 'Choose an experiment first.' };
    var expected = scenario(id);
    if (Object.keys(LIMITS).some(function (key) { return state.params[key] !== expected[key]; })) return { done: false, message: 'Reload this experiment to restore its starting conditions.' };
    if (state.year < prompt.years) return { done: false, message: 'Step or run through at least year ' + prompt.years + ', then check your answer.' };
    if (answer !== prompt.answer) return { done: false, message: 'Look again at the runs and choose the explanation that matches their results.' };
    var last = state.baseline.history[state.baseline.history.length - 1];
    var observed = id === 'converge' ? Math.abs(last.price - 50) < 2 : id === 'repeat' ? Math.abs(last.price - (last.year % 2 ? 30 : 70)) < EPS
      : id === 'stabilize' ? state.baseline.status === 'boundary' && state.baseline.stop.year === 5 && state.speculation.history.length >= 6 && Math.abs(state.speculation.history[5].price - 40) < EPS
      : state.speculation.status === 'boundary' && state.speculation.stop.year === 5;
    return observed ? { done: true, message: 'Done. ' + prompt.explanation } : { done: false, message: 'Reload the experiment and follow its run instructions.' };
  }
  return { EPS: EPS, LIMITS: LIMITS, PROMPTS: PROMPTS, initial: initial, validate: validate, validateParameters: validateParameters,
    parameters: parameters, preset: preset, scenario: scenario, equilibrium: equilibrium, start: start, next: next, advance: advance, finished: finished, checkPrompt: checkPrompt };
});
