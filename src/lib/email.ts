import { Resend } from 'resend';
import { Digest } from '../types';
import { buildDigestEmailHtml, buildDigestEmailText } from '../templates/digest-email';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendDigestEmail(digest: Digest): Promise<void> {
  const to = process.env.DIGEST_EMAIL_TO!;
  const from = process.env.DIGEST_EMAIL_FROM || 'Daily Digest <digest@resend.dev>';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const { error } = await getResend().emails.send({
    from,
    to,
    subject: `Daily Digest — ${digest.date}`,
    html: buildDigestEmailHtml(digest, appUrl),
    text: buildDigestEmailText(digest, appUrl),
  });

  if (error) throw new Error(`Failed to send email: ${error.message}`);
}
