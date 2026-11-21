import type { MetadataRoute } from "next";

/** The deck is open without a key but stays out of search engines: this,
 *  the noindex meta and the X-Robots-Tag header. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
