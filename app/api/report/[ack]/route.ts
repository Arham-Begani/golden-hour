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

  /**
   * Seed the statement with whatever they typed on the confirm screen.
   *
   * Only when nothing has been saved against this acknowledgement yet — once
   * the person has edited the statement, that is the statement, and re-seeding
   * would overwrite their words with an older sentence of their own.
   */
  const stored = await getStatement(ack);

  return NextResponse.json({
    ok: true,
    packet,
    statement: stored ?? StatementSchema.parse({ statement: packet.description ?? "" }),
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
