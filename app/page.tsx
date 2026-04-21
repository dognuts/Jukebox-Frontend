import { HomeClient } from "./home-client"
import { SEOContent, HomeStructuredData } from "./seo-content"

export default function HomePage() {
  return (
    <>
      <HomeStructuredData />
      <HomeClient seoSlot={<SEOContent />} />
    </>
  )
}
