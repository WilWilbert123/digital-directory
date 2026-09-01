import { KioskChrome } from "@/components/kiosk/KioskChrome";

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return <KioskChrome>{children}</KioskChrome>;
}
