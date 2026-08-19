import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  json,
  index,
} from "drizzle-orm/mysql-core";

// A batch of footage + instructions = one editing job for Kimi
export const jobs = mysqlTable("jobs", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  instructions: text("instructions"),
  status: varchar("status", { length: 32 }).notNull().default("new"), // new | downloading | editing | done | failed | cancelled
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const files = mysqlTable(
  "files",
  {
    id: serial("id").primaryKey(),
    jobId: bigint("job_id", { mode: "number", unsigned: true }),
    kind: varchar("kind", { length: 16 }).notNull().default("inbox"), // inbox | outbox | brand
    filename: varchar("filename", { length: 512 }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number", unsigned: true }).notNull(),
    mime: varchar("mime", { length: 255 }),
    storagePath: varchar("storage_path", { length: 1024 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    jobIdx: index("files_job_idx").on(t.jobId),
    kindIdx: index("files_kind_idx").on(t.kind),
  }),
);

// Per-job thread: Mo gives instructions, Kimi posts status updates
export const messages = mysqlTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    jobId: bigint("job_id", { mode: "number", unsigned: true }).notNull(),
    author: varchar("author", { length: 16 }).notNull(), // mo | kimi
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ jobIdx: index("messages_job_idx").on(t.jobId) }),
);

// API keys (MiniMax etc.). Full value is only ever returned to the agent token, never to the browser.
export const secrets = mysqlTable("secrets", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  value: text("value").notNull(),
  hint: varchar("hint", { length: 16 }).notNull(), // last 4 chars, for display
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// Single-row table: brand colors + style notes
export const brandSettings = mysqlTable("brand_settings", {
  id: serial("id").primaryKey(),
  data: json("data").notNull(), // { primary, background, text, notes }
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// In-flight chunked uploads (resume state)
export const uploads = mysqlTable("uploads", {
  id: varchar("id", { length: 36 }).primaryKey(), // uuid
  filename: varchar("filename", { length: 512 }).notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number", unsigned: true }).notNull(),
  receivedBytes: bigint("received_bytes", { mode: "number", unsigned: true })
    .notNull()
    .default(0),
  mime: varchar("mime", { length: 255 }),
  kind: varchar("kind", { length: 16 }).notNull().default("inbox"),
  jobId: bigint("job_id", { mode: "number", unsigned: true }),
  status: varchar("status", { length: 16 }).notNull().default("active"), // active | done
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Job = typeof jobs.$inferSelect;
export type StoredFile = typeof files.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Secret = typeof secrets.$inferSelect;
export type BrandSettings = typeof brandSettings.$inferSelect;
export type UploadSession = typeof uploads.$inferSelect;
