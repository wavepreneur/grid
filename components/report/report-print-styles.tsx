/**
 * A4 print. Page margin boxes carry the footer and page numbers
 * (Chromium; Safari prints without them). Bars are backgrounds, so colors must print exactly.
 */
export function ReportPrintStyles({ footer }: { footer: string }) {
  const css = `
@page {
  size: A4;
  margin: 16mm 14mm 18mm;
  @bottom-left { content: ${JSON.stringify(footer)}; font: 8pt system-ui, sans-serif; color: #56655E; }
  @bottom-right { content: counter(page) " / " counter(pages); font: 8pt system-ui, sans-serif; color: #56655E; }
}
@media print {
  html { font-size: 12px; }
  .tells-report { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}`;
  return <style>{css}</style>;
}
