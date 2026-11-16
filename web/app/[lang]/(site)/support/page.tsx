// Help & support: common questions, how to report a mistake and get in touch, and ways to support the site, written in
// the Studio (Pages → Help & support; components/content/ContentPage.tsx). Static: refreshed when the page is published.
import ContentPage, { contentPageMetadata } from "@/components/content/ContentPage";

export const generateMetadata = () => contentPageMetadata("support");

export default function SupportPage() {
  return <ContentPage pageKey="support" />;
}
