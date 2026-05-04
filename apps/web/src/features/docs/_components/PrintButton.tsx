export function PrintButton() {
  return (
    <div className="print-hide mb-6 p-4 bg-base-200 rounded-lg border border-base-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-base-content mb-1">Download as PDF</h3>
          <p className="text-sm text-base-content/70">
            Click the button to open the print dialog, then choose &quot;Save as PDF&quot;. For a cleaner PDF with no
            date or URL, turn off &quot;Headers and footers&quot; in the print dialog.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="btn btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download PDF
        </button>
      </div>
    </div>
  );
}
