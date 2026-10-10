type EmailInput = {
  to: string;
  subject: string;
  text: string;
};

export async function sendEmail({ to, subject, text }: EmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM ?? "Cataract Detection <onboarding@resend.dev>";

  // Tanpa API key: mode pengembangan (email dicetak ke konsol)
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.error("RESEND_API_KEY belum diatur, email tidak dikirim.");
      return;
    }
    console.log("=== EMAIL (mode dev, tidak dikirim) ===");
    console.log(`Kepada : ${to}`);
    console.log(`Subjek : ${subject}`);
    console.log(text);
    console.log("=======================================");
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text }),
    });

    if (!response.ok) {
      console.error("Gagal kirim email:", response.status, await response.text());
    }
  } catch (error) {
    console.error("Gagal menghubungi layanan email:", error);
  }
}