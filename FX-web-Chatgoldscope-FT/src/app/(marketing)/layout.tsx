import { PublicFooter } from "@/components/marketing/PublicFooter";
import { PublicHeader } from "@/components/organisms/PublicHeader";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mk">
      <PublicHeader />
      {children}
      <PublicFooter />
    </div>
  );
}
