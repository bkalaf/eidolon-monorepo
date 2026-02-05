const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = "no-reply@example.com";

if (!RESEND_API_KEY) {
  console.warn("RESEND_API_KEY is not set; email delivery will fail until it is configured.");
}

async function sendEmail({ to, subject, text, html }) {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is required to send emails");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Resend API error", { status: response.status, details: errorText });
    throw new Error("Unable to deliver email");
  }
}

export async function sendVerifyEmail(toEmail, verifyLink) {
  const subject = "Verify your example.com account";
  const text = `Hi,\n\nPlease confirm your email by visiting ${verifyLink}\n\nIf you did not request this, ignore this email.`;
  const html = `<p>Hi,</p><p>Please confirm your email by clicking <a href="${verifyLink}">this link</a>.</p><p>If you did not request this, you can ignore this email.</p>`;
  await sendEmail({ to: toEmail, subject, text, html });
}

export async function sendPasswordResetEmail(toEmail, resetLink) {
  const subject = "Reset your example.com password";
  const text = `Hi,\n\nReset your password by visiting ${resetLink}\n\nIf you did not request this, ignore this email.`;
  const html = `<p>Hi,</p><p>Reset your password by clicking <a href="${resetLink}">this link</a>.</p><p>If you did not request this, ignore this email.</p>`;
  await sendEmail({ to: toEmail, subject, text, html });
}
