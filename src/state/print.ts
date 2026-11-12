const PRINT_KEY = 'ptc.print';

let timer = 0;

function absoluteUrl(value: string): string {
  try {
    return new URL(value, window.location.href).href;
  } catch {
    return value;
  }
}

function collectStyles(): string {
  return [...document.querySelectorAll('link[rel="stylesheet"], style')]
    .map((node) => {
      if (node instanceof HTMLLinkElement) {
        const href = absoluteUrl(node.getAttribute('href') || node.href);
        return `<link rel="stylesheet" href="${href}">`;
      }
      return node.outerHTML;
    })
    .join('\n');
}

function preparePrintClone(sheet: Element): HTMLElement {
  const clone = sheet.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src');
    if (src) img.setAttribute('src', absoluteUrl(src));
  });
  clone.querySelectorAll('button[aria-label], .no-print').forEach((node) => node.remove());

  // Repeat page-1 header at the top of page 2 (chart page).
  const header = clone.querySelector('header');
  const chartPage = clone.querySelector('.report-chart-page');
  if (header && chartPage) {
    const pageHeader = header.cloneNode(true) as HTMLElement;
    pageHeader.classList.add('report-page-header');
    chartPage.insertBefore(pageHeader, chartPage.firstChild);
  }

  return clone;
}

/** Print only the report sheet from a blank frame — no app chrome, URL, or date header. */
export function printReportSheet(): void {
  const sheet = document.querySelector('.report-sheet');
  if (!sheet) return;

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('title', ' ');
  frame.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return;
  }

  doc.open();
  doc.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>&nbsp;</title>
${collectStyles()}
<style>
  /* Zero page margin hides browser date / title / URL headers & footers. */
  @page { size: A4 portrait; margin: 0; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    color: #1b2430;
    color-scheme: light;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .report-sheet {
    width: auto !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 12mm !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background: #ffffff !important;
  }
  .report-sheet .keep {
    border: 1px solid #d7d2c8 !important;
    background: #ffffff !important;
  }
  .report-sheet .report-chart-page {
    break-before: page;
    page-break-before: always;
    margin-top: 0 !important;
    padding-top: 8mm !important;
    border-top: 0 !important;
  }
  .report-sheet .report-page-header {
    margin-top: 4mm;
    margin-bottom: 16px;
  }
  .report-sheet .report-chart { width: 100%; min-height: 150mm; }
  .report-sheet button[aria-label] { display: none !important; }
  .no-print { display: none !important; }
</style>
</head>
<body></body>
</html>`);
  doc.close();
  doc.title = ' ';

  doc.body.appendChild(preparePrintClone(sheet));

  window.setTimeout(() => {
    win.focus();
    win.print();
    window.setTimeout(() => frame.remove(), 1200);
  }, 400);
}

export function schedulePrintFromStorage(): void {
  const shouldPrint = sessionStorage.getItem(PRINT_KEY) === '1';
  if (!shouldPrint) return;
  sessionStorage.removeItem(PRINT_KEY);
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    printReportSheet();
  }, 700);
}

export function requestPrint(): void {
  sessionStorage.setItem(PRINT_KEY, '1');
  if (window.location.hash === '#/report') {
    schedulePrintFromStorage();
    return;
  }
  window.location.hash = '#/report';
}

/** Download PDF uses the same print dialog — save as PDF from there. */
export function requestDownloadPdf(_fileStem?: string): void {
  requestPrint();
}
