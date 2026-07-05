import "server-only";

export async function getTelegramBotInfo(botToken: string) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(data?.description ?? "فشل التحقق من رمز البوت");
  }

  return data.result as { id: number; username: string; first_name: string };
}
