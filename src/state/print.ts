const PRINT_KEY = 'ptc.print';

let timer = 0;

export function schedulePrintFromStorage(): void {
  if (sessionStorage.getItem(PRINT_KEY) !== '1') return;
  sessionStorage.removeItem(PRINT_KEY);
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    window.print();
  }, 450);
}

export function requestPrint(): void {
  sessionStorage.setItem(PRINT_KEY, '1');
  if (window.location.hash === '#/report') {
    schedulePrintFromStorage();
    return;
  }
  window.location.hash = '#/report';
}
