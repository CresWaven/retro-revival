/**
 * Fixture data for MOCK=1.
 *
 * Two purposes:
 *   1. Preview and develop the UI before you have a TMDB API key.
 *   2. Let the app be tested in environments with no outbound network.
 *
 * Shapes here intentionally mirror `tmdb.js` exactly, so the frontend behaves
 * identically in mock and live mode. Posters and provider logos are null on
 * purpose, which also exercises the UI's artwork-fallback path.
 */

import { DECADES } from './config.js';

const P = {
  netflix: { id: 8, name: 'Netflix', logo: null },
  prime: { id: 9, name: 'Amazon Prime Video', logo: null },
  disney: { id: 337, name: 'Disney Plus', logo: null },
  max: { id: 1899, name: 'HBO Max', logo: null },
  hulu: { id: 15, name: 'Hulu', logo: null },
  paramount: { id: 531, name: 'Paramount Plus', logo: null },
  peacock: { id: 386, name: 'Peacock', logo: null },
  appletv: { id: 2, name: 'Apple TV', logo: null },
  tubi: { id: 73, name: 'Tubi', logo: null },
  pluto: { id: 300, name: 'Pluto TV', logo: null },
};

/** Compact fixture rows, expanded into full records below. */
const RAW = [
  // --- 90s movies ---
  ['movie', 771, 'Home Alone', 1990, 'Comedy,Family', 103, 7.4, 'A kid left behind at Christmas defends the house with improvised booby traps.', { stream: ['disney'], rent: ['prime', 'appletv'] }],
  ['movie', 280, 'Terminator 2: Judgment Day', 1991, 'Action,Sci-Fi', 137, 8.1, 'A reprogrammed machine protects the boy who will one day lead the resistance.', { stream: ['max'], rent: ['prime'] }],
  ['movie', 329, 'Jurassic Park', 1993, 'Adventure,Sci-Fi', 127, 8.0, 'A dinosaur theme park goes catastrophically wrong on its preview weekend.', { stream: ['peacock'], rent: ['prime', 'appletv'] }],
  ['movie', 4011, 'Hocus Pocus', 1993, 'Comedy,Family,Fantasy', 96, 7.0, 'Three resurrected witches loose in Salem on Halloween night.', { stream: ['disney'] }],
  ['movie', 788, 'Mrs. Doubtfire', 1993, 'Comedy,Drama', 125, 7.0, 'A father disguises himself as a housekeeper to stay close to his kids.', { stream: ['disney'], rent: ['prime'] }],
  ['movie', 8587, 'The Lion King', 1994, 'Animation,Family', 88, 8.3, 'A young lion flees his kingdom after his father dies and must return to claim it.', { stream: ['disney'] }],
  ['movie', 13, 'Forrest Gump', 1994, 'Comedy,Drama', 142, 8.5, 'An unassuming man keeps wandering into the defining moments of American history.', { stream: ['paramount'], rent: ['prime', 'appletv'] }],
  ['movie', 9603, 'Clueless', 1995, 'Comedy,Romance', 97, 7.3, 'A well-meaning Beverly Hills teenager appoints herself a matchmaker.', { stream: ['paramount'], ads: ['pluto'] }],
  ['movie', 2300, 'Space Jam', 1996, 'Animation,Comedy,Family', 88, 6.5, 'Michael Jordan is drafted by cartoon characters for a basketball game with everything at stake.', { stream: ['max'], rent: ['prime'] }],
  ['movie', 597, 'Titanic', 1997, 'Drama,Romance', 194, 7.9, 'Two passengers from different classes fall in love aboard a doomed ocean liner.', { stream: ['paramount'], rent: ['appletv'] }],
  ['movie', 607, 'Men in Black', 1997, 'Action,Comedy,Sci-Fi', 98, 7.2, 'A secret agency polices alien activity on Earth, one memory wipe at a time.', { stream: ['netflix'], rent: ['prime'] }],
  ['movie', 603, 'The Matrix', 1999, 'Action,Sci-Fi', 136, 8.2, 'A programmer discovers his reality is a simulation and joins the fight against it.', { stream: ['max'], rent: ['prime', 'appletv'] }],

  // --- 90s TV ---
  ['tv', 1668, 'Friends', 1994, 'Comedy', null, 8.4, 'Six friends navigate work, love, and a suspiciously large Manhattan apartment.', { stream: ['max'] }, 10, 236],
  ['tv', 2085, 'The Fresh Prince of Bel-Air', 1990, 'Comedy', null, 8.0, 'A West Philadelphia teen is sent to live with wealthy relatives in Bel-Air.', { stream: ['max'], ads: ['tubi'] }, 6, 148],
  ['tv', 2129, 'Rugrats', 1991, 'Animation,Family', null, 7.5, 'Babies embark on enormous adventures within a very ordinary house.', { stream: ['paramount'] }, 9, 172],
  ['tv', 2515, 'Boy Meets World', 1993, 'Comedy,Family', null, 7.7, 'A kid grows up under the watchful eye of the teacher who lives next door.', { stream: ['disney'] }, 7, 158],
  ['tv', 95, 'Buffy the Vampire Slayer', 1997, 'Drama,Fantasy', null, 8.2, 'A high schooler balances homework with her duty to fight the undead.', { stream: ['hulu'], ads: ['tubi'] }, 7, 145],
  ['tv', 2245, 'Hey Arnold!', 1996, 'Animation,Family', null, 7.6, 'A football-headed kid navigates city life with an unshakable optimism.', { stream: ['paramount'] }, 5, 100],

  // --- 2000s ---
  ['movie', 808, 'Shrek', 2001, 'Animation,Comedy,Family', 90, 7.7, 'An ogre and a talking donkey set out to rescue a princess and reclaim a swamp.', { stream: ['peacock'], rent: ['prime'] }],
  ['movie', 557, 'Spider-Man', 2002, 'Action,Adventure', 121, 7.3, 'A bitten teenager learns that great power comes with great responsibility.', { stream: ['disney'], rent: ['appletv'] }],
  ['movie', 22, 'Pirates of the Caribbean: The Curse of the Black Pearl', 2003, 'Adventure,Fantasy', 143, 7.8, 'A blacksmith allies with an eccentric pirate to rescue a governor\u2019s daughter.', { stream: ['disney'] }],
  ['movie', 10625, 'Mean Girls', 2004, 'Comedy', 97, 7.1, 'A new student is absorbed into, then undone by, a high school clique.', { stream: ['paramount'], rent: ['prime'] }],
  ['tv', 246, 'Avatar: The Last Airbender', 2005, 'Animation,Adventure', null, 8.7, 'A young airbender must master all four elements to end a hundred-year war.', { stream: ['netflix', 'paramount'] }, 3, 61],
  ['tv', 4607, 'Lost', 2004, 'Drama,Mystery', null, 8.3, 'Plane crash survivors discover their island is anything but deserted.', { stream: ['netflix', 'hulu'] }, 6, 121],
];

