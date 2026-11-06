import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.storage
      .from("editor-exports")
      .list("", { limit: 1 });

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Supabase heartbeat failed:", error);
    return NextResponse.json({ ok: false, error: "Heartbeat failed" }, { status: 500 });
  }
}
