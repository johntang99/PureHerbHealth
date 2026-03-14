import { notFound } from "next/navigation";
import { StoreShell } from "@/components/layout/store-shell";
import { getDictionaries } from "@/lib/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { CartProvider } from "@/lib/cart/context";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { ChatFabPanel } from "@/components/ai/chat-fab-panel";
import { getStoreSiteConfig } from "@/lib/store/site-config";
import { getStoreContextFromHeaders } from "@/lib/store/context";

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const dictionaries = await getDictionaries(locale);
  // Read the store slug that middleware resolved (from x-store-slug header,
  // URL ?store_slug param, x-forwarded-host, or env var — in that priority order)
  const { storeSlug } = getStoreContextFromHeaders();
  const store = await getStoreSiteConfig(storeSlug);

  return (
    <CartProvider storeSlug={store.slug}>
      <StoreShell
        locale={locale}
        siteName={locale === "zh" ? store.name_zh || dictionaries.common.siteName : store.name || dictionaries.common.siteName}
        logoUrl={store.logo_url}
        themeCssVars={store.themeCssVars}
        storeSlug={store.slug}
        contactEmail={store.contact_email}
        contactPhone={store.contact_phone}
        businessName={store.business_name}
      >
        {children}
      </StoreShell>
      <CartDrawer />
      <ChatFabPanel />
    </CartProvider>
  );
}
