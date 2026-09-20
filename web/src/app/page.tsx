import { getCurrentUser } from "@/features/access/api/get-current-user";
import { getHomeHubData } from "@/features/dashboard/api/get-home-hub";
import { HomeHub } from "@/features/dashboard/components/home-hub";
import { getBranding } from "@/features/branding/api/branding";

export const metadata = { title: "Ana Sayfa" };

export default async function HomePage() {
  const [data, user, branding] = await Promise.all([getHomeHubData(), getCurrentUser(), getBranding()]);

  return <HomeHub data={data} user={user} siteTitle={branding.siteTitle} />;
}
