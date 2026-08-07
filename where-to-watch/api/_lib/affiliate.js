/**
 * Amazon Associates link builder.
 *
 * IMPORTANT COMPLIANCE NOTE
 * -------------------------
 * Amazon's Operating Agreement prohibits affiliate links in email and in any
 * "offline" medium, which includes PDFs and downloadable files. That is why this
 * app builds links only for rendering on the web page.
 *
 * When you promote this tool in your newsletter or a PDF, link to THIS SITE and
 * let the affiliate links live here. Do not paste Amazon links into Beehiiv.
 *
 * The required disclosure is rendered in the UI (see public/index.html footer).
 */

import { config } from './config.js';

const AMAZON_DOMAIN_BY_REGION = {
  US: 'amazon.com',
  CA: 'amazon.ca',
  GB: 'amazon.co.uk',
  UK: 'amazon.co.uk',
  DE: 'amazon.de',
  FR: 'amazon.fr',
  IT: 'amazon.it',
  ES: 'amazon.es',
  JP: 'amazon.co.jp',
  AU: 'amazon.com.au',
  MX: 'amazon.com.mx',
  BR: 'amazon.com.br',
  IN: 'amazon.in',
};

/**
 * Build a search link for a physical copy of a title.
 * Returns null when no associate tag is configured, so the UI can simply omit
 * the button rather than render a broken or untagged link.
 */
export function buildAmazonLink(title, { region = 'US', year = null } = {}) {
  if (!config.amazonTag || !title) return null;

  const domain = AMAZON_DOMAIN_BY_REGION[region] || AMAZON_DOMAIN_BY_REGION.US;
  const keywords = year ? `${title} ${year} dvd` : `${title} dvd`;

  const url = new URL(`https://www.${domain}/s`);
  url.searchParams.set('k', keywords);
  url.searchParams.set('i', 'movies-tv'); // Scope to the Movies & TV department.
  url.searchParams.set('tag', config.amazonTag);

  return url.toString();
}

export const affiliateEnabled = () => Boolean(config.amazonTag);
