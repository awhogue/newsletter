import { getDigest, getAdjacentDigestDates } from "@/lib/storage";
import Link from "next/link";
import { FeedbackButtons } from "./feedback-buttons";
import { SummarizedArticle } from "@/types";

function SourceName({ article }: { article: SummarizedArticle }) {
  const { sourceName, viaUrl } = article;
  if (!viaUrl) return <>{sourceName}</>;

  // Pattern: "domain.com (via Source Name)" — make "via Source Name" a link
  const viaMatch = sourceName.match(/^(.+?)\s*\(via (.+)\)$/);
  if (viaMatch) {
    return (
      <>
        {viaMatch[1]} (via{" "}
        <a
          href={viaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {viaMatch[2]}
        </a>
        )
      </>
    );
  }

  // No "via" pattern but has viaUrl — make the whole source name a link
  return (
    <a
      href={viaUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline"
    >
      {sourceName}
    </a>
  );
}

interface PageProps {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ article?: string; vote?: string }>;
}

export default async function DigestPage({ params, searchParams }: PageProps) {
  const { date } = await params;
  const { article: articleParam, vote: voteParam } = await searchParams;

  const [digest, adjacent] = await Promise.all([
    getDigest(date),
    getAdjacentDigestDates(date),
  ]);

  // Handle vote from email link
  const pendingVote =
    articleParam && (voteParam === "up" || voteParam === "down")
      ? { articleId: articleParam, vote: voteParam as "up" | "down" }
      : null;

  if (!digest) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <nav className="flex items-center justify-between mb-4 text-sm">
            {adjacent.prev ? (
              <Link
                href={`/digest/${adjacent.prev}`}
                className="text-blue-700 hover:text-blue-900 hover:underline"
              >
                &lt; prev
              </Link>
            ) : (
              <span className="text-gray-300">&lt; prev</span>
            )}
            {adjacent.next ? (
              <Link
                href={`/digest/${adjacent.next}`}
                className="text-blue-700 hover:text-blue-900 hover:underline"
              >
                next &gt;
              </Link>
            ) : (
              <span className="text-gray-300">next &gt;</span>
            )}
          </nav>
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              No digest for {date}
            </h1>
            <p className="text-gray-500">
              The digest may not have run yet for this date.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <nav className="flex items-center justify-between mb-4 text-sm">
          {adjacent.prev ? (
            <Link
              href={`/digest/${adjacent.prev}`}
              className="text-blue-700 hover:text-blue-900 hover:underline"
            >
              &lt; prev
            </Link>
          ) : (
            <span className="text-gray-300">&lt; prev</span>
          )}
          {adjacent.next ? (
            <Link
              href={`/digest/${adjacent.next}`}
              className="text-blue-700 hover:text-blue-900 hover:underline"
            >
              next &gt;
            </Link>
          ) : (
            <span className="text-gray-300">next &gt;</span>
          )}
        </nav>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Daily Digest</h1>
          <p className="text-gray-500 mt-1">
            {date} &middot;{" "}
            {digest.topStories.length + digest.alsoInteresting.length} articles
          </p>
        </header>

        {digest.topStories.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Top Stories
            </h2>
            <div className="space-y-6">
              {digest.topStories.map((article) => (
                <article
                  key={article.id}
                  className="bg-white rounded-lg p-5 shadow-sm border border-gray-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                    >
                      {article.title}
                    </a>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {article.score}/10
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    <SourceName article={article} />
                  </p>
                  <p className="text-gray-700 mt-2 text-sm leading-relaxed">
                    {article.summary}
                  </p>
                  {article.longWriteup && (
                    <p className="mt-2">
                      <Link
                        href={`/digest/${date}/article/${encodeURIComponent(article.id)}`}
                        className="text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                      >
                        Full writeup &rarr;
                      </Link>
                    </p>
                  )}
                  {article.relatedSources && article.relatedSources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Also covered by
                      </p>
                      <ul className="space-y-1.5">
                        {article.relatedSources.map((r) => (
                          <li key={r.url} className="text-sm leading-snug">
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-700 hover:text-blue-900 hover:underline"
                            >
                              {r.title}
                            </a>
                            <span className="text-xs text-gray-500 ml-2">
                              {r.sourceName}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {article.reason && (
                    <p className="text-xs text-gray-400 mt-1 italic">
                      {article.reason}
                    </p>
                  )}
                  <FeedbackButtons
                    date={date}
                    article={article}
                    pendingVote={
                      pendingVote?.articleId === article.id
                        ? pendingVote.vote
                        : undefined
                    }
                  />
                </article>
              ))}
            </div>
          </section>
        )}

        {digest.alsoInteresting.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Also Interesting
            </h2>
            <div className="space-y-3">
              {digest.alsoInteresting.map((article) => (
                <article
                  key={article.id}
                  className="bg-white rounded-lg p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
                    >
                      {article.title}
                    </a>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {article.score}/10
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    <SourceName article={article} />
                  </p>
                  {article.longWriteup && (
                    <p className="mt-1">
                      <Link
                        href={`/digest/${date}/article/${encodeURIComponent(article.id)}`}
                        className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                      >
                        Full writeup &rarr;
                      </Link>
                    </p>
                  )}
                  {article.relatedSources && article.relatedSources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Also covered by
                      </p>
                      <ul className="space-y-1">
                        {article.relatedSources.map((r) => (
                          <li key={r.url} className="text-xs leading-snug">
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-700 hover:text-blue-900 hover:underline"
                            >
                              {r.title}
                            </a>
                            <span className="text-[11px] text-gray-500 ml-2">
                              {r.sourceName}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {article.reason && (
                    <p className="text-xs text-gray-400 mt-1 italic">
                      {article.reason}
                    </p>
                  )}
                  <FeedbackButtons
                    date={date}
                    article={article}
                    pendingVote={
                      pendingVote?.articleId === article.id
                        ? pendingVote.vote
                        : undefined
                    }
                  />
                </article>
              ))}
            </div>
          </section>
        )}

        <footer className="text-center text-sm text-gray-400 py-4">
          {digest.metadata.totalFetched} articles fetched &middot;{" "}
          {digest.metadata.sourcesSucceeded.length} sources &middot;{" "}
          {(digest.metadata.durationMs / 1000).toFixed(1)}s
        </footer>
      </div>
    </div>
  );
}
