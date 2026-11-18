import { Resend } from 'resend';
import { Language } from '@/types';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith('re_placeholder') || apiKey.length < 10) {
    return null;
  }
  return new Resend(apiKey);
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.warn('[Resend] RESEND_API_KEY is not configured. Email reminder not dispatched.');
      return { 
        success: false, 
        error: 'RESEND_API_KEY is not configured. Please add your key in .env.local' 
      };
    }

    const fromAddress = process.env.RESEND_FROM_EMAIL || 'Tempo <onboarding@resend.dev>';

    const response = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
    });

    if (response.error) {
      console.error('[Resend Error]', response.error);
      return { success: false, error: response.error.message };
    }

    return { success: true, id: response.data?.id };
  } catch (error: any) {
    console.error('[Resend Exception]', error);
    return { success: false, error: error.message || 'Unknown error sending email' };
  }
}

// Bilingual Email Templates
export function getTaskReminderTemplate({
  taskTitle,
  dueDateFormatted,
  category,
  priority,
  lang = 'es',
}: {
  taskTitle: string;
  dueDateFormatted: string;
  category: string;
  priority: string;
  lang?: Language;
}) {
  const isEs = lang === 'es';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tempo.app';

  const subject = isEs 
    ? `Recordatorio de entrega: "${taskTitle}"` 
    : `Deadline Reminder: "${taskTitle}"`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f4; margin: 0; padding: 24px; color: #1a201c; }
        .container { max-width: 540px; margin: 0 auto; background: #FFFFFF; border: 1px solid #e3e8e3; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .logo { font-size: 20px; font-weight: 700; color: #2d5a43; letter-spacing: -0.5px; margin-bottom: 24px; }
        .badge { display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 600; border-radius: 9999px; background: #e1ece5; color: #2d5a43; text-transform: uppercase; margin-bottom: 16px; }
        h1 { font-size: 20px; font-weight: 600; margin: 0 0 16px; line-height: 1.3; }
        p { font-size: 14px; line-height: 1.6; color: #5f6961; margin: 0 0 16px; }
        .meta-box { background: #f4f6f4; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 14px; }
        .meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .meta-label { color: #5f6961; font-weight: 500; }
        .meta-value { color: #1a201c; font-weight: 600; }
        .btn { display: inline-block; background-color: #2d5a43; color: #FFFFFF !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 500; margin-top: 16px; }
        .footer { font-size: 12px; color: #8a968d; margin-top: 32px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">DAILY</div>
        <div class="badge">${isEs ? 'Recordatorio de Tarea' : 'Task Reminder'}</div>
        <h1>${taskTitle}</h1>
        <p>${isEs ? 'Tienes una tarea programada cuya fecha límite está próxima.' : 'You have an upcoming task deadline.'}</p>
        
        <div class="meta-box">
          <div class="meta-row">
            <span class="meta-label">${isEs ? 'Fecha de entrega:' : 'Due Date:'}</span>
            <span class="meta-value">${dueDateFormatted}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">${isEs ? 'Prioridad:' : 'Priority:'}</span>
            <span class="meta-value">${priority}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">${isEs ? 'Categoría:' : 'Category:'}</span>
            <span class="meta-value">${category}</span>
          </div>
        </div>

        <a href="${appUrl}/tasks" class="btn">${isEs ? 'Ver Tarea en DAILY' : 'View Task in DAILY'}</a>

        <div class="footer">
          ${isEs ? 'DAILY — Haz tiempo para lo que importa.' : 'DAILY — Make time for what matters.'}
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

export function getEventReminderTemplate({
  eventTitle,
  timeRangeFormatted,
  lang = 'es',
}: {
  eventTitle: string;
  timeRangeFormatted: string;
  lang?: Language;
}) {
  const isEs = lang === 'es';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tempo.app';

  const subject = isEs 
    ? `Próximo compromiso: "${eventTitle}"` 
    : `Upcoming Event: "${eventTitle}"`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f4; margin: 0; padding: 24px; color: #1a201c; }
        .container { max-width: 540px; margin: 0 auto; background: #FFFFFF; border: 1px solid #e3e8e3; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .logo { font-size: 20px; font-weight: 700; color: #2d5a43; letter-spacing: -0.5px; margin-bottom: 24px; }
        .badge { display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 600; border-radius: 9999px; background: #e1ece5; color: #2d5a43; text-transform: uppercase; margin-bottom: 16px; }
        h1 { font-size: 20px; font-weight: 600; margin: 0 0 16px; }
        p { font-size: 14px; line-height: 1.6; color: #5f6961; margin: 0 0 16px; }
        .meta-box { background: #f4f6f4; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 14px; }
        .btn { display: inline-block; background-color: #2d5a43; color: #FFFFFF !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 500; margin-top: 16px; }
        .footer { font-size: 12px; color: #8a968d; margin-top: 32px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">DAILY</div>
        <div class="badge">${isEs ? 'Evento en Calendario' : 'Calendar Event'}</div>
        <h1>${eventTitle}</h1>
        <p>${isEs ? 'Tu próximo compromiso está por comenzar:' : 'Your scheduled event is starting soon:'}</p>
        
        <div class="meta-box">
          <strong>${timeRangeFormatted}</strong>
        </div>

        <a href="${appUrl}/calendar" class="btn">${isEs ? 'Abrir Calendario' : 'Open Calendar'}</a>

        <div class="footer">
          ${isEs ? 'DAILY — Haz tiempo para lo que importa.' : 'DAILY — Make time for what matters.'}
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}
