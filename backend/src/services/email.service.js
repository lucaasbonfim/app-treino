const nodemailer = require('nodemailer');

function parseFrom(value) {
    const match = String(value || '').match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
        return {
            name: match[1].replace(/^"|"$/g, '').trim(),
            email: match[2].trim(),
        };
    }

    return {
        name: 'KorVix Gym',
        email: value || 'no-reply@korvix-gym.local',
    };
}

async function sendViaBrevo({ to, subject, text, html }) {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) return null;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            sender: parseFrom(process.env.SMTP_FROM),
            to: [{ email: to }],
            subject,
            textContent: text,
            htmlContent: html,
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Brevo API ${response.status}: ${body}`);
    }

    const data = await response.json();
    console.log(`[email:brevo] E-mail enviado para ${to} (messageId: ${data.messageId})`);
    return { mode: 'brevo', messageId: data.messageId };
}

let cachedTransporter;

function createSmtpTransporter() {
    if (cachedTransporter) return cachedTransporter;

    if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
        cachedTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER
                ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' }
                : undefined,
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
        });
    } else {
        cachedTransporter = nodemailer.createTransport({
            streamTransport: true,
            newline: 'unix',
            buffer: true,
        });
    }

    return cachedTransporter;
}

async function sendViaSmtp({ to, subject, text, html }) {
    const info = await createSmtpTransporter().sendMail({
        from: process.env.SMTP_FROM || 'KorVix Gym <no-reply@korvix-gym.local>',
        to,
        subject,
        text,
        html,
    });

    if (!process.env.SMTP_HOST) {
        console.log(`[email:dev] E-mail local para ${to}`);
        if (info.message) console.log(String(info.message));
    }

    return { mode: 'smtp', messageId: info.messageId || null };
}

async function sendEmail(message) {
    try {
        const result = await sendViaBrevo(message);
        if (result) return result;
    } catch (error) {
        console.error('[email] Brevo API falhou:', error.message);
    }

    try {
        return await sendViaSmtp(message);
    } catch (error) {
        console.error('[email] SMTP falhou:', error.message);
        cachedTransporter = null;
        throw error;
    }
}

function escapeHtml(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function buildAppUrl(path) {
    const configured = process.env.APP_URL || 'http://localhost:5173';
    const baseUrl = configured.split('/#')[0].replace(/\/+$/, '');
    return `${baseUrl}/#${path}`;
}

function buildCodeEmailTemplate({
    name,
    code,
    expiresInMinutes,
    title = 'Confirme seu cadastro',
    description = 'Use o código abaixo para confirmar seu e-mail e criar sua conta.',
    warning = 'Se você não solicitou este cadastro, ignore este e-mail.',
    appPath = '/register',
}) {
    const appUrl = buildAppUrl(appPath);
    const safeName = escapeHtml(name);
    const safeCode = escapeHtml(code);
    const safeAppUrl = escapeHtml(appUrl);
    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safeWarning = escapeHtml(warning);

    return `
        <div style="margin:0;padding:0;background:#02060b;font-family:Arial,Helvetica,sans-serif">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;background:#02060b">
                <tr>
                    <td align="center">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;overflow:hidden;border:1px solid #17303b;border-radius:24px;background:#071018">
                            <tr>
                                <td style="padding:24px;background:linear-gradient(135deg,#071018,#0b2633)">
                                    <div style="color:#15e4ff;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase">KorVix Gym</div>
                                    <div style="padding-top:8px;color:#fff;font-size:22px;font-weight:800">${safeTitle}</div>
                                    <div style="padding-top:7px;color:#a8bac2;font-size:13px;line-height:1.6">Sua rotina de treinos organizada em um só lugar.</div>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:26px 24px">
                                    <p style="margin:0 0 12px;color:#fff;font-size:16px;font-weight:700">Olá, ${safeName}!</p>
                                    <p style="margin:0;color:#a8bac2;font-size:14px;line-height:1.7">${safeDescription}</p>
                                    <div style="margin:24px 0;padding:20px 14px;border:1px solid #16404f;border-radius:18px;background:#02060b;text-align:center">
                                        <div style="margin-bottom:9px;color:#7ca5b4;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Código de confirmação</div>
                                        <div style="color:#15e4ff;font-size:32px;font-weight:800;letter-spacing:7px">${safeCode}</div>
                                    </div>
                                    <p style="margin:0 0 22px;color:#8ea1aa;font-size:13px;line-height:1.7">Este código expira em <strong style="color:#fff">${expiresInMinutes} minutos</strong>.</p>
                                    <div style="text-align:center">
                                        <a href="${safeAppUrl}" style="display:inline-block;padding:14px 22px;border-radius:15px;background:linear-gradient(135deg,#007a9f,#00a6d5);color:#fff;font-size:14px;font-weight:800;text-decoration:none">Abrir KorVix Gym</a>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:18px 24px;border-top:1px solid #17303b;color:#71858e;font-size:11px;line-height:1.5;text-align:center">${safeWarning}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>
    `;
}

function sendVerificationCodeEmail({ to, name, code, expiresInMinutes = 15 }) {
    return sendEmail({
        to,
        subject: 'Confirme seu cadastro • KorVix Gym',
        text: [
            `Olá, ${name}!`,
            '',
            `Seu código de confirmação é: ${code}`,
            '',
            `Este código expira em ${expiresInMinutes} minutos.`,
            'Se você não solicitou este cadastro, ignore este e-mail.',
        ].join('\n'),
        html: buildCodeEmailTemplate({ name, code, expiresInMinutes }),
    });
}

function sendEmailChangeCode({ to, name, code, expiresInMinutes = 15 }) {
    return sendEmail({
        to,
        subject: 'Confirme seu novo e-mail • KorVix Gym',
        text: [
            `Olá, ${name}!`,
            '',
            `Seu código para confirmar o novo e-mail é: ${code}`,
            '',
            `Este código expira em ${expiresInMinutes} minutos.`,
            'Se você não solicitou esta alteração, ignore este e-mail.',
        ].join('\n'),
        html: buildCodeEmailTemplate({
            name,
            code,
            expiresInMinutes,
            title: 'Confirme seu novo e-mail',
            description: 'Use o código abaixo para concluir a alteração do endereço da sua conta.',
            warning: 'Se você não solicitou esta alteração, ignore este e-mail.',
            appPath: '/profile',
        }),
    });
}

module.exports = { sendVerificationCodeEmail, sendEmailChangeCode };