const DB = RAW.map(([type, id, title, year, genreStr, runtime, rating, overview, avail, seasons, episodes], index) => ({
  id,
  type,
  title,
  year,
  overview,
  poster: null,
  backdrop: null,
  rating,
  votes: 5000 - index * 50,
  // Descending so fixture ordering is stable and predictable in tests.
  popularity: 1000 - index * 10,
  tagline: '',
  genres: genreStr.split(','),
  runtime: type === 'movie' ? runtime : null,
  seasons: type === 'tv' ? seasons ?? null : null,
  episodes: type === 'tv' ? episodes ?? null : null,
  tmdbUrl: `https://www.themoviedb.org/${type}/${id}`,
  _avail: avail,
}));

function buildProviders(entry, region) {
  const avail = entry._avail || {};
  const pick = (keys) => (keys || []).map((k) => P[k]).filter(Boolean);

  const providers = {
    region,
    link: `https://www.justwatch.com/us/search?q=${encodeURIComponent(entry.title)}`,
    stream: pick(avail.stream),
    free: pick(avail.free),
    ads: pick(avail.ads),
    rent: pick(avail.rent),
    buy: pick(avail.buy),
  };

  providers.available =
    providers.stream.length > 0 ||
    providers.free.length > 0 ||
    providers.ads.length > 0 ||
    providers.rent.length > 0 ||
    providers.buy.length > 0;

  return providers;
}

/** Strip internal fields before sending to the client. */
function publicSummary(entry) {
  const { _avail, tagline, genres, runtime, seasons, episodes, tmdbUrl, ...summary } = entry;
  return summary;
}

function inDecade(entry, decadeKey) {
  const window = DECADES[decadeKey] || DECADES.all;
  return entry.year >= window.start && entry.year <= window.end;
}

function matchesType(entry, type) {
  return type === 'all' || entry.type === type;
}

export async function searchTitles({ query, type = 'all', decade = '90s' }) {
  const needle = String(query || '').trim().toLowerCase();

  const typeAndDecade = DB.filter((e) => matchesType(e, type) && inDecade(e, decade));
  const matched = typeAndDecade.filter((e) => e.title.toLowerCase().includes(needle));

  return {
    results: matched.map(publicSummary),
    page: 1,
    totalPages: 1,
    filteredOut: 0,
    totalResults: matched.length,
  };
}

export async function discoverTitles({ type = 'movie', decade = '90s', page = 1 }) {
  const mediaType = type === 'tv' ? 'tv' : 'movie';
  const matched = DB.filter((e) => e.type === mediaType && inDecade(e, decade));

  return {
    results: matched.map(publicSummary),
    page: Number(page),
    totalPages: 1,
    totalResults: matched.length,
  };
}

export async function getTitleDetail({ type, id, region }) {
  const numericId = Number(id);
  const entry = DB.find((e) => e.type === type && e.id === numericId);

  if (!entry) {
    const err = new Error('Not found');
    err.statusCode = 404;
    err.publicMessage = 'We could not find that title.';
    throw err;
  }

  const { _avail, ...detail } = entry;
  return { ...detail, providers: buildProviders(entry, region) };
}

export async function getRandomTitle({ decade = '90s', type = 'movie', region }) {
  const mediaType = type === 'tv' ? 'tv' : 'movie';
  const pool = DB.filter((e) => e.type === mediaType && inDecade(e, decade));

  if (!pool.length) {
    const err = new Error('No titles');
    err.statusCode = 404;
    err.publicMessage = 'Could not find a random pick. Try again.';
    throw err;
  }

  const pick = pool[Math.floor(Math.random() * pool.length)];
  return getTitleDetail({ type: pick.type, id: pick.id, region });
}
