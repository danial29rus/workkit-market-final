import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from .config import settings

log = logging.getLogger('workkit.mailer')


def send_mail(to: str, subject: str, text: str, html: str | None = None) -> None:
    """Send a message through the configured SMTP server. Meant to run as a background task."""
    if not settings.smtp_host:
        log.warning('SMTP is not configured; message to %s not sent: %s', to, subject)
        return
    sender = settings.smtp_from or settings.smtp_user
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = formataddr((settings.app_name.replace(' API', ''), sender)) if '<' not in sender else sender
    msg['To'] = to
    msg['Message-ID'] = make_msgid(domain=sender.split('@')[-1].strip('> '))
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype='html')
    context = ssl.create_default_context()
    # An explicit HELO name avoids a slow reverse-DNS lookup (socket.getfqdn) on every send.
    helo = sender.split('@')[-1].strip('> ') or 'localhost'
    try:
        if settings.smtp_security == 'ssl':
            server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, local_hostname=helo, context=context, timeout=20)
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, local_hostname=helo, timeout=20)
            if settings.smtp_security == 'starttls':
                server.starttls(context=context)
        with server:
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        log.info('Mail sent to %s: %s', to, subject)
    except Exception:
        log.exception('Failed to send mail to %s', to)


def verification_email(code: str, brand: str) -> tuple[str, str, str]:
    minutes = settings.email_code_minutes
    subject = f'{code} — код подтверждения {brand}'
    text = (
        f'Ваш код подтверждения: {code}\n\n'
        f'Введите его на сайте, чтобы завершить регистрацию. Код действует {minutes} минут.\n'
        'Если вы не регистрировались, просто проигнорируйте это письмо.'
    )
    html = f"""<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#101828">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;padding:36px 32px;border:1px solid #e5e8ef">
<tr><td style="font-size:20px;font-weight:800;color:#0b1020">{brand}</td></tr>
<tr><td style="padding-top:24px;font-size:16px;line-height:1.6;color:#5d6679">Ваш код для подтверждения e-mail:</td></tr>
<tr><td style="padding:16px 0 20px"><div style="display:inline-block;font-size:34px;letter-spacing:10px;font-weight:800;color:#6366f1;background:#eef0ff;border-radius:14px;padding:14px 22px">{code}</div></td></tr>
<tr><td style="font-size:14px;line-height:1.6;color:#5d6679">Код действует {minutes} минут. Если вы не регистрировались на сайте, просто проигнорируйте это письмо.</td></tr>
</table></td></tr></table></body></html>"""
    return subject, text, html
