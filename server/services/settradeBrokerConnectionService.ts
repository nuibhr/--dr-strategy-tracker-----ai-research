import crypto from "crypto";

export type SettradeConnectionInput = {
  brokerId: string;
  appCode: string;
  appId: string;
  appSecret: string;
};

type StoredSettradeCredentials = Pick<SettradeConnectionInput, "appId" | "appSecret">;

type EncryptedValue = {
  iv: string;
  tag: string;
  ciphertext: string;
};

function getEncryptionKey(): Buffer {
  const configured = process.env.BROKER_CREDENTIALS_ENCRYPTION_KEY?.trim();
  if (!configured) {
    throw new Error("BROKER_CREDENTIALS_ENCRYPTION_KEY is not configured");
  }

  const key = /^[a-f0-9]{64}$/i.test(configured)
    ? Buffer.from(configured, "hex")
    : Buffer.from(configured, "base64");

  if (key.length !== 32) {
    throw new Error("BROKER_CREDENTIALS_ENCRYPTION_KEY must be a 32-byte base64 or 64-character hex key");
  }

  return key;
}

export function isBrokerCredentialEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

export function maskAppId(appId: string): string {
  const trimmed = appId.trim();
  if (trimmed.length <= 4) return "••••";
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-2)}`;
}

export function encryptAppSecret(appSecret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(appSecret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const value: EncryptedValue = {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
  return JSON.stringify(value);
}

export function decryptAppSecret(encryptedValue: string): string {
  const value = JSON.parse(encryptedValue) as EncryptedValue;
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(value.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function encryptSettradeCredentials(credentials: StoredSettradeCredentials): string {
  return encryptAppSecret(JSON.stringify(credentials));
}

export function decryptSettradeCredentials(encryptedValue: string): StoredSettradeCredentials {
  const value = JSON.parse(decryptAppSecret(encryptedValue)) as StoredSettradeCredentials;
  if (!value.appId || !value.appSecret) {
    throw new Error("Stored Settrade credentials are incomplete");
  }
  return value;
}

function rawPrivateKeyToPkcs8Der(rawKey: Buffer): Buffer {
  const header = Buffer.from(
    "304102010030130607" +
      "2a8648ce3d020106" +
      "082a8648ce3d030107" +
      "042730250201010420",
    "hex"
  );
  return Buffer.concat([header, rawKey]);
}

function createSettradeSignature(appSecret: string, content: string): string {
  let keyBytes = Buffer.from(appSecret, "base64");
  if (keyBytes.length === 33 && keyBytes[0] === 0x00) {
    keyBytes = keyBytes.subarray(1);
  }
  if (keyBytes.length !== 32) {
    throw new Error("The App Secret is not a valid Settrade P-256 private key");
  }

  const privateKey = crypto.createPrivateKey({
    key: rawPrivateKeyToPkcs8Der(keyBytes),
    format: "der",
    type: "pkcs8",
  });
  const sign = crypto.createSign("SHA256");
  sign.update(content);
  return sign.sign(privateKey).toString("hex");
}

/**
 * Tests only the broker application authentication endpoint. It never places
 * an order, reads a portfolio, or returns the access token to the caller.
 */
export async function validateSettradeConnection(input: SettradeConnectionInput): Promise<void> {
  const brokerId = input.brokerId.trim();
  const appCode = input.appCode.trim();
  const appId = input.appId.trim();
  const timestamp = Date.now().toString();
  const signature = createSettradeSignature(input.appSecret, `${appId}..${timestamp}`);
  const url = `https://open-api.settrade.com/api/oam/v1/${encodeURIComponent(brokerId)}/broker-apps/${encodeURIComponent(appCode)}/login`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: appId, params: "", signature, timestamp }),
  });

  if (!response.ok) {
    throw new Error(`Settrade rejected the connection (HTTP ${response.status})`);
  }

  const body = (await response.json()) as { access_token?: unknown };
  if (typeof body.access_token !== "string" || !body.access_token) {
    throw new Error("Settrade did not return an access token");
  }
}
