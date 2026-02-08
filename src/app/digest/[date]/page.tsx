import { getDigest } from "@/lib/storage";
import { FeedbackButtons } from "./feedback-buttons";

interface PageProps {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ article?: string; vote?: string }>;
}

export default async function DigestPage({ params, searchParams }: PageProps) {
  const { date } = await params;
  const { article: articleParam, vote: voteParam } = await searchParams;

  const digest = await getDigest(date);

  // Handle vote from email link
  const pendingVote =
    articleParam && (voteParam === "up" || voteParam === "down")
      ? { articleId: articleParam, vote: voteParam as "up" | "down" }
      : null;

  if (!digest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            No digest for {date}
          </h1>
          <p className="text-gray-500">
            The digest may not have run yet for this date.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
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
                    {article.sourceName}
                  </p>
                  <p className="text-gray-700 mt-2 text-sm leading-relaxed">
                    {article.summary}
                  </p>
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
                    {article.sourceName}
                  </p>
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
