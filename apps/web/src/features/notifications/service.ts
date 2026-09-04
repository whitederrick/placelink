import { getDatabase } from "@placelink/database";
import { sendEmailWithResend } from "@/lib/adapters/email/resend";
import { webEnv } from "@/lib/env";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 25;

function retryAt(attemptCount: number) {
  const minutes = Math.min(60 * 24, 5 * 2 ** Math.max(0, attemptCount - 1));
  return new Date(Date.now() + minutes * 60_000);
}

function emailText(subject: string, body: string) {
  return [
    "안녕하세요. PlaceLink입니다.",
    "",
    `문의 “${subject}”에 답변이 등록되었습니다.`,
    "",
    body,
    "",
    "PlaceLink Studio",
  ].join("\n");
}

async function processNotificationDelivery(id: string) {
  const now = new Date();
  const claimed = await getDatabase().notificationDelivery.updateMany({
    where: {
      id,
      status: { in: ["PENDING", "FAILED"] },
      attemptCount: { lt: MAX_ATTEMPTS },
      nextAttemptAt: { lte: now },
    },
    data: { status: "SENDING", lockedAt: now },
  });
  if (!claimed.count) return "skipped" as const;

  const delivery = await getDatabase().notificationDelivery.findUnique({
    where: { id },
    select: {
      dedupeKey: true,
      attemptCount: true,
      recipient: { select: { email: true } },
      supportCaseEntry: {
        select: {
          body: true,
          supportCase: { select: { subject: true } },
        },
      },
    },
  });
  if (!delivery) return "skipped" as const;

  if (!webEnv.RESEND_API_KEY || !webEnv.EMAIL_FROM) {
    await getDatabase().notificationDelivery.update({
      where: { id },
      data: {
        status: "PENDING",
        lockedAt: null,
        nextAttemptAt: new Date(Date.now() + 15 * 60_000),
        lastError: "Email delivery is not configured",
      },
    });
    return "pending" as const;
  }
  if (!delivery.recipient.email) {
    await getDatabase().notificationDelivery.update({
      where: { id },
      data: {
        status: "SKIPPED",
        lockedAt: null,
        lastError: "Recipient does not have an email address",
      },
    });
    return "skipped" as const;
  }

  const result = await sendEmailWithResend(webEnv.RESEND_API_KEY, {
    from: webEnv.EMAIL_FROM,
    to: delivery.recipient.email,
    subject: `[PlaceLink] ${delivery.supportCaseEntry.supportCase.subject} 문의 답변`,
    text: emailText(
      delivery.supportCaseEntry.supportCase.subject,
      delivery.supportCaseEntry.body,
    ),
    idempotencyKey: delivery.dedupeKey,
  });
  if (result.ok) {
    await getDatabase().notificationDelivery.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        lockedAt: null,
        providerMessageId: result.providerMessageId,
        lastError: null,
      },
    });
    return "sent" as const;
  }

  const attemptCount = delivery.attemptCount + 1;
  await getDatabase().notificationDelivery.update({
    where: { id },
    data: {
      status: "FAILED",
      attemptCount,
      lockedAt: null,
      nextAttemptAt: retryAt(attemptCount),
      lastError: result.error,
    },
  });
  return "failed" as const;
}

export async function processPendingNotificationDeliveries() {
  const candidates = await getDatabase().notificationDelivery.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      attemptCount: { lt: MAX_ATTEMPTS },
      nextAttemptAt: { lte: new Date() },
    },
    orderBy: [{ nextAttemptAt: "asc" }, { id: "asc" }],
    take: BATCH_SIZE,
    select: { id: true },
  });
  const outcomes = await Promise.all(
    candidates.map((candidate) => processNotificationDelivery(candidate.id)),
  );
  return {
    processed: outcomes.length,
    sent: outcomes.filter((outcome) => outcome === "sent").length,
    failed: outcomes.filter((outcome) => outcome === "failed").length,
    pending: outcomes.filter((outcome) => outcome === "pending").length,
  };
}
