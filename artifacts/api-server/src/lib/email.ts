import nodemailer from "nodemailer";

const isProduction = process.env.NODE_ENV === "production";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (isProduction && !value) {
    throw new Error(`${name} environment variable is required in production.`);
  }
  return value;
}

const appBaseUrl = requiredEnv("APP_BASE_URL") ?? "http://localhost:4173";
const smtpHost = requiredEnv("SMTP_HOST");
const smtpUser = requiredEnv("SMTP_USER");
const smtpPass = requiredEnv("SMTP_PASS");
const smtpFrom = requiredEnv("SMTP_FROM") ?? "Lume's Everywhere <no-reply@example.local>";
const smtpPort = Number(process.env.SMTP_PORT ?? 587);
const smtpSecure = process.env.SMTP_SECURE === "true";

const transporter =
  smtpHost && smtpUser && smtpPass
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })
    : null;

export function buildPasswordResetUrl(email: string, resetToken: string) {
  const url = new URL("/reset-password", appBaseUrl);
  url.searchParams.set("email", email);
  url.searchParams.set("token", resetToken);
  return url.toString();
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = buildPasswordResetUrl(email, resetToken);

  if (!transporter) {
    console.info(`Password reset URL for ${email}: ${resetUrl}`);
    return;
  }

  await transporter.sendMail({
    from: smtpFrom,
    to: email,
    subject: "Reset password Lume's Everywhere",
    text: [
      "Kami menerima permintaan reset password untuk akun Lume's Everywhere Anda.",
      "",
      `Buka link ini untuk membuat password baru: ${resetUrl}`,
      "",
      "Link ini berlaku selama 15 menit. Abaikan email ini jika Anda tidak meminta reset password.",
    ].join("\n"),
    html: `
      <p>Kami menerima permintaan reset password untuk akun Lume's Everywhere Anda.</p>
      <p><a href="${resetUrl}">Klik di sini untuk membuat password baru</a>.</p>
      <p>Link ini berlaku selama 15 menit. Abaikan email ini jika Anda tidak meminta reset password.</p>
    `,
  });
}
