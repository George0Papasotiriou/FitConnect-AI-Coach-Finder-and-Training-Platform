import { jsPDF } from "jspdf";
import { domToPng } from "modern-screenshot";
import { createLogger } from "@/lib/logger";

const log = createLogger("pdf-export");

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/**
 * Convert an .editorial-root element into a multi-page A4 PDF.
 */
export async function generateEditorialPDF(
  documentEl: HTMLDivElement,
  filename: string,
): Promise<void> {
  const pages = documentEl.querySelectorAll<HTMLDivElement>(
    "[data-editorial-page]",
  );
  if (pages.length === 0) {
    throw new Error("No editorial pages found");
  }

  log.info("PDF generation starting", { pageCount: pages.length });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  for (let i = 0; i < pages.length; i++) {
    const pageEl = pages[i];
    if (!pageEl) continue;

    const background = pageEl.classList.contains("editorial-page--dark")
      ? "#0a0a0a"
      : "#fafaf7";

    const dataUrl = await domToPng(pageEl, {
      scale: 2,
      width: 794,
      height: 1123,
      backgroundColor: background,
      style: {
        zoom: "1",
        transform: "none",
        transformOrigin: "top left",
      },
    });

    if (i > 0) pdf.addPage();
    pdf.addImage(dataUrl, "PNG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);

    log.info("PDF page rendered", { pageIndex: i, total: pages.length });
  }

  pdf.save(filename);
  log.info("PDF generation complete", { filename, pageCount: pages.length });
}

/**
 * Generates a clean A4 PDF compiling all selected charts exactly as they are rendered on screen.
 * Returns the jsPDF instance so it can be either downloaded or exported as a Data URL for emailing.
 */
export async function generateSelectedChartsPDF(
  selectedCharts: { id: string; title: string }[],
  reportTitle: string = "AbiliFit AI Analytics Briefing"
): Promise<jsPDF> {
  log.info("Generating PDF for selected canvas charts", { count: selectedCharts.length, reportTitle });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const xMargin = 15;
  let yOffset = 42;

  // Render header banner
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(139, 92, 246); // Violet
  pdf.text(reportTitle, xMargin, 20);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(115, 115, 115);
  pdf.text(
    `Generated: ${new Date().toLocaleString()} • Prepared by AbiliFit AI Data Coach`,
    xMargin,
    27
  );

  pdf.setDrawColor(229, 231, 235);
  pdf.line(xMargin, 31, A4_WIDTH_MM - xMargin, 31);

  for (let i = 0; i < selectedCharts.length; i++) {
    const chart = selectedCharts[i];
    const element = document.querySelector(`[data-chart-id="${chart.id}"]`) as HTMLElement;

    if (element) {
      log.info("Rasterizing card element for PDF", { id: chart.id });
      try {
        const dataUrl = await domToPng(element, {
          scale: 2,
          backgroundColor: "#0d0d1e", // High-fidelity dark glass background matching design system
          style: {
            transform: "none",
            zoom: "1"
          }
        });

        const elWidth = element.offsetWidth;
        const elHeight = element.offsetHeight;
        const aspectRatio = elHeight / elWidth;
        const imgWidth = 180;
        const imgHeight = imgWidth * aspectRatio;

        // Check A4 vertical page overflow
        if (yOffset + imgHeight > A4_HEIGHT_MM - 15) {
          pdf.addPage();
          
          // Re-render subpage line header
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(156, 163, 175);
          pdf.text("AbiliFit AI Analytics Canvas", xMargin, 10);
          pdf.setDrawColor(243, 244, 246);
          pdf.line(xMargin, 12, A4_WIDTH_MM - xMargin, 12);
          
          yOffset = 18;
        }

        pdf.addImage(dataUrl, "PNG", xMargin, yOffset, imgWidth, imgHeight);
        yOffset += imgHeight + 10; // 10mm padding between charts

      } catch (err) {
        log.error("Failed to capture chart card", { id: chart.id, error: String(err) });
      }
    } else {
      log.warn("Chart card element not found in active DOM", { id: chart.id });
    }
  }

  return pdf;
}
