import "dotenv/config";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "./db/index.js";
import * as authSchema from "./db/auth-schema.js";
import { sendEmail } from "./email.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: 60 * 60, // token berlaku 1 jam (dalam detik)
    revokeSessionsOnPasswordReset: true, // cabut semua session lama setelah reset
    sendResetPassword: async ({ user, url }) => {
      // Sengaja TIDAK memakai await (lihat penjelasan di bawah)
      void sendEmail({
        to: user.email,
        subject: "Reset password akun Cataract Detection",
        text: `Klik tautan berikut untuk mengatur ulang password Anda (berlaku 1 jam):\n\n${url}\n\nJika bukan Anda yang meminta, abaikan email ini.`,
      });
    },
  },
  plugins: [admin()],
});