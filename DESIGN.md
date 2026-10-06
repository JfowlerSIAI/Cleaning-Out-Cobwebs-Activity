# Cleaning Out Cobwebs — source-based design brief

Proposal 25. Source reviewed 2026-09-30: [Program Descriptions](http://daviddfriedman.com/Living_Paper/Program_Descriptions/program_descriptions.htm) and [Living Paper index](http://daviddfriedman.com/Living_Paper/living_paper.htm).

**This is the recorded source brief.** Eric selected a one-good browser adaptation on 2026-10-01; decisions and additions are in [SPECIFICATION.md](SPECIFICATION.md). Implemented v1 is frozen for David's review. The source questions below remain useful review prompts, rather than unresolved implementation choices.

## Learning objective

Explore delayed production responses and how speculation can change price and quantity cycles.

## Confirmed mechanics in the source

- The simpler version begins with straight-line supply and demand curves and a starting point. Alternate quantity-to-market-price and price-to-next-output adjustments trace a cobweb.
- A second view plots price and quantity against time; the source treats each step as one year.
- The baseline trajectory can converge to equilibrium or leave the plotting area, depending on the curves and initial conditions.
- A speculator starts with cash and buy/sell thresholds, purchasing goods to hold and later sell. The initial description assumes zero storage cost.
- Rerun from the starting conditions to compare outcomes with speculation; show speculator wealth as cash plus the current market value of inventory.
- A separate two-good version couples the corn demand curve and hog supply curve through the hog/corn cycle.

## Optional variants and adaptation notes

- Multiple speculators, altered starting wealth and thresholds, a profit-maximizing rational-expectations policy, and the coupled hog/corn version are extensions to select explicitly.

## Questions for David and the browser specification

1. Should the first release use the one-good cobweb or the coupled hog/corn model?
2. How should market clearing accommodate speculator purchases, inventory limits, and sales?
3. What stopping rule should explain divergence or infeasible prices and quantities?
4. Which examples should show stabilizing behavior, and which should illustrate its limits?

## Source and accessibility constraints

No dedicated Cobweb archive is linked on the Living Paper index.

Write fresh browser code by default; follow source-use notes (in the authoring collection) before any reuse. Keep keyboard and single-pointer alternatives for drawing/dragging, labeled numeric data and text/table equivalents for visual output, and verified focus/reflow behavior. These adaptation requirements do not imply that the original desktop UI meets current accessibility standards.

## Next task

Review the frozen v1 and SPECIFICATION.md with David in his chosen format; incorporate feedback before release audits.

SPECIFICATION.md resolves the v1 model, student actions, input limits, stopping rules, deterministic behavior, accessibility design, and acceptance scenarios. It distinguishes Eric's adaptation decisions from the source mechanics recorded here.
