# Decisions

Assumptions made while building, beyond the specification. Each line is the choice and why.

- The **Best net** badge appears only when two or more options have a net above zero. A tie keeps the first of those options. A single positive net is already obvious, so it is not badged.
- `calculatePlan` returns `null` when AGI is missing, zero, or not a finite number. The screen shows the empty state and does not divide by zero.
- Dollars on screen round half away from zero to the nearest dollar (`$207,510` for 207,510.25). Percents show two decimal places (`42.53%`, `-63.00%`). The engine does not round; tests compare to the cent.
- The charity warning uses the cap from Settings. At 30% the sentence is the one in the spec. The banner prefixes the option name so two warnings can be told apart. The note under the input is the sentence without that prefix.
- The Now column shows `n/a` for savings, cash out, net, and ROI. Gas & oil is subtracted in every column and, on an option, is included in cash out.
- Money fields accept only non-negative numbers. An empty field is stored as 0 and displayed blank. A negative amount loaded from a file is clamped to 0.
- A plan may have from zero to three options. **New plan** starts a blank draft. **Reset** clears the numbers and keeps the client name and date.
- The standard deduction in Settings applies to a new plan and to Reset. It does not overwrite a plan already on screen.
- **Load sample data** sets AGI 695,000, standard deduction 18,000, QBI 0, Option 1 at an LCD of 40,000, and Option 2 at an LCD of 35,000. It keeps the client name and date so the golden case is what you see with default settings.
- Opening a saved plan replaces the draft. The copy in Saved plans changes only when you press Save. The draft itself is written to localStorage on each edit.
- Import merges plans by id. The file may be a JSON array or `{ "plans": [ ... ] }`. Export writes `{ version, exportedAt, plans }`.
- A bracket table that fails validation stays on the Settings screen but is not used for tax. Calculations use the built-in 2025 table for that filing status until the edit is valid. Choosing a year and status that has no table yet creates one from those built-in brackets.
- **Download PDF** opens the report and the browser print dialog. Choose Save as PDF there, which keeps the page as vector text. `docs/sample-tax-plan.pdf` was printed by Playwright for review.
- Illinois tax is not in any total. `src/engine/state.ts` returns 0 and is not called by `calculatePlan`.
- Teal `#0F8B8D` on white is about 4.1:1, short of WCAG AA for small text. Body text, links, and the Best net badge use navy or ink. The badge background stays teal-50. The cash-out bars use the specified slate `#8A97A8` with a darker stroke so the edge clears 3:1.
- Chart bars do not animate. The first paint, print, and PDF show the final heights.
- Inter is self-hosted with `@fontsource/inter`, latin subset only.
- Navigation is hash routes. There is no account and no router library.
- A blank client name is shown as "Untitled client". Search matches that label and the typed name.
- The comparison row stays labelled "Max Deduction (30%)", as on the Excel sheet, even if the cap setting changes. The tooltip states the multiplier and the cap.
- The quarterly hint is hidden until AGI is greater than zero.
- Client names are limited to 120 characters and option names to 80, so the summary does not overflow the page.
- Print and Download PDF go to the report, then print. The report hides the app header. Printing from the Planner with the browser's own command prints that screen.
