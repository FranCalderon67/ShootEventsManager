const nodemailer = require('nodemailer');
const path = require('path');

const createTransport = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const baseTemplate = ({ preheader, body, logoCid }) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;color:#f4f1ec;">${preheader}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:#2a7d4f;border-radius:12px 12px 0 0;padding:32px;text-align:center;">
              ${logoCid ? `<img src="cid:${logoCid}" alt="Tiro Federal Mendoza" style="height:80px;width:auto;display:block;margin:0 auto 16px;" />` : ''}
              <div style="color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;">Tiro Federal Mendoza</div>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:36px 40px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="background:#1a1a1a;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
              <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0;line-height:1.6;">
                Correo automatico de <strong style="color:rgba(255,255,255,0.6);">Tiro Federal Mendoza</strong>.<br>
                Por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// Mail 1: Bienvenida al registrarse
const sendWelcomeMail = async ({ name, email }) => {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) return;
  try {
    const logoCid = 'logo-login';
    const body = `
      <h1 style="color:#2a7d4f;font-size:24px;margin:0 0 8px;">Bienvenido/a, ${name}!</h1>
      <p style="color:#666;font-size:14px;margin:0 0 24px;">Tu registro fue completado exitosamente.</p>
      <div style="background:#f8fdf9;border:1px solid #d1fae5;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;color:#374151;font-size:14px;font-weight:700;">Registracion realizada</p>
        <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
          Ya podes iniciar sesion y consultar los eventos disponibles para inscribirte.
        </p>
      </div>
      <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;border-top:1px solid #f3f4f6;padding-top:16px;">
        Si no creaste esta cuenta, ignora este mensaje.
      </p>`;

    await createTransport().sendMail({
      from: `"Tiro Federal Mendoza" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Registracion realizada — Tiro Federal Mendoza',
      html: baseTemplate({ preheader: `Hola ${name}, tu registro fue exitoso.`, body, logoCid }),
      attachments: [{
        filename: 'logo-login.png',
        path: path.join(__dirname, '..', 'assets', 'logo-login.png'),
        cid: logoCid
      }]
    });
    console.log(`📧 Mail de bienvenida enviado a ${email}`);
  } catch (err) {
    console.error('❌ Error enviando mail de bienvenida:', err.message);
  }
};

// Mail 2: Inscripcion a evento confirmada
const sendEventRegistrationMail = async ({ name, email, event, registration }) => {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) return;
  try {
    const logoCid = 'logo-navbar';
    const eventDate = new Date(event.date).toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const deadlineText = event.registrationDeadline
      ? new Date(event.registrationDeadline).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;

    const body = `
      <h1 style="color:#2a7d4f;font-size:24px;margin:0 0 8px;">Inscripcion confirmada</h1>
      <p style="color:#666;font-size:14px;margin:0 0 28px;">Hola <strong>${name}</strong>, tu inscripcion al siguiente evento fue registrada correctamente.</p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:20px;">
        <div style="background:#2a7d4f;padding:14px 20px;">
          <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Evento</p>
          <p style="margin:4px 0 0;color:#fff;font-size:18px;font-weight:700;">${event.name}</p>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:16px 20px;">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
              <span style="color:#6b7280;font-size:12px;">Fecha</span><br>
              <span style="color:#111827;font-size:14px;font-weight:600;text-transform:capitalize;">${eventDate}</span>
            </td>
          </tr>
          ${event.location ? `<tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
            <span style="color:#6b7280;font-size:12px;">Lugar</span><br>
            <span style="color:#111827;font-size:14px;font-weight:600;">${event.location}</span>
          </td></tr>` : ''}
          ${event.description ? `<tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
            <span style="color:#6b7280;font-size:12px;">Descripcion</span><br>
            <span style="color:#374151;font-size:13px;">${event.description}</span>
          </td></tr>` : ''}
          ${deadlineText ? `<tr><td style="padding:8px 0;">
            <span style="color:#6b7280;font-size:12px;">Cierre de inscripciones</span><br>
            <span style="color:#d97706;font-size:14px;font-weight:600;">${deadlineText}</span>
          </td></tr>` : ''}
        </table>
      </div>

      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0 0 12px;color:#92400e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Tu inscripcion</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%" style="padding:4px 0;">
              <span style="color:#6b7280;font-size:12px;">Categoria</span><br>
              <span style="color:#111827;font-size:15px;font-weight:700;">${registration.categoria}</span>
            </td>
            <td width="50%" style="padding:4px 0;">
              <span style="color:#6b7280;font-size:12px;">Division</span><br>
              <span style="color:#111827;font-size:15px;font-weight:700;">${registration.division}</span>
            </td>
          </tr>
          ${registration.isOC ? `<tr><td colspan="2" style="padding:12px 0 0;">
            <span style="background:#d97706;color:#fff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;">OC — Oficial de Campo</span>
          </td></tr>` : ''}
        </table>
      </div>

      <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.6;">
        Si tenes alguna consulta, contactate con la organizacion del evento.
      </p>`;

    await createTransport().sendMail({
      from: `"Tiro Federal Mendoza" <${process.env.MAIL_USER}>`,
      to: email,
      subject: `Inscripcion confirmada — ${event.name}`,
      html: baseTemplate({ preheader: `Tu inscripcion a ${event.name} fue confirmada.`, body, logoCid }),
      attachments: [{
        filename: 'logo-navbar.png',
        path: path.join(__dirname, '..', 'assets', 'logo-navbar.png'),
        cid: logoCid
      }]
    });
    console.log(`📧 Mail de inscripcion enviado a ${email}`);
  } catch (err) {
    console.error('❌ Error enviando mail de inscripcion:', err.message);
  }
};

module.exports = { sendWelcomeMail, sendEventRegistrationMail };
