import { prisma } from "@repo/database";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

export const app = new Hono();

if (process.env.NODE_ENV !== "test") {
  app.use("*", logger());
}
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: (process.env.CORS_ORIGIN ?? "http://localhost:3000")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  }),
);
app.use("*", bodyLimit({ maxSize: 1024 * 1024 }));

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/users", async (c) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, createdAt: true },
    take: 50,
    orderBy: { createdAt: "desc" },
  });
  return c.json(users);
});

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
});
