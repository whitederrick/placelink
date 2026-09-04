type SendEmailInput = {
  from: string;
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
};

type SendEmailResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; error: string };

export async function sendEmailWithResend(
  apiKey: string,
  input: SendEmailInput,
): Promise<SendEmailResult> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
        "User-Agent": "placelink-notification-worker/1.0",
      },
      body: JSON.stringify({
        from: input.from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
      }),
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        body && typeof body === "object" && "message" in body
          ? String(body.message)
          : `Resend request failed (${response.status})`;
      return { ok: false, error: message.slice(0, 1000) };
    }
    const id =
      body && typeof body === "object" && "id" in body ? String(body.id) : "";
    if (!id) return { ok: false, error: "Resend response did not include an id" };
    return { ok: true, providerMessageId: id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message.slice(0, 1000) : "Email request failed",
    };
  }
}
