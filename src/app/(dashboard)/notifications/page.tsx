import { auth } from "@/lib/auth";
import NotificationsClient from "./NotificationsClient";

export default async function NotificationsPage() {
  const session = await auth();
  return <NotificationsClient userId={session!.user!.id!} />;
}
