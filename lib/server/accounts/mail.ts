import nodemailer from 'nodemailer';
import { z } from 'zod';
import { openSecret, sealSecret, type SealedSecret } from '@/lib/server/secret-box';
import { lookupAddresses } from '@/lib/server/dns-lookup';
import { assertSafeIp } from '@/lib/server/ssrf-guard';
import { accountDatabase, AccountError, normalizeEmail } from './database';

export const smtpSchema = z
  .object({
    host: z
      .string()
      .trim()
      .min(1)
      .max(253)
      .regex(/^[a-zA-Z0-9.-]+$/),
    port: z.union([z.literal(465), z.literal(587)]),
    username: z.string().trim().min(1).max(254),
    password: z.string().min(1).max(4096).optional(),
    from: z.string().trim().min(1).max(254),
  })
  .strict();
type SmtpSettings = Omit<z.infer<typeof smtpSchema>, 'password'> & { secret: SealedSecret };

async function storedSmtp(): Promise<SmtpSettings | null> {
  const result = await (
    await accountDatabase()
  ).query("SELECT data FROM teacherlab_site_settings WHERE key='smtp'");
  return result.rows[0]?.data ?? null;
}

export async function smtpView() {
  const value = await storedSmtp();
  return value
    ? {
        host: value.host,
        port: value.port,
        username: value.username,
        from: value.from,
        configured: true,
      }
    : { configured: false, host: 'smtp.qq.com', port: 465, username: '', from: '' };
}

export async function saveSmtp(value: z.infer<typeof smtpSchema>) {
  const input = smtpSchema.parse(value);
  normalizeEmail(input.from);
  const old = await storedSmtp();
  if (!input.password && (!old || old.host !== input.host || old.username !== input.username))
    throw new AccountError(400, 'SMTP_PASSWORD_REQUIRED');
  const { password, ...publicSettings } = input;
  const settings: SmtpSettings = {
    ...publicSettings,
    secret: password ? sealSecret(password, 'teacherlab:smtp') : old!.secret,
  };
  await (
    await accountDatabase()
  ).query(
    "INSERT INTO teacherlab_site_settings VALUES('smtp',$1) ON CONFLICT(key) DO UPDATE SET data=EXCLUDED.data",
    [settings],
  );
}

export async function sendVerificationEmail(email: string, code: string) {
  const settings = await storedSmtp();
  if (!settings) throw new AccountError(503, 'EMAIL_NOT_CONFIGURED');
  const addresses = await lookupAddresses(settings.host);
  if (!addresses.length) throw new AccountError(503, 'EMAIL_DELIVERY_FAILED');
  for (const address of addresses) assertSafeIp(address.address);
  const transport = nodemailer.createTransport({
    host: addresses[0].address,
    port: settings.port,
    secure: settings.port === 465,
    requireTLS: true,
    tls: { servername: settings.host, rejectUnauthorized: true },
    auth: { user: settings.username, pass: openSecret(settings.secret, 'teacherlab:smtp') },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 15000,
    logger: false,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  try {
    await transport.sendMail({
      from: { address: settings.from, name: 'TeacherScenarioLab' },
      to: { address: email, name: '' },
      subject: '教师情境实训实验室 · 邮箱验证码',
      text: `你的 TeacherScenarioLab 邮箱验证码是：${code}\n验证码10分钟内有效，请勿向他人透露。若非本人操作，请忽略本邮件。`,
    });
  } catch {
    throw new AccountError(503, 'EMAIL_DELIVERY_FAILED');
  } finally {
    transport.close();
  }
}
