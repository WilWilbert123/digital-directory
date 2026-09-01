import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { ReportPayload } from "./types";

export async function generateWordBuffer(payload: ReportPayload) {
  const header = new TableRow({
    children: payload.columns.map(
      (c) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: c, bold: true })] })],
        }),
    ),
  });

  const body = payload.rows.map(
    (row) =>
      new TableRow({
        children: payload.columns.map(
          (c) =>
            new TableCell({
              children: [new Paragraph(String(row[c] ?? ""))],
            }),
        ),
      }),
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: `BISPOS Digital Directory — ${payload.title}`, bold: true, size: 32 })],
          }),
          new Paragraph(`Generated ${payload.generatedAt}`),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [header, ...body],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
