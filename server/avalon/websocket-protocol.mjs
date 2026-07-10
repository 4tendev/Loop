import { createHash } from "node:crypto";

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

export function writeHandshake(request, socket) {
  const key = request.headers["sec-websocket-key"];

  if (!key) {
    socket.destroy();
    return false;
  }

  const acceptKey = createHash("sha1")
    .update(`${key}${WS_GUID}`)
    .digest("base64");

  socket.write(
    [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${acceptKey}`,
      "",
      "",
    ].join("\r\n"),
  );

  return true;
}

export function createMessage(type, data) {
  return JSON.stringify({
    type,
    data,
    sentAt: new Date().toISOString(),
  });
}

function encodeFrame(text) {
  const payload = Buffer.from(text);
  const payloadLength = payload.length;

  if (payloadLength < 126) {
    return Buffer.concat([Buffer.from([0x81, payloadLength]), payload]);
  }

  if (payloadLength < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payloadLength, 2);

    return Buffer.concat([header, payload]);
  }

  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(payloadLength), 2);

  return Buffer.concat([header, payload]);
}

export function send(socket, text) {
  if (!socket.destroyed && socket.writable) {
    socket.write(encodeFrame(text));
  }
}

export function closeSocket(socket, code = 1000, reason = "Closing") {
  if (socket.destroyed) {
    return;
  }

  const reasonBuffer = Buffer.from(reason);
  const payload = Buffer.alloc(2 + reasonBuffer.length);
  payload.writeUInt16BE(code, 0);
  reasonBuffer.copy(payload, 2);
  socket.write(Buffer.concat([Buffer.from([0x88, payload.length]), payload]));
  socket.end();
}

export function parseFrame(buffer) {
  if (buffer.length < 2) {
    return null;
  }

  const firstByte = buffer[0];
  const secondByte = buffer[1];
  const opcode = firstByte & 0x0f;
  const masked = (secondByte & 0x80) === 0x80;
  let payloadLength = secondByte & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    if (buffer.length < offset + 2) {
      return null;
    }

    payloadLength = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (payloadLength === 127) {
    if (buffer.length < offset + 8) {
      return null;
    }

    payloadLength = Number(buffer.readBigUInt64BE(offset));
    offset += 8;
  }

  if (!masked || buffer.length < offset + 4 + payloadLength) {
    return null;
  }

  const maskingKey = buffer.subarray(offset, offset + 4);
  offset += 4;

  const payload = Buffer.alloc(payloadLength);
  for (let index = 0; index < payloadLength; index += 1) {
    payload[index] = buffer[offset + index] ^ maskingKey[index % 4];
  }

  return {
    opcode,
    text: payload.toString("utf8"),
  };
}
