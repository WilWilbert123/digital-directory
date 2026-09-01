import { getKioskBootstrapAction } from "@/app/actions/kiosk";
import { HomeSearch } from "@/components/kiosk/HomeSearch";

export default async function KioskHomePage() {
  const data = await getKioskBootstrapAction();
  return <HomeSearch tenants={data.tenants} />;
}
