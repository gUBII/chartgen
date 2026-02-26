import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

type ChartType = "MEAL" | "MAR";

type ExportPdfRequestBody = {
  batchId?: string;
  chartType?: ChartType;
  timezone?: string;
};

type ApiErrorShape = {
  code: string;
  message: string;
  details?: unknown;
};

type TableColumn<T> = {
  header: string;
  width: number;
  value: (row: T) => string;
};

class ExportPdfError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const DEFAULT_TIMEZONE = "Australia/Sydney";

const PAGE = {
  width: 842,
  height: 595,
  margin: 24,
  titleSize: 15,
  metaSize: 9,
  tableHeaderSize: 8,
  bodySize: 8,
  rowHeight: 16,
};

const formatDateTime = (value: Date, timezone: string): string => {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
};

const parseTimezone = (value: string | undefined): string => {
  if (!value || !value.trim()) {
    return DEFAULT_TIMEZONE;
  }
  const trimmed = value.trim();
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed }).format(new Date());
    return trimmed;
  } catch {
    throw new ExportPdfError(400, "INVALID_TIMEZONE", "timezone is invalid.");
  }
};

const toApiError = (error: unknown): ApiErrorShape => {
  if (error instanceof ExportPdfError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }
  return {
    code: "INTERNAL_ERROR",
    message: "Unexpected error while generating PDF export.",
  };
};

const truncateToWidth = (input: string, font: PDFFont, size: number, width: number): string => {
  if (font.widthOfTextAtSize(input, size) <= width) {
    return input;
  }

  const ellipsis = "...";
  let text = input;
  while (text.length > 0 && font.widthOfTextAtSize(`${text}${ellipsis}`, size) > width) {
    text = text.slice(0, -1);
  }
  return text.length === 0 ? ellipsis : `${text}${ellipsis}`;
};

const drawTablePdf = async <T>(params: {
  title: string;
  subtitle: string;
  timezone: string;
  exportedAt: Date;
  columns: TableColumn<T>[];
  rows: T[];
}): Promise<Uint8Array> => {
  const { title, subtitle, timezone, exportedAt, columns, rows } = params;
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const availableWidth = PAGE.width - PAGE.margin * 2;

  if (tableWidth > availableWidth) {
    throw new ExportPdfError(500, "TABLE_LAYOUT_ERROR", "Export table exceeds page width.");
  }

  const pdf = await PDFDocument.create();
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage;
  let y = 0;
  let rowIndex = 0;

  const drawHeader = () => {
    page = pdf.addPage([PAGE.width, PAGE.height]);
    const titleY = PAGE.height - PAGE.margin - PAGE.titleSize;
    page.drawText(title, {
      x: PAGE.margin,
      y: titleY,
      size: PAGE.titleSize,
      font: boldFont,
      color: rgb(0.1, 0.12, 0.18),
    });
    page.drawText(subtitle, {
      x: PAGE.margin,
      y: titleY - 16,
      size: PAGE.metaSize,
      font: bodyFont,
      color: rgb(0.25, 0.28, 0.35),
    });
    page.drawText(`Timezone: ${timezone} | Exported: ${formatDateTime(exportedAt, timezone)}`, {
      x: PAGE.margin,
      y: titleY - 30,
      size: PAGE.metaSize,
      font: bodyFont,
      color: rgb(0.25, 0.28, 0.35),
    });

    const headerTop = titleY - 44;
    page.drawRectangle({
      x: PAGE.margin,
      y: headerTop - PAGE.rowHeight,
      width: tableWidth,
      height: PAGE.rowHeight,
      color: rgb(0.92, 0.94, 0.97),
    });

    let x = PAGE.margin + 3;
    for (const column of columns) {
      const text = truncateToWidth(column.header, boldFont, PAGE.tableHeaderSize, column.width - 6);
      page.drawText(text, {
        x,
        y: headerTop - 11,
        size: PAGE.tableHeaderSize,
        font: boldFont,
        color: rgb(0.12, 0.14, 0.19),
      });
      x += column.width;
    }

    y = headerTop - PAGE.rowHeight;
  };

  drawHeader();

  for (const row of rows) {
    if (y - PAGE.rowHeight < PAGE.margin + 10) {
      drawHeader();
    }

    if (rowIndex % 2 === 1) {
      page.drawRectangle({
        x: PAGE.margin,
        y: y - PAGE.rowHeight,
        width: tableWidth,
        height: PAGE.rowHeight,
        color: rgb(0.97, 0.98, 1),
      });
    }

    let x = PAGE.margin + 3;
    for (const column of columns) {
      const value = truncateToWidth(column.value(row), bodyFont, PAGE.bodySize, column.width - 6);
      page.drawText(value, {
        x,
        y: y - 11,
        size: PAGE.bodySize,
        font: bodyFont,
        color: rgb(0.12, 0.14, 0.19),
      });
      x += column.width;
    }

    page.drawLine({
      start: { x: PAGE.margin, y: y - PAGE.rowHeight },
      end: { x: PAGE.margin + tableWidth, y: y - PAGE.rowHeight },
      color: rgb(0.86, 0.88, 0.92),
      thickness: 0.5,
    });

    y -= PAGE.rowHeight;
    rowIndex += 1;
  }

  const pages = pdf.getPages();
  for (let index = 0; index < pages.length; index += 1) {
    const pageRef = pages[index]!;
    const label = `Page ${index + 1}/${pages.length}`;
    const width = bodyFont.widthOfTextAtSize(label, 8);
    pageRef.drawText(label, {
      x: PAGE.width - PAGE.margin - width,
      y: 12,
      size: 8,
      font: bodyFont,
      color: rgb(0.35, 0.37, 0.43),
    });
  }

  return pdf.save();
};

