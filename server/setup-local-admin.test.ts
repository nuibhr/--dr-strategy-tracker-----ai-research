import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { parse } from "dotenv";
import { setupLocalAdmin } from "../scripts/setup-local-admin.mjs";

const fixtures: string[] = [];

async function fixture(content: string) {
  const root = await mkdtemp(path.join(tmpdir(), "dr-admin-setup-"));
  fixtures.push(root);
  await writeFile(path.join(root, ".env"), content);
  return root;
}

afterEach(async () => {
  for (const root of fixtures.splice(0)) {
    const resolved = path.resolve(root);
    if (path.dirname(resolved) !== path.resolve(tmpdir()) ||
      !path.basename(resolved).startsWith("dr-admin-setup-")) {
      throw new Error("Refusing to remove a path outside the temporary test fixtures");
    }
    await rm(resolved, { recursive: true, force: true });
  }
});

describe("local admin credential setup", () => {
  it("preserves exported, spaced, quoted credentials byte-for-byte across repeat setup", async () => {
    const content = [
      "# Existing configuration must remain intact",
      "export ADMIN_EMAIL = 'fixture@example.test'",
      String.raw`export ADMIN_PASSWORD = '  fixture\password # with spaces  '`,
      String.raw` JWT_SECRET = '  fixture\signing-key  '`,
      'ADMIN_NAME = "Fixture User"',
      "LOCAL_DEV_BYPASS_AUTH = false",
      "UNRELATED_SETTING = keep-this-value",
      "",
    ].join("\r\n");
    const root = await fixture(content);
    const result = await setupLocalAdmin(root);
    expect(await readFile(path.join(root, ".env"), "utf8")).toBe(content);
    expect(result.restartRequired).toBe(false);
    const credentials = await readFile(result.credentialsPath, "utf8");
    expect(credentials).toContain(`Password: ${parse(content).ADMIN_PASSWORD}\n`);
    expect(await setupLocalAdmin(root)).toEqual(result);
    expect(await readFile(path.join(root, ".env"), "utf8")).toBe(content);
  });

  it("adds only missing values and disables bypass without rewriting existing assignments", async () => {
    const content = [
      "export ADMIN_EMAIL = 'fixture@example.test'",
      String.raw` ADMIN_PASSWORD = '  fixture\password  '`,
      "export JWT_SECRET = ''",
      "LOCAL_DEV_BYPASS_AUTH = true",
      "# Keep this trailing comment",
    ].join("\n");
    const root = await fixture(content);
    await setupLocalAdmin(root);
    const first = await readFile(path.join(root, ".env"), "utf8");
    const configured = parse(first);
    expect(first.startsWith(content + "\n")).toBe(true);
    expect(configured.ADMIN_EMAIL).toBe(parse(content).ADMIN_EMAIL);
    expect(configured.ADMIN_PASSWORD).toBe(parse(content).ADMIN_PASSWORD);
    expect(configured.JWT_SECRET).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(configured.LOCAL_DEV_BYPASS_AUTH).toBe("false");
    await setupLocalAdmin(root);
    expect(await readFile(path.join(root, ".env"), "utf8")).toBe(first);
  });

  it("generates parser-safe credentials once for an empty fixture", async () => {
    const root = await fixture("");
    const firstResult = await setupLocalAdmin(root);
    const first = await readFile(path.join(root, ".env"), "utf8");
    const configured = parse(first);
    expect(firstResult.restartRequired).toBe(true);
    expect(configured.ADMIN_PASSWORD).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(configured.JWT_SECRET).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(configured.LOCAL_DEV_BYPASS_AUTH).toBe("false");
    const secondResult = await setupLocalAdmin(root);
    expect(secondResult.restartRequired).toBe(false);
    expect(await readFile(path.join(root, ".env"), "utf8")).toBe(first);
    expect(await readFile(secondResult.credentialsPath, "utf8"))
      .toContain(`Password: ${configured.ADMIN_PASSWORD}\n`);
  });
});
