// Root <html dir="rtl" lang="ar"> in app/layout.tsx covers the whole app.
// This wrapper exists for the rare case a subtree needs to force LTR
// (e.g. embedding a raw phone number or a code snippet).
export function RTLProvider({
  children,
  dir = "rtl",
}: {
  children: React.ReactNode;
  dir?: "rtl" | "ltr";
}) {
  return <div dir={dir}>{children}</div>;
}
