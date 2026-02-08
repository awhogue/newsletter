"use client";

import { useState, useEffect } from "react";
import { SummarizedArticle } from "@/types";

interface FeedbackButtonsProps {
  date: string;
  article: SummarizedArticle;
  pendingVote?: "up" | "down";
}

export function FeedbackButtons({
  date,
  article,
  pendingVote,
}: FeedbackButtonsProps) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pendingVote && !vote) {
      submitVote(pendingVote);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingVote]);

  async function submitVote(v: "up" | "down") {
    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          articleId: article.id,
          title: article.title,
          sourceName: article.sourceName,
          vote: v,
        }),
      });
      if (res.ok) {
        setVote(v);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2 mt-3">
      <button
        onClick={() => submitVote("up")}
        disabled={loading || vote !== null}
        className={`text-sm px-2 py-1 rounded transition-colors ${
          vote === "up"
            ? "bg-green-100 text-green-700"
            : "text-gray-400 hover:text-green-600 hover:bg-green-50"
        } disabled:opacity-50`}
      >
        +1
      </button>
      <button
        onClick={() => submitVote("down")}
        disabled={loading || vote !== null}
        className={`text-sm px-2 py-1 rounded transition-colors ${
          vote === "down"
            ? "bg-red-100 text-red-700"
            : "text-gray-400 hover:text-red-600 hover:bg-red-50"
        } disabled:opacity-50`}
      >
        -1
      </button>
    </div>
  );
}
