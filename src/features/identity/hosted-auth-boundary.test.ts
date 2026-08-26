import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

function collectScreenSource(directory: string): string {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return collectScreenSource(path);
      return entry.name.endsWith(".tsx") ? readFileSync(path, "utf8") : [];
    })
    .join("\n");
}

describe("hosted authentication boundary", () => {
  const root = process.cwd();
  const appSource = collectScreenSource(resolve(root, "src/app"));
  const featureSource = collectScreenSource(resolve(root, "src/features"));
  const surfaceSource = `${appSource}\n${featureSource}`;

  it("keeps credential and recovery factors out of Dino screens", () => {
    expect(surfaceSource).not.toContain("useSignIn");
    expect(surfaceSource).not.toContain("secureTextEntry");
    expect(surfaceSource).not.toContain("resetPasswordEmailCode");
    expect(surfaceSource).not.toContain('textContentType="password"');
    expect(surfaceSource).not.toContain('textContentType="newPassword"');
    expect(surfaceSource).not.toContain('textContentType="oneTimeCode"');
    expect(existsSync(resolve(root, "src/app/recovery.tsx"))).toBe(false);
  });

  it("keeps native and web entry points on hosted Clerk authentication", () => {
    expect(surfaceSource).toContain("useHostedAuth");
    expect(surfaceSource).toContain("SignInButton");
  });
});
