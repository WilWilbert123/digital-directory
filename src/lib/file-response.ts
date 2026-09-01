import { NextResponse } from "next/server";

export function fileResponse(body: Buffer | Uint8Array, contentType: string, filename: string) {
  return new NextResponse(Buffer.from(body), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
