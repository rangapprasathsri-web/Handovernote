import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import { HandoverNote, HandoverSectionTitle, HANDOVER_SECTIONS_ORDER } from '../models/handover.js';

export interface PdfGenerationOptions {
  includeDiagnostics?: boolean;
}

/**
 * Generates a clean, deterministic filename for the handover PDF:
 * Format: shift-handover-YYYY-MM-DD-HHmm-to-HHmm-TZ.pdf
 */
export function generateHandoverFilename(note: {
  shift_start: string;
  shift_end: string;
  timezone: string;
}): string {
  // Extract date and time parts
  // e.g. "2026-09-03T17:00:00+05:30"
  try {
    const startDate = note.shift_start.split('T')[0] || 'unknown-date';
    const startTimeMatch = note.shift_start.match(/T(\d{2}):(\d{2})/);
    const endTimeMatch = note.shift_end.match(/T(\d{2}):(\d{2})/);

    const startHHmm = startTimeMatch ? `${startTimeMatch[1]}${startTimeMatch[2]}` : 'start';
    const endHHmm = endTimeMatch ? `${endTimeMatch[1]}${endTimeMatch[2]}` : 'end';

    // Sanitize timezone: replace '/' and '_' with '-'
    const tzClean = (note.timezone || 'UTC').replace(/[\/_]/g, '-').replace(/[^a-zA-Z0-9-]/g, '');

    return `shift-handover-${startDate}-${startHHmm}-to-${endHHmm}-${tzClean}.pdf`;
  } catch {
    return 'shift-handover-document.pdf';
  }
}

/**
 * Converts Unicode text to WinAnsi-safe ASCII for StandardFonts (Helvetica).
 */
export function toWinAnsiCompatible(str: string): string {
  if (!str) return '';
  return str
    .replace(/[—–]/g, '-')
    .replace(/[→]/g, '->')
    .replace(/[←]/g, '<-')
    .replace(/[·]/g, '|')
    .replace(/[•]/g, '*')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[≤]/g, '<=')
    .replace(/[≥]/g, '>=')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Word wraps text to fit within a given maxWidth for a specific font and size.
 */
