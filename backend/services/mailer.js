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
              ${logoCid ? `<img src="cid:${logoCid}" alt="Tiro Federal Mendoza" style="width:140px;height:140px;display:block;margin:0 auto 16px;object-fit:contain;border-radius:50%;" />` : ''}
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

// Mail 3: Resumen de puntuación de etapa
const sendScoreMail = async ({ name, email, eventName, stageName, score }) => {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) return;
  try {
    const logoCid = 'logo-navbar';
    const { a, b, c, miss, noShoot, procedural, time, total, dq, warnings } = score;

    const body = `
      <h1 style="color:#2a7d4f;font-size:22px;margin:0 0 4px;">Resumen de etapa</h1>
      <p style="color:#666;font-size:14px;margin:0 0 20px;">
        Hola <strong>${name}</strong>, aqui esta el resumen de tu puntuacion en <strong>${eventName}</strong>.
      </p>

      ${dq ? `
      <div style="background:#7f1d1d;border:2px solid #ef4444;border-radius:8px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:1.5rem;">🟥</span>
        <div>
          <div style="font-weight:800;color:#fca5a5;font-size:0.95rem;">DESCALIFICADO</div>
          <div style="font-size:0.75rem;color:#fca5a5;opacity:0.8;margin-top:2px;">Esta etapa fue registrada como DQ</div>
        </div>
      </div>` : ''}

      <!-- Tabla de puntuacion -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;font-size:13px;">
        <thead>
          <tr style="background:#2a7d4f;">
            <th style="padding:10px 8px;color:#fff;font-weight:700;text-align:center;font-size:11px;letter-spacing:0.05em;">TIRADOR</th>
            <th style="padding:10px 8px;color:#fff;font-weight:700;text-align:center;font-size:11px;letter-spacing:0.05em;">ETAPA</th>
            <th style="padding:10px 8px;color:#fff;font-weight:700;text-align:center;font-size:11px;letter-spacing:0.05em;">TIEMPO</th>
            <th style="padding:10px 8px;color:#fff;font-weight:700;text-align:center;font-size:11px;letter-spacing:0.05em;">A</th>
            <th style="padding:10px 8px;color:#fff;font-weight:700;text-align:center;font-size:11px;letter-spacing:0.05em;">B</th>
            <th style="padding:10px 8px;color:#fff;font-weight:700;text-align:center;font-size:11px;letter-spacing:0.05em;">C</th>
            <th style="padding:10px 8px;color:#fff;font-weight:700;text-align:center;font-size:11px;letter-spacing:0.05em;">MISS</th>
            <th style="padding:10px 8px;color:#fff;font-weight:700;text-align:center;font-size:11px;letter-spacing:0.05em;">NO SHOOT</th>
            <th style="padding:10px 8px;color:#fff;font-weight:700;text-align:center;font-size:11px;letter-spacing:0.05em;">F. PROC.</th>
            <th style="padding:10px 8px;color:#fff;font-weight:700;text-align:center;font-size:11px;letter-spacing:0.05em;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background:#f9fafb;">
            <td style="padding:12px 8px;text-align:center;font-weight:700;color:#111827;border-bottom:1px solid #e5e7eb;">${name}</td>
            <td style="padding:12px 8px;text-align:center;color:#374151;border-bottom:1px solid #e5e7eb;">${stageName}</td>
            <td style="padding:12px 8px;text-align:center;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;">${dq ? '—' : parseFloat(time).toFixed(2) + 's'}</td>
            <td style="padding:12px 8px;text-align:center;color:#16a34a;font-weight:700;border-bottom:1px solid #e5e7eb;">${a}</td>
            <td style="padding:12px 8px;text-align:center;color:#ca8a04;font-weight:700;border-bottom:1px solid #e5e7eb;">${b}</td>
            <td style="padding:12px 8px;text-align:center;color:#d97706;font-weight:700;border-bottom:1px solid #e5e7eb;">${c}</td>
            <td style="padding:12px 8px;text-align:center;color:#ef4444;font-weight:700;border-bottom:1px solid #e5e7eb;">${miss}</td>
            <td style="padding:12px 8px;text-align:center;color:#ef4444;font-weight:700;border-bottom:1px solid #e5e7eb;">${noShoot}</td>
            <td style="padding:12px 8px;text-align:center;color:#eab308;font-weight:700;border-bottom:1px solid #e5e7eb;">${procedural}</td>
            <td style="padding:12px 8px;text-align:center;font-weight:800;font-size:15px;color:${dq ? '#ef4444' : '#2a7d4f'};border-bottom:1px solid #e5e7eb;">${dq ? 'DQ' : parseFloat(total).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      ${warnings > 0 ? `
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
        <span style="font-size:0.85rem;color:#92400e;font-weight:600;">⚠️ Advertencias recibidas en esta etapa: <strong>${warnings}</strong>${warnings >= 2 ? ' — Descalificado' : ''}</span>
      </div>` : ''}

      <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.6;">
        Este resumen fue generado automaticamente al guardar tu puntuacion.
      </p>`;

    await createTransport().sendMail({
      from: `"Tiro Federal Mendoza" <${process.env.MAIL_USER}>`,
      to: email,
      subject: `Puntuacion ${stageName} — ${eventName}`,
      html: baseTemplate({ preheader: `Tu puntuacion en ${stageName}: ${dq ? 'DQ' : parseFloat(total).toFixed(2)}`, body, logoCid }),
      attachments: [{
        filename: 'logo-navbar.png',
        path: require('path').join(__dirname, '..', 'assets', 'logo-navbar.png'),
        cid: 'logo-navbar'
      }]
    });
    console.log(`📧 Mail de puntuacion enviado a ${email}`);
  } catch (err) {
    console.error('❌ Error enviando mail de puntuacion:', err.message);
  }
};

module.exports = { sendWelcomeMail, sendEventRegistrationMail, sendScoreMail };
