import { NextResponse } from "next/server";
import { devPreviewEnabled } from "@/lib/dev/mock-client";
import { execute, type Query } from "@/lib/dev/store";

// DEV PREVIEW ONLY: lets browser-side code talk to the in-memory store. 404 unless the preview flag is on.
export async function POST(request: Request) {
  if (!devPreviewEnabled) return new NextResponse(null, { status: 404 });
  return NextResponse.json(execute((await request.json()) as Query));
}
