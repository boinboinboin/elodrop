// About Elodrop: who's behind it, why it exists and its history, written in the Studio (Pages → About;
// components/content/ContentPage.tsx). Static: refreshed when the page is published.
import ContentPage, { contentPageMetadata } from "@/components/content/ContentPage";

export const generateMetadata = () => contentPageMetadata("about");

export default function AboutPage() {
  return <ContentPage pageKey="about" />;
}
