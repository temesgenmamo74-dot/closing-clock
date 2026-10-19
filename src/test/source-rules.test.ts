import { describe, expect, it } from "vitest";
import { sourceSchema } from "@/lib/source-rules";

describe("Direct publisher sources", () => {
  it("accepts a public government announcement page", () => {
    expect(sourceSchema.parse({ name: "Government", url: "https://www.example.gov.et/tenders", kind: "web" }).kind).toBe("web");
  });
  it("rejects private network sources", () => {
    for (const url of ["https://localhost/tenders", "https://127.0.0.1/", "https://192.168.1.1/", "https://172.16.0.1/"]) {
      expect(sourceSchema.safeParse({ name: "Private", url, kind: "web" }).success).toBe(false);
    }
  });
});