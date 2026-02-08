import { Resend } from 'resend';
import { Digest } from '../types';
import { buildDigestEmailHtml, buildDigestEmailText } from '../templates/digest-email';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendDigestEmail(digest: Digest): Promise<void> {
  const to = process.env.DIGEST_EMAIL_TO!;
  const from = process.env.DIGEST_EMAIL_FROM || 'Daily Digest <digest@resend.dev>';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Daily Digest — ${digest.date}`,
    html: buildDigestEmailHtml(digest, appUrl),
    text: buildDigestEmailText(digest, appUrl),
  });

  if (error) throw new Error(`Failed to send email: ${error.message}`);
}
