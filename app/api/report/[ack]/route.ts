import { NextResponse } from "next/server";
import { StatementSchema } from "@/lib/schema";
import { getFreezePacket, getStatement, saveStatement } from "@/lib/store";

export const runtime = "nodejs";

/**
 * The unhurried half.
 *
 * Everything here is optional and autosaved. No clock, no meter, no
 * validation gate — the emergency was handled the moment the acknowledgement
 * number was issued, and this is a person filling in a police statement, not
 * racing anything.
 */

type Params = { params: Promise<{ ack: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { ack } = await params;

  const packet = await getFreezePacket(ack);
  if (!packet) {
    return NextResponse.json({ ok: false, reason: "unknown_ack" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    packet,
    statement: (await getStatement(ack)) ?? StatementSchema.parse({}),
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { ack } = await params;

  const packet = await getFreezePacket(ack);
  if (!packet) {
    return NextResponse.json({ ok: false, reason: "unknown_ack" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const existing = (await getStatement(ack)) ?? StatementSchema.parse({});
  const merged = StatementSchema.safeParse({
    ...existing,
    ...(body as Record<string, unknown>),
    updated_at: new Date().toISOString(),
  });

  if (!merged.success) {
    return NextResponse.json(
      { ok: false, reason: "invalid_statement", detail: merged.error.issues },
      { status: 400 },
    );
  }

  await saveStatement(ack, merged.data);
  return NextResponse.json({ ok: true, statement: merged.data });
}