export async function POST(request: NextRequest) {
  try {
    let body: ExportPdfRequestBody;
    try {
      body = (await request.json()) as ExportPdfRequestBody;
    } catch {
      throw new ExportPdfError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const batchId = body.batchId?.trim();
    if (!batchId) {
      throw new ExportPdfError(400, "MISSING_FIELD", "batchId is required.");
    }

    const chartType = body.chartType;
    if (chartType !== "MEAL" && chartType !== "MAR") {
      throw new ExportPdfError(400, "INVALID_FIELD", "chartType must be either MEAL or MAR.");
    }

    const timezone = parseTimezone(body.timezone);

    const batch = await prisma.restorationBatch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        recoveryStart: true,
        recoveryEnd: true,
        participant: {
          select: {
            id: true,
            fullName: true,
          },
        },
        mealCandidates: {
          orderBy: [{ timestamp: "asc" }, { id: "asc" }],
          select: {
            timestamp: true,
            mealType: true,
            foodTexture: true,
            fluidThickness: true,
            volumeMl: true,
            amountEaten: true,
            status: true,
            deviationReason: true,
          },
        },
        marCandidates: {
          orderBy: [{ scheduledAdminTime: "asc" }, { id: "asc" }],
          select: {
            scheduledAdminTime: true,
            actualAdminTime: true,
            medicationName: true,
            dosage: true,
            route: true,
            status: true,
            statusReview: true,
            omissionReason: true,
          },
        },
      },
    });

    if (!batch) {
      throw new ExportPdfError(404, "BATCH_NOT_FOUND", "Restoration batch not found.");
    }

    const dateWindow = `${formatDateTime(batch.recoveryStart, timezone)} to ${formatDateTime(batch.recoveryEnd, timezone)}`;
    const subtitle = `Batch: ${batch.id} | Participant: ${batch.participant.fullName} (${batch.participant.id}) | Window: ${dateWindow}`;
    const exportedAt = new Date();

    let pdfBytes: Uint8Array;
    let filename: string;

    if (chartType === "MEAL") {
      if (batch.mealCandidates.length === 0) {
        throw new ExportPdfError(409, "NO_DATA", "This batch has no meal preview rows to export.");
      }

      const rows = batch.mealCandidates.map((row) => ({
        dateTime: formatDateTime(row.timestamp, timezone),
        mealType: row.mealType,
        texture: String(row.foodTexture),
        thickness: String(row.fluidThickness),
        volume: `${row.volumeMl} ml`,
        amount: row.amountEaten,
        reviewStatus: row.status,
        deviation: row.deviationReason ?? "-",
      }));

      const columns: TableColumn<(typeof rows)[number]>[] = [
        { header: "Date/Time", width: 122, value: (row) => row.dateTime },
        { header: "Meal", width: 64, value: (row) => row.mealType },
        { header: "Texture", width: 55, value: (row) => row.texture },
        { header: "Thickness", width: 62, value: (row) => row.thickness },
        { header: "Volume", width: 62, value: (row) => row.volume },
        { header: "Amount", width: 94, value: (row) => row.amount },
        { header: "Review", width: 78, value: (row) => row.reviewStatus },
        { header: "Deviation", width: 249, value: (row) => row.deviation },
      ];

      pdfBytes = await drawTablePdf({
        title: "Mealtime Preview Chart",
        subtitle,
        timezone,
        exportedAt,
        columns,
        rows,
      });
      filename = `meal-batch-${batch.id}.pdf`;
    } else {
      if (batch.marCandidates.length === 0) {
        throw new ExportPdfError(409, "NO_DATA", "This batch has no MAR preview rows to export.");
      }

      const rows = batch.marCandidates.map((row) => ({
        scheduled: formatDateTime(row.scheduledAdminTime, timezone),
        medication: row.medicationName,
        dosage: row.dosage || "-",
        route: row.route || "-",
        actual: formatDateTime(row.actualAdminTime, timezone),
        status: row.status,
        reviewStatus: row.statusReview,
        omissionReason: row.omissionReason ?? "-",
      }));

      const columns: TableColumn<(typeof rows)[number]>[] = [
        { header: "Scheduled", width: 116, value: (row) => row.scheduled },
        { header: "Medication", width: 170, value: (row) => row.medication },
        { header: "Dosage", width: 72, value: (row) => row.dosage },
        { header: "Route", width: 68, value: (row) => row.route },
        { header: "Actual", width: 116, value: (row) => row.actual },
        { header: "Status", width: 90, value: (row) => row.status },
        { header: "Review", width: 72, value: (row) => row.reviewStatus },
        { header: "Omission", width: 82, value: (row) => row.omissionReason },
      ];

      pdfBytes = await drawTablePdf({
        title: "MAR Preview Chart",
        subtitle,
        timezone,
        exportedAt,
        columns,
        rows,
      });
      filename = `mar-batch-${batch.id}.pdf`;
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const apiError = toApiError(error);
    const status = error instanceof ExportPdfError ? error.status : 500;

    if (!(error instanceof ExportPdfError)) {
      console.error(error);
    }

    return NextResponse.json(
      {
        ok: false,
        error: apiError,
      },
      { status }
    );
  }
}
