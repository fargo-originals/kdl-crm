import { Resend } from 'resend';
import type { NotificationPayload } from './index';

const getResend = () => new Resend(process.env.RESEND_API_KEY ?? 'placeholder');

export async function sendNotificationEmail(to: string, payload: NotificationPayload) {
  const { error } = await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'hola@kentodevlab.com',
    to,
    subject: payload.title,
    html: `<div style="font-family:sans-serif;padding:24px"><h2>${payload.title}</h2><p>${payload.body}</p></div>`,
  });
  if (error) console.error('Notification email error:', error);
}
