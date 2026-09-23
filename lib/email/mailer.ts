import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST || "mail.xodo.ro";
const port = parseInt(process.env.SMTP_PORT || "465", 10);
const secure = process.env.SMTP_SECURE === "true" || port === 465;
const user = process.env.SMTP_USER || "noreply@daily81.com";
const pass = process.env.SMTP_PASS || "";
const from = process.env.SMTP_FROM || `daily81 <${user}>`;

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: {
    user,
    pass,
  },
});

export async function sendWelcomeEmail(to: string, displayName: string): Promise<boolean> {
  if (!pass) return false;

  try {
    await transporter.sendMail({
      from,
      to,
      subject: "welcome to daily81",
      text: `Hello ${displayName},\n\nWelcome to daily81 — your daily mathematical Sudoku notebook.\n\nStart your streak today at https://daily81.com\n\n— daily81`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background-color: #FDF9F3; color: #191919; border: 1.5px solid #191919; border-radius: 12px;">
          <h2 style="font-family: 'Short Stack', cursive, -apple-system, sans-serif; font-size: 22px; margin-top: 0;">welcome to daily81</h2>
          <p>hello ${displayName},</p>
          <p>your account has been created. your daily streaks, level progression, and puzzle statistics are now safely synced.</p>
          <div style="margin: 24px 0;">
            <a href="https://daily81.com" style="display: inline-block; background-color: #191919; color: #FDF9F3; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px;">play today's daily sudoku</a>
          </div>
          <p style="font-size: 12px; color: #66615B; border-top: 1px solid #D9D2C8; padding-top: 12px; margin-bottom: 0;">daily81.com • interactive math notebook</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("Failed to send welcome email:", err);
    return false;
  }
}
