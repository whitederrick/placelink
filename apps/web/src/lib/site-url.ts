const LOCAL_SITE_URL = "http://localhost:3000";

interface SiteEnvironment {
  NEXT_PUBLIC_SITE_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_URL?: string;
}

function normalizeOrigin(value: string) {
  return value.replace(/\/+$/, "");
}

export function getSiteOrigin(
  environment: SiteEnvironment = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  },
) {
  if (environment.NEXT_PUBLIC_SITE_URL) {
    return normalizeOrigin(environment.NEXT_PUBLIC_SITE_URL);
  }

  const vercelHost =
    environment.VERCEL_PROJECT_PRODUCTION_URL ?? environment.VERCEL_URL;
  return vercelHost ? `https://${normalizeOrigin(vercelHost)}` : LOCAL_SITE_URL;
}

export function getLocalizedAlternates(pathname = "") {
  const origin = getSiteOrigin();
  const suffix = pathname ? `/${pathname.replace(/^\/+/, "")}` : "";

  return {
    ko: `${origin}/ko${suffix}`,
    en: `${origin}/en${suffix}`,
    "x-default": `${origin}/ko${suffix}`,
  };
}
