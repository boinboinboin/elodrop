// Privacy: what an account keeps, why and for how long, and how to delete it, written in the Studio (Pages → Privacy;
// components/content/ContentPage.tsx). Linked from the account's sign-up (the age gate) and the footer. Static:
// refreshed when the page is published. Publish it before switching the accounts on (README: "User accounts").
import ContentPage, { contentPageMetadata } from "@/components/content/ContentPage";

export const generateMetadata = () => contentPageMetadata("privacy");

export default function PrivacyPage() {
  return <ContentPage pageKey="privacy" />;
}
