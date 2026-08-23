import { PublicHeader } from "@/components/organisms/PublicHeader";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <><PublicHeader/>{children}</>;
}
