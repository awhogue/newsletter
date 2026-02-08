import { NextRequest, NextResponse } from "next/server";
import { storeFeedback } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, articleId, title, sourceName, vote } = body;

    if (!date || !articleId || !vote || !["up", "down"].includes(vote)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await storeFeedback({
      date,
      articleId,
      title: title || "",
      sourceName: sourceName || "",
      vote,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Feedback error:", err);
    return NextResponse.json(
      { error: "Failed to record feedback" },
      { status: 500 }
    );
  }
}
