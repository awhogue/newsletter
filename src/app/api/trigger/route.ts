import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.TRIGGER_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Trigger GitHub Actions workflow via API
  const githubToken = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // e.g. "owner/newsletter"

  if (!githubToken || !repo) {
    return NextResponse.json(
      { error: "GitHub config missing" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/daily-digest.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `GitHub API error: ${text}` },
        { status: res.status }
      );
    }

    return NextResponse.json({ ok: true, message: "Workflow triggered" });
  } catch (err) {
    console.error("Trigger error:", err);
    return NextResponse.json(
      { error: "Failed to trigger workflow" },
      { status: 500 }
    );
  }
}
