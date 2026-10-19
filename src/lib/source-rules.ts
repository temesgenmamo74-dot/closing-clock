import { z } from "zod";

export const sourceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  url: z.string().trim().url().max(2000).refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/i.test(url.hostname) &&
      !/^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname) && url.hostname.includes(".");
  }, "ይፋዊ https የምንጭ አድራሻ ያስገቡ"),
  kind: z.enum(["web", "telegram"]),
});

export const sourceEditSchema = sourceSchema.extend({ id: z.string().uuid() });