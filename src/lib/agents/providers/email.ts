import { Resend } from 'resend';

const getResend = () => new Resend(process.env.RESEND_API_KEY ?? 'placeholder');
const FROM = () => process.env.RESEND_FROM_EMAIL ?? 'hola@kentodevlab.com';

export async function sendEmail(to: string, subject: string, html: string) {
  const { data, error } = await getResend().emails.send({
    from: FROM(),
    to,
    subject,
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
  return data;
}

export function buildAgentEmailHtml(body: string, leadName: string): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <p>Hola ${leadName},</p>
      <div style="white-space:pre-wrap">${body}</div>
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
      <p style="font-size:12px;color:#6b7280">KentoDevLab · Agente IA</p>
    </div>
  `;
}
