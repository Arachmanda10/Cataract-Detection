import { index, integer, jsonb, pgTable, real, text, timestamp, uuid} from "drizzle-orm/pg-core";
import { user } from "./auth-schema.js"

export const predictions = pgTable(
    "predictions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, {onDelete: "cascade"}), // user dihapus -> riwayatnya juga akan dihapus
        imageKey: text("image_key").notNull(), //key file backblaze
        label: text("label").notNull(), //cataract | normal
        confidence: real("confidence").notNull(),
        probabilities: jsonb("probabilities").$type<Record<string, number>>().notNull(),
        inferenceMs: real("inference_ms").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (t) => [index("prediction_user_created_idx").on(t.userId, t.createdAt)],
);