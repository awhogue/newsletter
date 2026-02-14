import { Digest, SummarizedArticle } from '../types';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function articleHtml(article: SummarizedArticle, appUrl: string, digestDate: string, full: boolean): string {
  const feedbackUrl = `${appUrl}/digest/${digestDate}`;
  const upUrl = `${feedbackUrl}?article=${article.id}&vote=up`;
  const downUrl = `${feedbackUrl}?article=${article.id}&vote=down`;

  const summaryBlock = full
    ? `<p style="margin:4px 0 8px 0;color:#374151;font-size:14px;line-height:1.5;">${escapeHtml(article.summary)}</p>`
    : '';

  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td>
              <a href="${escapeHtml(article.url)}" style="color:#1d4ed8;font-size:16px;font-weight:600;text-decoration:none;">${escapeHtml(article.title)}</a>
              <span style="color:#6b7280;font-size:12px;margin-left:8px;">${escapeHtml(article.sourceName)} · ${article.score}/10</span>
            </td>
          </tr>
          <tr>
            <td>
              ${summaryBlock}
              <span style="font-size:13px;">
                <a href="${upUrl}" style="color:#16a34a;text-decoration:none;margin-right:12px;">[+1]</a>
                <a href="${downUrl}" style="color:#dc2626;text-decoration:none;">[-1]</a>
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function buildDigestEmailHtml(digest: Digest, appUrl: string): string {
  const topStoriesHtml = digest.topStories
    .map((a) => articleHtml(a, appUrl, digest.date, true))
    .join('');

  const alsoInterestingHtml = digest.alsoInteresting
    .map((a) => articleHtml(a, appUrl, digest.date, false))
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:24px 24px 16px 24px;background-color:#1e293b;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Daily Digest</h1>
              <p style="margin:4px 0 0 0;color:#94a3b8;font-size:14px;">${digest.date} · ${digest.topStories.length + digest.alsoInteresting.length} articles</p>
              <p style="margin:8px 0 0 0;"><a href="${appUrl}/digest/${digest.date}" style="color:#60a5fa;font-size:13px;text-decoration:none;">View in browser &rarr;</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 8px 24px;">
              <h2 style="margin:0 0 4px 0;font-size:16px;color:#1e293b;text-transform:uppercase;letter-spacing:0.5px;">Top Stories</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${topStoriesHtml}
              </table>
            </td>
          </tr>
          ${
            alsoInterestingHtml
              ? `
          <tr>
            <td style="padding:16px 24px 8px 24px;">
              <h2 style="margin:0 0 4px 0;font-size:16px;color:#1e293b;text-transform:uppercase;letter-spacing:0.5px;">Also Interesting</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${alsoInterestingHtml}
              </table>
            </td>
          </tr>`
              : ''
          }
          <tr>
            <td style="padding:16px 24px 24px 24px;text-align:center;">
              <a href="${appUrl}/digest/${digest.date}" style="color:#6b7280;font-size:13px;">View in browser</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function buildDigestEmailText(digest: Digest, appUrl: string): string {
  const lines: string[] = [
    `DAILY DIGEST — ${digest.date}`,
    `${digest.topStories.length + digest.alsoInteresting.length} articles`,
    `View in browser: ${appUrl}/digest/${digest.date}`,
    '',
    '=== TOP STORIES ===',
    '',
  ];

  for (const a of digest.topStories) {
    lines.push(`[${a.score}/10] ${a.title} (${a.sourceName})`);
    lines.push(a.summary);
    lines.push(a.url);
    lines.push('');
  }

  if (digest.alsoInteresting.length > 0) {
    lines.push('=== ALSO INTERESTING ===', '');
    for (const a of digest.alsoInteresting) {
      lines.push(`[${a.score}/10] ${a.title} (${a.sourceName})`);
      lines.push(a.url);
      lines.push('');
    }
  }

  lines.push(`View in browser: ${appUrl}/digest/${digest.date}`);
  return lines.join('\n');
}
