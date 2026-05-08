import { redirect } from "next/navigation";

export default async function ProjektySlugRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/klienci/${slug}`);
}
