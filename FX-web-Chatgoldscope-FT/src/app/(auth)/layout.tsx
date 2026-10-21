export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mk mk-auth">{children}</div>;
}
