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
    resetPasswordTokenExpiresIn: 60 * 60, // 1 jam
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Reset Password Akun Cataract Detection",
        text: `Klik link berikut untuk mereset password Anda (berlaku 1 jam): ${url}, jika bukan anda yang meminta abaikan email ini.`,
      });
    },
  },
  plugins: [admin()],
});