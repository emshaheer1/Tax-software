# Tax Planning Calculator

A browser app for **Premium Tax Planners Inc.** A planner enters a client's numbers and up to three options. The app shows, next to the current situation, the federal tax saved, the cash that goes in, the net benefit, and the ROI.

There is no server. Plans stay in this browser.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://127.0.0.1:5173).

Other commands:

```bash
npm test          # unit tests
npm run build     # typecheck and production build
npm run e2e       # Playwright smoke test, screenshots, and the sample PDF
```

`npm run e2e` needs the Playwright browser once: `npx playwright install chromium`.

## What you do in the app

1. Enter the client name, the plan date, and AGI. Standard deduction starts at $18,000.
2. Add up to three options. Each option has an LCD contribution and an optional gas & oil amount.
3. Read the net, the comparison table, and the chart. **Best net** marks the strongest positive net when at least two options are ahead of zero.
4. **Save plan** keeps it under Saved plans. **Download PDF** and **Print** open the one-page summary and the browser print dialog. Choose **Save as PDF** there.

**Load sample data** fills the Single 2025 example: AGI $695,000, a $40,000 LCD, and a $35,000 LCD.

## Change the tax brackets

Open **Settings → Tax brackets**. Pick the year and filing status, edit the limits and rates, or add a set for another year. Limits must ascend and rates must be from 0 to 100. A valid change is used on the Planner immediately.

**Reset to defaults** restores the seeded 2025 Single and Married filing jointly tables, the LCD multiplier of 4, the 30% charity cap, and the $18,000 standard deduction.

The seeded brackets are planning defaults. Verify them against the IRS tables before you use them with a client. The app shows that note on Settings and on the printed summary.

## Replace the logo

The mark is `public/pta-logo.png`. The header, the printed summary, and the browser tab all load that file. Replace the file and keep the same name.

## Folder structure

```
tax-planner/
  src/engine/        tax maths only: brackets, progressive tax, plan, formatters
  src/state/         settings, saved plans, localStorage
  src/components/    buttons, inputs, table, chart, dialogs
  src/pages/         Planner, Saved plans, Settings, Report
  public/            pta-logo.png
  e2e/               Playwright smoke test and screenshots
  docs/screenshots/  laptop (1440) and tablet (820) captures
  docs/sample-tax-plan.pdf
```

Storage keys: `ptc.settings.v1`, `ptc.plans.v1`, `ptc.currentPlan.v1`. A corrupt value falls back to defaults instead of breaking the page.

Illinois state tax is not calculated. `src/engine/state.ts` is a stub for a later module.

Estimates for planning purposes only. Not tax, legal or investment advice.
