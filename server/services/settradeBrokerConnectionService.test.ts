import { afterEach, describe, expect, it } from "vitest";
import {
  decryptSettradeCredentials,
  encryptSettradeCredentials,
  isBrokerCredentialEncryptionConfigured,
  maskAppId,
} from "./settradeBrokerConnectionService";

const originalKey = process.env.BROKER_CREDENTIALS_ENCRYPTION_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.BROKER_CREDENTIALS_ENCRYPTION_KEY;
  else process.env.BROKER_CREDENTIALS_ENCRYPTION_KEY = originalKey;
});

describe("broker credential encryption", () => {
  it("round-trips credentials without exposing the plaintext in ciphertext", () => {
    process.env.BROKER_CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    const credentials = { appId: "client-app-id", appSecret: "very-secret-private-key" };
    const encrypted = encryptSettradeCredentials(credentials);

    expect(encrypted).not.toContain(credentials.appId);
    expect(encrypted).not.toContain(credentials.appSecret);
    expect(decryptSettradeCredentials(encrypted)).toEqual(credentials);
  });

  it("fails closed when the encryption key is missing", () => {
    delete process.env.BROKER_CREDENTIALS_ENCRYPTION_KEY;
    expect(isBrokerCredentialEncryptionConfigured()).toBe(false);
  });

  it("only returns a masked App ID hint", () => {
    expect(maskAppId("app-123456")).toBe("app-••••56");
  });
});
