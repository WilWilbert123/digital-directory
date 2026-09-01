import { getKioskBootstrapAction } from "@/app/actions/kiosk";
import { CategoriesView } from "@/components/kiosk/CategoriesView";

export default async function CategoriesPage() {
  const data = await getKioskBootstrapAction();
  return <CategoriesView categories={data.categories} tenants={data.tenants} />;
}
