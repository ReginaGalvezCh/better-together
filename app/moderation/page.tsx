import { getChatGPTUser, chatGPTSignInPath } from "@/app/chatgpt-auth";
import { moderatorIds } from "./access";
import { authorizeModerator } from "@/lib/moderation";
import { RequestValidationError } from "@/lib/community-requests";
import { ModerationPanel } from "@/components/moderation-panel";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moderación · Better Together", robots: { index: false, follow: false } };

export default async function ModerationPage() {
  const user = await getChatGPTUser();
  let denied: string | null = null;
  try { authorizeModerator(user, moderatorIds()); }
  catch (error) { denied = error instanceof RequestValidationError ? error.message : "Moderación no disponible."; }
  return <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
    <Link href="/" className="font-semibold underline">Volver a Better Together</Link>
    <header className="my-7"><p className="eyebrow">ARMY se cuida · Área privada</p><h1 className="mt-2 text-3xl font-bold">Revisión de solicitudes</h1></header>
    {denied ? <section className="content-card"><h2 className="text-xl font-bold">Acceso protegido</h2><p className="my-4" role="status">{denied}</p>{!user && <a href={chatGPTSignInPath("/moderation")} target="_top" className="inline-flex min-h-11 items-center font-bold underline">Iniciar sesión con ChatGPT</a>}</section> : <ModerationPanel />}
  </main>;
}
