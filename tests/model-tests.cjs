'use strict';
const M = require('../js/model.js');
let checks = 0;
function ok(value, message) { checks++; if (!value) throw new Error(message); }
function close(a, b, message) { ok(Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(b)), message + ': ' + a + ' vs ' + b); }
function run(p, years = p.years) { let state = M.start(p); for (let i = 0; i < years; i++) state = M.advance(state); return state; }
function changed(values) { return Object.assign(M.initial(), values); }
const eq = M.equilibrium(M.initial()); close(eq.price, 50, 'Equilibrium price'); close(eq.quantity, 100, 'Equilibrium quantity');
const first = run(M.initial(), 1); close(first.baseline.history[1].production, 130, 'Initial production'); close(first.baseline.history[1].price, 35, 'Initial price');
close(first.speculation.history[1].trade, 10, 'Default buy'); close(first.speculation.history[1].price, 40, 'Default threshold'); close(first.speculation.history[1].cash, 1600, 'Default cash');
const converge = run(M.initial());
for (const row of converge.baseline.history) close(row.price, 50 + 20 * Math.pow(-0.75, row.year), 'Independent closed-form convergence');
const repeat = run(M.preset('repeat'));
for (const row of repeat.baseline.history.slice(1)) close(row.price, row.year % 2 ? 30 : 70, 'Two-price baseline');
const diverge = run(M.preset('diverge'));
[25, 62.5, 6.25, 90.625].forEach((price, i) => close(diverge.baseline.history[i + 1].price, price, 'Divergent price'));
ok(diverge.baseline.status === 'boundary' && diverge.baseline.stop.year === 5, 'Baseline boundary year');
close(diverge.baseline.stop.preTradePrice, -35.9375, 'Attempted negative price');
ok(diverge.baseline.history.length === 5 && diverge.speculation.history.length === 41, 'Independent stopping without padding');
close(diverge.speculation.history[1].trade, 30, 'Stabilizing purchase'); close(diverge.speculation.history[1].cash, 800, 'Cash after stabilization');
for (const row of diverge.speculation.history.slice(1)) close(row.price, 40, 'Stabilized at equilibrium');
const limited = run(M.scenario('limits'));
ok(limited.speculation.stop.year === 5 && limited.speculation.status === 'boundary', 'Finite cash fails to stabilize');
close(limited.speculation.history[1].cash, 0, 'Budget exhausted');
const x = limited.speculation.history[1].trade;
close(x, (-50 + Math.sqrt(2500 + 800)) / 2, 'Independent quadratic root');
close(x * (25 + x / 2), 100, 'Budget clearing identity');
ok(limited.speculation.history[1].constraint.includes('Cash'), 'Cash limitation explained');
const zeroCash = run(changed({ cash: 0 }), 3);
for (let i = 1; i <= 3; i++) close(zeroCash.speculation.history[i].price, zeroCash.baseline.history[i].price, 'No cash or inventory matches baseline');
const zeroPrice = run(changed({ C: 0, D: 2, initialPrice: 100, cash: 100 }), 1);
close(zeroPrice.baseline.history[1].price, 0, 'Zero price allowed');
close(zeroPrice.speculation.history[1].price, Math.sqrt(100 / 2), 'Zero-price cash-limited clearing');
close(zeroPrice.speculation.history[1].cash, 0, 'Zero-price purchase budget');
const zeroAll = run(changed({ C: 0, D: 2, initialPrice: 100, cash: 0 }), 1);
close(zeroAll.speculation.history[1].price, 0, 'Zero price and zero cash');
const noOutput = run(changed({ C: 0, initialPrice: 0 }), 1);
close(noOutput.baseline.history[1].production, 0, 'Zero production allowed');
close(noOutput.speculation.history[1].price, 100, 'No speculative inventory to sell');
ok(noOutput.speculation.history[1].constraint.includes('Inventory'), 'Empty inventory explained');
const atEquilibrium = run(changed({ initialPrice: 50 }));
ok(atEquilibrium.baseline.status === 'horizon' && atEquilibrium.baseline.history.length === 41, 'Does not stop at equilibrium');
for (const row of atEquilibrium.speculation.history.slice(1)) close(row.trade, 0, 'Inside band holds inventory');
const atBuy = run(M.preset('diverge'), 2); close(atBuy.speculation.history[2].trade, 0, 'Exact buy threshold');
close(repeat.speculation.history[2].trade, 0, 'Exact sell threshold');
const saleP = changed({ C: 0, D: 2, initialPrice: 30 });
function sale(inventory) { const state = M.start(saleP); state.speculation.history[0].inventory = inventory; return M.next(saleP, state.speculation).history[1]; }
const partial = sale(50); close(partial.trade, -20, 'Partial inventory sale'); close(partial.price, 60, 'Sale supports sell threshold'); close(partial.inventory, 30, 'Unsold inventory'); close(partial.cash, 3200, 'Sale receipts');
const full = sale(5); close(full.trade, -5, 'Exhaust inventory'); close(full.price, 67.5, 'Inventory cap cannot reach threshold'); ok(full.constraint.includes('Inventory'), 'Sale cap explained');
const one = run(changed({ years: 1 })); ok(M.finished(one) && one.year === 1, 'Duration one'); ok(M.advance(one) === one, 'Finished is stable');
const early = run(changed({ C: 100, D: 8, initialPrice: 100 }));
ok(early.year === 1 && early.baseline.history.length === 1 && early.speculation.history.length === 1, 'Both stop before first production year');
ok(M.finished(early), 'Early terminal state');
ok(JSON.stringify(run(M.initial())) === JSON.stringify(run(M.initial())), 'Deterministic restart');
const before = M.start(M.initial()), snapshot = JSON.stringify(before); M.advance(before); ok(JSON.stringify(before) === snapshot, 'Advance preserves input');
ok(before.baseline.history[0].production === null, 'Year zero has no output');
const retained = M.preset('repeat', changed({ cash: 123.45, buy: 12.3, sell: 77.7, years: 12 }));
ok(retained.cash === 123.45 && retained.buy === 12.3 && retained.sell === 77.7 && retained.years === 12, 'Presets retain policy and horizon');
for (const key of Object.keys(M.LIMITS)) {
  const [min, max, step] = M.LIMITS[key];
  for (const value of ['', null, undefined, NaN, Infinity, true, min - step, max + step, min + step / 2]) ok(Boolean(M.validate(value, key)), 'Reject ' + key + ' ' + value);
  for (const value of [min, max, min + step]) ok(!M.validate(value, key), 'Accept parameter boundary ' + key);
}
ok(Boolean(M.validateParameters(changed({ C: 50, A: 50 })).C), 'C must be below A');
ok(Boolean(M.validateParameters(changed({ A: 50, B: 5 })).initialPrice), 'Initial price below choke');
ok(Boolean(M.validateParameters(changed({ buy: 60, sell: 60 })).sell), 'Strict threshold order');
ok(Boolean(M.validateParameters(changed({ buy: 100.1 })).buy), 'Threshold below choke');
ok(Object.keys(M.validateParameters(null)).length === 9, 'Missing state rejected');
for (const p of [changed({ A: 0 }), changed({ years: 0 }), changed({ buy: 70, sell: 60 })]) {
  let rejected = false; try { M.start(p); } catch (e) { rejected = e instanceof RangeError; } ok(rejected, 'Model guards invalid settings');
}
for (const id of Object.keys(M.PROMPTS)) {
  const p = M.scenario(id), state = run(p, M.PROMPTS[id].years);
  ok(!M.checkPrompt(id, M.start(p), M.PROMPTS[id].answer).done, 'Prompt needs observed years');
  ok(!M.checkPrompt(id, state, 'incorrect').done, 'Wrong explanation rejected');
  ok(M.checkPrompt(id, state, M.PROMPTS[id].answer).done, 'Correct prompt ' + id);
  const altered = Object.assign({}, state, { params: Object.assign({}, p, { cash: p.cash + 1 }) });
  ok(!M.checkPrompt(id, altered, M.PROMPTS[id].answer).done, 'Scenario alteration rejected');
}
let seed = 417;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
for (let trial = 0; trial < 2000; trial++) {
  const A = 50 + Math.floor(random() * 451), B = (5 + Math.floor(random() * 46)) / 10, chokeTenths = Math.floor(A / B * 10);
  const buyTenths = Math.floor(random() * chokeTenths), sellTenths = buyTenths + 1 + Math.floor(random() * (chokeTenths - buyTenths));
  const p = { A, B, C: Math.floor(random() * Math.min(A, 101)), D: (1 + Math.floor(random() * 80)) / 10,
    initialPrice: Math.floor(random() * (chokeTenths + 1)) / 10, buy: buyTenths / 10, sell: sellTenths / 10,
    cash: Math.floor(random() * 1000001) / 100, years: 1 + Math.floor(random() * 100) };
  ok(!Object.keys(M.validateParameters(p)).length, 'Random valid parameters');
  const state = run(p);
  for (const r of [state.baseline, state.speculation]) {
    for (let i = 1; i < r.history.length; i++) {
      const row = r.history[i], old = r.history[i - 1];
      close(row.production, p.C + p.D * old.price, 'Lag uses own resulting price');
      close(row.consumption, p.A - p.B * row.price, 'Independent consumer-demand clearing');
      close(row.consumption + row.trade, row.production, 'Goods conservation');
      close(row.cash, old.cash - row.trade * row.price, 'Cash conservation');
      close(row.inventory, old.inventory + row.trade, 'Inventory conservation');
      close(row.wealth, row.cash + row.inventory * row.price, 'Wealth valuation');
      ok([row.production, row.price, row.cash, row.inventory, row.consumption].every(n => Number.isFinite(n) && n >= 0), 'Feasible finite balances');
      if (row.trade > 0) ok(row.price <= p.buy + 1e-8 && row.cash <= old.cash, 'Buying within band and budget');
      if (row.trade < 0) ok(row.price >= p.sell - 1e-8 && row.inventory <= old.inventory, 'Selling within band and stock');
    }
    if (r.stop) ok(r.stop.preTradePrice < 0 && r.history[r.history.length - 1].year === r.stop.year - 1, 'Stops before invalid year');
  }
}
console.log(checks + ' model checks, 0 failures');