export function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  if (!text) return [];

  const safeParagraphs = text.split('\n').map((p) => toWinAnsiCompatible(p));
  const lines: string[] = [];

  for (const paragraph of safeParagraphs) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }

    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (textWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Single word exceeds line width, break characters
          let partial = '';
          for (const char of word) {
            if (font.widthOfTextAtSize(partial + char, fontSize) <= maxWidth) {
              partial += char;
            } else {
              lines.push(partial);
              partial = char;
            }
          }
          currentLine = partial;
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

/**
 * Renders the structured handover note into a single, professional PDF document.
 */
export async function generateHandoverPdf(
  note: HandoverNote,
  options: PdfGenerationOptions = {}
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  // Standard fonts
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Palette (accessible, professional slate/navy)
  const colorPrimary = rgb(0.08, 0.18, 0.36); // Deep slate navy
  const colorHeading = rgb(0.12, 0.16, 0.22); // Charcoal
  const colorBody = rgb(0.2, 0.23, 0.28); // Slate 800
  const colorMuted = rgb(0.45, 0.49, 0.55); // Slate 500
  const colorBorder = rgb(0.85, 0.88, 0.92); // Slate 200
  const colorAlert = rgb(0.8, 0.15, 0.15); // Blocker red
  const colorSuccess = rgb(0.1, 0.55, 0.3); // Completed green
  const colorProgress = rgb(0.12, 0.45, 0.75); // In progress blue

  // Page dimensions (Letter: 612 x 792)
  const pageWidth = 612;
  const pageHeight = 792;
  const marginX = 50;
  const marginTop = 50;
  const marginBottom = 50;
  const contentWidth = pageWidth - marginX * 2;

  let currentPage = doc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - marginTop;

  function addNewPage(): PDFPage {
    currentPage = doc.addPage([pageWidth, pageHeight]);
    currentY = pageHeight - marginTop;
    return currentPage;
  }

  function ensureSpace(requiredHeight: number) {
    if (currentY - requiredHeight < marginBottom) {
      addNewPage();
    }
  }

  // Draw Document Header
  currentPage.drawText('SHIFT HANDOVER NOTE', {
    x: marginX,
    y: currentY,
    size: 20,
    font: helveticaBold,
    color: colorPrimary,
  });
  currentY -= 28;

  // Metadata block (Shift range, Timezone, Source systems)
  const metadataLines = [
    `Shift: ${note.shift_start} to ${note.shift_end}`,
    `Timezone: ${note.timezone}`,
    `Source systems: ${note.source_display_names.join(', ') || note.sources.join(', ')}`,
  ];

  for (const line of metadataLines) {
    currentPage.drawText(line, {
      x: marginX,
      y: currentY,
      size: 9.5,
      font: helvetica,
      color: colorBody,
    });
    currentY -= 15;
  }

  currentY -= 6;
  currentPage.drawLine({
    start: { x: marginX, y: currentY },
    end: { x: marginX + contentWidth, y: currentY },
    thickness: 1,
    color: colorBorder,
  });
  currentY -= 16;

  // Activity Overview
  ensureSpace(40);
  currentPage.drawText('Activity overview', {
    x: marginX,
    y: currentY,
    size: 11,
    font: helveticaBold,
    color: colorHeading,
  });
  currentY -= 16;

  const overviewLines = wrapText(note.overview, helvetica, 9.5, contentWidth);
  for (const line of overviewLines) {
    ensureSpace(14);
    currentPage.drawText(line, {
      x: marginX,
      y: currentY,
      size: 9.5,
      font: helvetica,
      color: colorBody,
    });
    currentY -= 14;
  }
  currentY -= 12;

  // 4 Sections in fixed order
  const sectionNumbering: Record<HandoverSectionTitle, string> = {
    'Completed': '1. COMPLETED',
    'In Progress': '2. IN PROGRESS',
    'Blockers / Escalations': '3. BLOCKERS / ESCALATIONS',
    'Watch-list': '4. WATCH-LIST',
  };

  const sectionColorMap: Record<HandoverSectionTitle, typeof colorHeading> = {
    'Completed': colorSuccess,
    'In Progress': colorProgress,
    'Blockers / Escalations': colorAlert,
    'Watch-list': colorHeading,
  };

  for (const sectionTitle of HANDOVER_SECTIONS_ORDER) {
    const items = note.sections[sectionTitle] || [];
    const numberedHeading = sectionNumbering[sectionTitle];
    const headingColor = sectionColorMap[sectionTitle];

    // Keep heading with next item (at least 45pt space needed)
    ensureSpace(45);

    currentPage.drawText(numberedHeading, {
      x: marginX,
      y: currentY,
      size: 11,
      font: helveticaBold,
      color: headingColor,
    });
    currentY -= 16;

    if (items.length === 0) {
      ensureSpace(18);
      currentPage.drawText('Nothing to report.', {
        x: marginX + 12,
        y: currentY,
        size: 9.5,
        font: helveticaOblique,
        color: colorMuted,
      });
      currentY -= 20;
    } else {
      for (const item of items) {
        // Wrap item description
        const itemLines = wrapText(item.item, helvetica, 9.5, contentWidth - 16);
        const attribution = `Source: ${item.source_system.toUpperCase()} · ${item.record_id} · ${item.timestamp} · Status: ${item.status}${item.owner ? ` · Owner: ${item.owner}` : ''}${item.evidence_event_count > 1 ? ` · ${item.evidence_event_count} updates consolidated` : ''}`;
        const attributionLines = wrapText(attribution, helveticaOblique, 8, contentWidth - 16);

        const itemHeight = itemLines.length * 13 + attributionLines.length * 11 + 10;
        ensureSpace(itemHeight);

        // Bullet point (drawn as clean vector circle)
        currentPage.drawCircle({
          x: marginX + 5,
          y: currentY + 3,
          size: 2,
          color: colorPrimary,
        });

        // Item text lines
        for (const line of itemLines) {
          currentPage.drawText(toWinAnsiCompatible(line), {
            x: marginX + 14,
            y: currentY,
            size: 9.5,
            font: helvetica,
            color: colorBody,
          });
          currentY -= 13;
        }

        // Attribution lines
        for (const attrLine of attributionLines) {
          currentPage.drawText(toWinAnsiCompatible(attrLine), {
            x: marginX + 14,
            y: currentY,
            size: 8,
            font: helveticaOblique,
            color: colorMuted,
          });
          currentY -= 11;
        }

        currentY -= 6;
      }
      currentY -= 6;
    }
  }

  // Compact Generation Details (Diagnostics)
  if (options.includeDiagnostics !== false) {
    ensureSpace(70);

    currentY -= 6;
    currentPage.drawLine({
      start: { x: marginX, y: currentY },
      end: { x: marginX + contentWidth, y: currentY },
      thickness: 0.5,
      color: colorBorder,
    });
    currentY -= 14;

    currentPage.drawText('Generation details', {
      x: marginX,
      y: currentY,
      size: 9.5,
      font: helveticaBold,
      color: colorHeading,
    });
    currentY -= 13;

    const diagDetails = [
      `Activity counts: Records reviewed: ${note.metrics.records_reviewed} | Events in shift: ${note.metrics.events_in_shift} | Records represented: ${note.metrics.records_represented} | Updates consolidated: ${note.metrics.updates_consolidated}`,
      `Sources with warnings: ${note.metrics.sources_with_warnings} | Content fingerprint: ${note.fingerprint} | Generation timestamp: ${note.generated_at}`,
    ];

    for (const d of diagDetails) {
      const dLines = wrapText(d, helvetica, 8, contentWidth);
      for (const dl of dLines) {
        ensureSpace(11);
        currentPage.drawText(toWinAnsiCompatible(dl), {
          x: marginX,
          y: currentY,
          size: 8,
          font: helvetica,
          color: colorMuted,
        });
        currentY -= 11;
      }
    }
  }

  // Add Footers ("Shift Handover Note - Page X of Y")
  const pages = doc.getPages();
  const totalPages = pages.length;

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const footerText = `Shift Handover Note - Page ${i + 1} of ${totalPages}`;
    const textWidth = helvetica.widthOfTextAtSize(footerText, 8);

    page.drawText(footerText, {
      x: (pageWidth - textWidth) / 2,
      y: 25,
      size: 8,
      font: helvetica,
      color: colorMuted,
    });
  }

  return await doc.save();
}
