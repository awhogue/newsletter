import { getDigest } from "@/lib/storage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackButtons } from "../../feedback-buttons";
import { SummarizedArticle } from "@/types";

interface PageProps {
  params: Promise<{ date: string; id: string }>;
}

function findArticle(
  digest: { topStories: SummarizedArticle[]; alsoInteresting: SummarizedArticle[] },
  id: string
): SummarizedArticle | null {
  return (
    digest.topStories.find((a) => a.id === id) ??
    digest.alsoInteresting.find((a) => a.id === id) ??
    null
  );
}

function renderWriteup(markdown: string) {
  const lines = markdown.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^##\s+/.test(line)) {
      blocks.push(
        <h2
          key={key++}
          className="text-base font-semibold text-gray-900 mt-6 mb-2 uppercase tracking-wide"
        >
          {line.replace(/^##\s+/, "")}
        </h2>
      );
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="list-disc pl-6 space-y-2 my-2 text-gray-700 leading-relaxed">
          {items.map((it, idx) => (
            <li key={idx}>{it}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^##\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="text-gray-700 leading-relaxed my-2">
        {paraLines.join(" ")}
      </p>
    );
  }

  return blocks;
}

export default async function ArticlePage({ params }: PageProps) {
  const { date, id } = await params;
  const digest = await getDigest(date);
  if (!digest) notFound();

  const article = findArticle(digest, id);
  if (!article) notFound();

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <nav className="mb-4 text-sm">
          <Link
            href={`/digest/${date}`}
            className="text-blue-700 hover:text-blue-900 hover:underline"
          >
            &lt; back to {date}
          </Link>
        </nav>

        <article className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-2xl font-bold text-blue-700 hover:text-blue-900 hover:underline block"
          >
            {article.title}
          </a>
          <p className="text-sm text-gray-500 mt-1">
            {article.sourceName} &middot; {article.score}/10
          </p>

          <p className="text-gray-700 mt-4 text-base leading-relaxed">
            {article.summary}
          </p>

          {article.longWriteup ? (
            <div className="mt-6 pt-6 border-t border-gray-100">
              {renderWriteup(article.longWriteup)}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic mt-6">
              No long writeup available for this article.
            </p>
          )}

          <div className="mt-6 pt-4 border-t border-gray-100">
            <FeedbackButtons date={date} article={article} />
          </div>
        </article>
      </div>
    </div>
  );
}
