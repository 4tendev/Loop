import { randomUUID } from "node:crypto";
import { connect } from "node:tls";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  from?: string;
};

const gmailSmtpHost = "smtp.gmail.com";
const gmailSmtpPort = 465;

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function sanitizeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function formatAddress(address: string) {
  return `<${sanitizeHeader(address)}>`;
}

function escapeSmtpData(value: string) {
  return value.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function createEmailMessage(input: Required<SendEmailInput>) {
  const from = formatAddress(input.from);
  const to = formatAddress(input.to);
  const subject = sanitizeHeader(input.subject);
  const messageId = `${randomUUID()}@${input.from.split("@")[1] ?? "localhost"}`;

  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${messageId}>`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    escapeSmtpData(input.text),
  ].join("\r\n");
}

function parseSmtpCode(response: string) {
  return Number(response.slice(0, 3));
}

async function sendSmtpCommand(
  socket: ReturnType<typeof connect>,
  command: string,
  expectedCodes: number[],
) {
  await new Promise<void>((resolve, reject) => {
    let buffer = "";

    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onData = (chunk: Buffer | string) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const lastLine = lines.at(-1);

      if (!lastLine || !/^\d{3} /.test(lastLine)) {
        return;
      }

      const code = parseSmtpCode(lastLine);
      cleanup();

      if (expectedCodes.includes(code)) {
        resolve();
        return;
      }

      reject(new Error(`SMTP command failed with response: ${buffer.trim()}`));
    };

    socket.on("data", onData);
    socket.on("error", onError);

    if (command) {
      socket.write(`${command}\r\n`);
    }
  });
}

export async function sendEmail(input: SendEmailInput) {
  const user = getRequiredEnv("GMAIL_SMTP_USER");
  const password = getRequiredEnv("GMAIL_SMTP_APP_PASSWORD");
  const from = input.from ?? process.env.EMAIL_FROM ?? user;
  const message = createEmailMessage({ ...input, from });
  const socket = connect({
    host: gmailSmtpHost,
    port: gmailSmtpPort,
    servername: gmailSmtpHost,
  });

  try {
    await sendSmtpCommand(socket, "", [220]);
    await sendSmtpCommand(socket, "EHLO localhost", [250]);
    await sendSmtpCommand(socket, "AUTH LOGIN", [334]);
    await sendSmtpCommand(socket, Buffer.from(user).toString("base64"), [334]);
    await sendSmtpCommand(
      socket,
      Buffer.from(password).toString("base64"),
      [235],
    );
    await sendSmtpCommand(socket, `MAIL FROM:${formatAddress(from)}`, [250]);
    await sendSmtpCommand(socket, `RCPT TO:${formatAddress(input.to)}`, [250]);
    await sendSmtpCommand(socket, "DATA", [354]);
    await sendSmtpCommand(socket, `${message}\r\n.`, [250]);
    await sendSmtpCommand(socket, "QUIT", [221]);
  } finally {
    socket.end();
  }
}
