import {integer, pgTable, text, timestamp} from "drizzle-orm/pg-core";

export const practiceNotes = pgTable("practice_notes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});