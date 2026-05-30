import { Helmet } from "react-helmet-async";

interface PageMetaProps {
  title: string;
  description: string;
  /** Canonical URL path, e.g. "/apply". Defaults to current path. */
  path?: string;
  /** Absolute URL to OG image. Defaults to the Continuary social card. */
  image?: string;
}

const BASE_URL = "https://app.continuary.app";
const DEFAULT_IMAGE = "https://continuary.app/og-card.png";

export function PageMeta({ title, description, path, image }: PageMetaProps) {
  const fullTitle = title === "Continuary" ? title : `${title} — Continuary`;
  const url = path ? `${BASE_URL}${path}` : BASE_URL;
  const ogImage = image ?? DEFAULT_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Continuary" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@continuary_app" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Canonical */}
      <link rel="canonical" href={url} />
    </Helmet>
  );
}
