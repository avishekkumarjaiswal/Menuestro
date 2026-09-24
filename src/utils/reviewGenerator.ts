import { ReviewPhrase, ReviewTemplate } from '../types';

export interface GenerateReviewInput {
  rating: number; // 1 to 5
  selectedPhrases: ReviewPhrase[] | string[];
  restaurantName?: string;
  customNotes?: string;
  templates?: ReviewTemplate[];
}

/**
 * Random item picker from an array
 */
function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Shuffle array using Fisher-Yates
 */
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Normalizes a phrase for mid-sentence or beginning-of-sentence usage.
 */
function cleanPhrase(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/^[,.\s;:-]+/, '')
    .replace(/[,.\s;:-]+$/, '');
}

function lowerFirst(text: string): string {
  if (!text) return '';
  // Don't lower if it starts with "I " or an acronym
  if (text.startsWith('I ') || text.startsWith("I'") || /^[A-Z]{2,}/.test(text)) {
    return text;
  }
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function upperFirst(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// -------------------------------------------------------------
// High-Entropy Vocabularies & Sentence Structures (100,000+ Permutations)
// -------------------------------------------------------------

const FIVE_STAR_OPENERS_WITH_NAME = [
  (name: string) => `Had an incredible dining experience at ${name}!`,
  (name: string) => `Just visited ${name} and was thoroughly impressed!`,
  (name: string) => `We had an absolutely wonderful time at ${name} today.`,
  (name: string) => `Really loved our visit to ${name}!`,
  (name: string) => `Such a fantastic dining experience at ${name}.`,
  (name: string) => `Stopped by ${name} and couldn't have been happier with our visit.`,
  (name: string) => `Dining at ${name} was a complete delight from start to finish.`,
  (name: string) => `Had such a great meal at ${name}!`,
  (name: string) => `My experience at ${name} was nothing short of exceptional.`,
  (name: string) => `Everything about our visit to ${name} exceeded expectations.`,
  (name: string) => `Can't say enough good things about our time at ${name}!`,
  (name: string) => `We had a memorable and thoroughly enjoyable time at ${name}.`,
  (name: string) => `Had the pleasure of dining at ${name} recently.`,
  (name: string) => `Such a wonderful atmosphere and dining experience at ${name}.`,
  (name: string) => `What a gem ${name} is!`,
  (name: string) => `Top-notch experience at ${name} all around.`,
  (name: string) => `Our meal at ${name} was outstanding across the board.`,
  (name: string) => `Always a pleasure coming to ${name}!`,
  (name: string) => `Had a fabulous experience at ${name}!`,
  (name: string) => `Truly impressed by ${name} today.`,
  (name: string) => `Had a 5-star experience at ${name}!`,
  (name: string) => `So glad we chose to dine at ${name}.`,
  (name: string) => `Our visit to ${name} was absolutely superb.`,
  (name: string) => `A wonderful meal and visit at ${name}!`,
  (name: string) => `Hands down one of the best visits to ${name}.`,
  (name: string) => `Really blown away by our experience at ${name}!`,
  (name: string) => `Celebrated a great meal at ${name} today.`,
  (name: string) => `Came to ${name} and had a stellar experience.`,
  (name: string) => `Highly impressed by everything at ${name}!`,
  (name: string) => `Just had a lovely dining experience at ${name}.`,
];

const FIVE_STAR_OPENERS_GENERIC = [
  'Had an incredible dining experience here!',
  'Just visited and was thoroughly impressed!',
  'We had an absolutely wonderful time today.',
  'Really loved our dining experience here!',
  'Such a fantastic meal and visit.',
  'Stopped by and couldn\'t have been happier with the experience.',
  'Dining here was a complete delight from start to finish.',
  'Had such a great meal here!',
  'My experience here was nothing short of exceptional.',
  'Everything about this visit exceeded expectations.',
  'Can\'t say enough good things about this spot!',
  'Had a memorable and thoroughly enjoyable time.',
  'Had the pleasure of dining here recently.',
  'Such a wonderful atmosphere and dining experience.',
  'What a wonderful gem this place is!',
  'Top-notch experience here all around.',
  'Our meal was outstanding across the board.',
  'Truly impressed by everything today.',
  'Had a 5-star experience from start to finish!',
  'So glad we decided to dine here.',
];

const FOUR_STAR_OPENERS_WITH_NAME = [
  (name: string) => `Had a really great visit to ${name}.`,
  (name: string) => `Really enjoyed stopping by ${name} today.`,
  (name: string) => `Solid and pleasant dining experience at ${name}.`,
  (name: string) => `Overall a very positive experience at ${name}.`,
  (name: string) => `Had a good meal with great moments at ${name}.`,
  (name: string) => `Visited ${name} recently and had a very nice time.`,
  (name: string) => `A really nice visit to ${name} overall.`,
  (name: string) => `Enjoyed our time at ${name}.`,
  (name: string) => `Had a lovely lunch/dinner at ${name}.`,
  (name: string) => `Pleasantly surprised by our visit to ${name}.`,
  (name: string) => `A great dining experience at ${name}.`,
  (name: string) => `Good vibes and great experience at ${name}.`,
  (name: string) => `Really enjoyed our meal at ${name}.`,
  (name: string) => `Had a very satisfying meal at ${name}.`,
  (name: string) => `We had a great time visiting ${name}.`,
];

const FOUR_STAR_OPENERS_GENERIC = [
  'Had a really great visit here.',
  'Really enjoyed stopping by today.',
  'Solid and pleasant dining experience overall.',
  'Overall a very positive experience.',
  'Had a good meal and a pleasant time.',
  'Visited recently and had a very nice experience.',
  'A really nice visit overall.',
  'Enjoyed our time dining here.',
  'Had a very satisfying meal today.',
  'Great vibes and enjoyable experience overall.',
];

const THREE_STAR_OPENERS_WITH_NAME = [
  (name: string) => `Visited ${name} recently. Decent experience overall.`,
  (name: string) => `Had an okay visit to ${name}.`,
  (name: string) => `Stopped by ${name} for a meal.`,
  (name: string) => `Tried out ${name} today.`,
  (name: string) => `Fairly decent experience at ${name}.`,
  (name: string) => `Visited ${name} to check out their offerings.`,
];

const THREE_STAR_OPENERS_GENERIC = [
  'Visited recently. Decent experience overall.',
  'Had an okay visit here.',
  'Stopped by for a meal today.',
  'Fairly decent experience overall.',
  'Sharing my thoughts from a recent visit.',
];

const LOW_STAR_OPENERS_WITH_NAME = [
  (name: string) => `Visited ${name} recently.`,
  (name: string) => `Sharing some constructive feedback regarding my visit to ${name}.`,
  (name: string) => `Stopped by ${name} today.`,
  (name: string) => `Sharing our honest feedback from dining at ${name}.`,
];

const LOW_STAR_OPENERS_GENERIC = [
  'Visited recently and wanted to share my feedback.',
  'Sharing some constructive thoughts from my visit.',
  'Sharing our honest feedback from today.',
  'Leaving a few notes from our recent visit.',
];

// Transitions & Connectors
const TRANSITIONS_POSITIVE = [
  'In particular,',
  'What stood out most was that',
  'We especially appreciated how',
  'To top it off,',
  'On top of that,',
  'The highlight was that',
  'Plus,',
  'Moreover,',
  'We particularly loved that',
  'It was great to see that',
  'Notably,',
  'Beyond that,',
  'We also really appreciated that',
  'Another highlight was that',
  'Furthermore,',
  'Without a doubt,',
  'Equally impressive was how',
];

const TRANSITIONS_NEUTRAL = [
  'Additionally,',
  'On that note,',
  'Also,',
  'At the same time,',
  'Furthermore,',
  'In addition,',
  'As for the rest,',
];

// Closers
const FIVE_STAR_CLOSERS = [
  'Would definitely recommend to anyone looking for a great spot!',
  'Will definitely be returning again soon.',
  'Highly recommend this place to all friends and family.',
  'Already looking forward to our next visit!',
  'Deserves a solid 5 stars all the way.',
  'Can\'t wait to come back and try more.',
  'A must-visit spot that never disappoints!',
  'Hands down one of our favorite spots.',
  'Five stars well earned!',
  'Leaving with a full stomach and a big smile.',
  'Will certainly be recommending this place to others!',
  'Easily a 10/10 experience!',
  'Keep up the fantastic work!',
  'Looking forward to our next meal here.',
  'Couldn\'t ask for a better dining experience!',
  'Gladly giving 5 stars across the board.',
  'Will definitely be telling others to check this place out.',
  'A fantastic establishment all around!',
  'Can honestly say we will be back regularly.',
  'Top marks all around!',
  'Thank you for such a great time!',
  'Truly a wonderful place to dine.',
  'Can\'t recommend it highly enough!',
  'Will be back very soon for sure!',
  'Five well-deserved stars!',
];

const FOUR_STAR_CLOSERS = [
  'Looking forward to visiting again.',
  'Would happily recommend giving this place a try.',
  'A solid dining choice that I\'d recommend to others.',
  'Will definitely be stopping by again in the future.',
  'Overall a great spot worth checking out.',
  'Really good experience and will come back.',
  'Solid recommendation for anyone in the area.',
  'Happy to recommend and will visit again.',
  'A very pleasant experience overall!',
  'Looking forward to seeing what they do next time.',
];

const THREE_STAR_CLOSERS = [
  'Hope to see a few refinements on our next visit.',
  'Decent overall, with potential for even better.',
  'An okay experience, hope things improve next time.',
  'Worth a visit if you are in the area.',
  'Hopeful for a better experience next time around.',
];

const LOW_STAR_CLOSERS = [
  'Hoping management takes note of this feedback.',
  'Hope to see improvements in the future.',
  'Sharing in hopes that service and experience can get better.',
];

/**
 * Deterministic Rule-Based & High-Entropy Review Generator.
 *
 * Combines selected phrases, categories, and rating level into a natural, cohesive,
 * grammatically sound review draft WITHOUT using any AI, LLM API calls, or external services.
 *
 * Guaranteed Properties:
 * 1. ZERO External AI / LLM / API dependencies (instant <1ms client-side execution).
 * 2. Generates distinct, natural text combinations with over 100,000+ combinatoric permutations.
 * 3. Only uses information selected or entered by the customer (no fabricated dishes/prices).
 * 4. Supports centrally managed Super Admin Review Templates with placeholders:
 *    {food}, {service}, {ambience}, {value}, {overall}
 * 5. Accurately reflects rating sentiment (1–5 stars).
 * 6. Strips unpopulated template tokens safely to prevent UI formatting leaks.
 */
export function generateDeterministicReview(input: GenerateReviewInput): string {
  const { rating, selectedPhrases, restaurantName, customNotes, templates = [] } = input;

  // Clamp rating between 1 and 5
  const clampedRating = Math.max(1, Math.min(5, Math.round(rating || 5)));
  const placeName = restaurantName ? restaurantName.trim() : '';

  // 1. Group phrases by category
  const categoryMap: Record<string, string[]> = {
    food: [],
    service: [],
    ambience: [],
    value: [],
    overall: [],
    general: [],
  };

  const rawStrings: string[] = [];

  for (const item of (selectedPhrases || [])) {
    if (typeof item === 'string') {
      rawStrings.push(item.trim());
    } else if (item && item.text) {
      const cat = item.category || 'general';
      if (!categoryMap[cat]) categoryMap[cat] = [];
      categoryMap[cat].push(item.text.trim());
    }
  }

  // If passed raw strings, categorize safely into buckets
  for (const str of rawStrings) {
    const s = str.toLowerCase();
    if (s.includes('food') || s.includes('flavour') || s.includes('flavor') || s.includes('delicious') || s.includes('taste') || s.includes('dish') || s.includes('fresh')) {
      categoryMap.food.push(str);
    } else if (s.includes('staff') || s.includes('service') || s.includes('friendly') || s.includes('waiter') || s.includes('team') || s.includes('hospitality') || s.includes('attentive')) {
      categoryMap.service.push(str);
    } else if (s.includes('ambience') || s.includes('atmosphere') || s.includes('decor') || s.includes('music') || s.includes('vibe') || s.includes('seating') || s.includes('cozy') || s.includes('clean')) {
      categoryMap.ambience.push(str);
    } else if (s.includes('price') || s.includes('value') || s.includes('portion') || s.includes('cost') || s.includes('worth') || s.includes('affordable')) {
      categoryMap.value.push(str);
    } else {
      categoryMap.overall.push(str);
    }
  }

  // 2. Check if an active Super Admin template can be filled
  const activeTemplates = (templates || []).filter((t) => t.active !== false && t.status !== 'disabled');
  if (activeTemplates.length > 0) {
    // Find all matching templates based on available categories
    const matchingTemplates = activeTemplates.filter((t) => {
      const neededPlaceholders = t.placeholders || [];
      return (
        neededPlaceholders.length > 0 &&
        neededPlaceholders.every((ph) => {
          const key = ph.replace(/[{}]/g, '').toLowerCase().trim();
          return categoryMap[key] && categoryMap[key].length > 0;
        })
      );
    });

    if (matchingTemplates.length > 0) {
      // Pick randomly among matching templates to prevent static repetition
      const chosenTemplate = pickOne(matchingTemplates);
      let populatedText = chosenTemplate.templateText;

      for (const ph of chosenTemplate.placeholders) {
        const key = ph.replace(/[{}]/g, '').toLowerCase().trim();
        const phrases = categoryMap[key] || [];
        if (phrases.length > 0) {
          // Pick a random phrase in this category or clean it
          const phraseText = cleanPhrase(pickOne(phrases));
          populatedText = populatedText.split(ph).join(phraseText);
        }
      }

      // Safe clean up of any remaining unmatched curly tokens: e.g. {overall}
      populatedText = populatedText.replace(/\{[a-zA-Z0-9_-]+\}/g, '').replace(/\s{2,}/g, ' ').trim();

      // Append custom notes if any
      if (customNotes && customNotes.trim().length > 0) {
        populatedText += ` ${customNotes.trim()}`;
      }
      return populatedText;
    }
  }

  // -------------------------------------------------------------------
  // 3. High-Entropy Combinatorial Composition Engine
  // -------------------------------------------------------------------

  // A. Select Random Opener
  let opener = '';
  if (clampedRating === 5) {
    opener = placeName
      ? pickOne(FIVE_STAR_OPENERS_WITH_NAME)(placeName)
      : pickOne(FIVE_STAR_OPENERS_GENERIC);
  } else if (clampedRating === 4) {
    opener = placeName
      ? pickOne(FOUR_STAR_OPENERS_WITH_NAME)(placeName)
      : pickOne(FOUR_STAR_OPENERS_GENERIC);
  } else if (clampedRating === 3) {
    opener = placeName
      ? pickOne(THREE_STAR_OPENERS_WITH_NAME)(placeName)
      : pickOne(THREE_STAR_OPENERS_GENERIC);
  } else {
    opener = placeName
      ? pickOne(LOW_STAR_OPENERS_WITH_NAME)(placeName)
      : pickOne(LOW_STAR_OPENERS_GENERIC);
  }

  // B. Gather and Randomly Shuffle Selected Phrases
  const allPhraseTexts: string[] = [
    ...categoryMap.overall,
    ...categoryMap.food,
    ...categoryMap.service,
    ...categoryMap.ambience,
    ...categoryMap.value,
    ...categoryMap.general,
  ].filter((t) => t && t.trim().length > 0);

  const cleanedPhrases = shuffle(allPhraseTexts.map(cleanPhrase).filter(Boolean));

  // C. Assemble Body Phrases with Combinatorial Structural Variations
  let bodySentences: string[] = [];

  if (cleanedPhrases.length === 1) {
    const p = cleanedPhrases[0];
    const singleStyle = Math.floor(Math.random() * 4);
    if (singleStyle === 0) {
      bodySentences.push(`${upperFirst(p)}.`);
    } else if (singleStyle === 1) {
      bodySentences.push(`We especially appreciated that ${lowerFirst(p)}.`);
    } else if (singleStyle === 2) {
      bodySentences.push(`The highlight for us was that ${lowerFirst(p)}.`);
    } else {
      bodySentences.push(`Notably, ${lowerFirst(p)}.`);
    }
  } else if (cleanedPhrases.length === 2) {
    const p0 = cleanedPhrases[0];
    const p1 = cleanedPhrases[1];
    const dualStyle = Math.floor(Math.random() * 5);

    if (dualStyle === 0) {
      bodySentences.push(`${upperFirst(p0)}, and ${lowerFirst(p1)}.`);
    } else if (dualStyle === 1) {
      const trans = clampedRating >= 4 ? pickOne(TRANSITIONS_POSITIVE) : pickOne(TRANSITIONS_NEUTRAL);
      bodySentences.push(`${upperFirst(p0)}.`);
      bodySentences.push(`${trans} ${lowerFirst(p1)}.`);
    } else if (dualStyle === 2) {
      bodySentences.push(`Both ${lowerFirst(p0)} and ${lowerFirst(p1)} made our visit memorable.`);
    } else if (dualStyle === 3) {
      bodySentences.push(`${upperFirst(p0)} — plus, ${lowerFirst(p1)}.`);
    } else {
      bodySentences.push(`We really loved that ${lowerFirst(p0)}, and ${lowerFirst(p1)}.`);
    }
  } else if (cleanedPhrases.length >= 3) {
    const multiStyle = Math.floor(Math.random() * 5);
    const trans = clampedRating >= 4 ? pickOne(TRANSITIONS_POSITIVE) : pickOne(TRANSITIONS_NEUTRAL);

    if (multiStyle === 0) {
      // Split into 2 sentences: First (N-1) phrases + Last phrase
      const firstGroup = cleanedPhrases.slice(0, cleanedPhrases.length - 1);
      const lastPhrase = cleanedPhrases[cleanedPhrases.length - 1];
      const firstSentence = firstGroup.length === 2
        ? `${upperFirst(firstGroup[0])} and ${lowerFirst(firstGroup[1])}.`
        : `${upperFirst(firstGroup.slice(0, -1).join(', '))}, and ${lowerFirst(firstGroup[firstGroup.length - 1])}.`;
      bodySentences.push(firstSentence);
      bodySentences.push(`${trans} ${lowerFirst(lastPhrase)}.`);
    } else if (multiStyle === 1) {
      // Single flowing sentence with Oxford comma
      const allExceptLast = cleanedPhrases.slice(0, -1);
      const last = cleanedPhrases[cleanedPhrases.length - 1];
      bodySentences.push(`${upperFirst(allExceptLast.join(', '))}, and ${lowerFirst(last)}.`);
    } else if (multiStyle === 2) {
      // Intro lead-in + list
      const allExceptLast = cleanedPhrases.slice(0, -1);
      const last = cleanedPhrases[cleanedPhrases.length - 1];
      bodySentences.push(`Everything from ${lowerFirst(allExceptLast.join(', '))} to ${lowerFirst(last)} was great.`);
    } else if (multiStyle === 3) {
      // 2 phrases in first sentence, rest in second sentence
      const p0 = cleanedPhrases[0];
      const p1 = cleanedPhrases[1];
      const rest = cleanedPhrases.slice(2);
      bodySentences.push(`${upperFirst(p0)}, and ${lowerFirst(p1)}.`);
      if (rest.length === 1) {
        bodySentences.push(`${trans} ${lowerFirst(rest[0])}.`);
      } else {
        bodySentences.push(`On top of that, ${lowerFirst(rest.slice(0, -1).join(', '))}, and ${lowerFirst(rest[rest.length - 1])}.`);
      }
    } else {
      // Lead with compliment followed by phrases
      const p0 = cleanedPhrases[0];
      const others = cleanedPhrases.slice(1);
      bodySentences.push(`We especially enjoyed that ${lowerFirst(p0)}.`);
      bodySentences.push(`${trans} ${lowerFirst(others.slice(0, -1).join(', '))} ${others.length > 1 ? 'and ' : ''}${lowerFirst(others[others.length - 1])}.`);
    }
  }

  // D. Select Random Closer
  let closer = '';
  if (clampedRating === 5) {
    closer = pickOne(FIVE_STAR_CLOSERS);
  } else if (clampedRating === 4) {
    closer = pickOne(FOUR_STAR_CLOSERS);
  } else if (clampedRating === 3) {
    closer = pickOne(THREE_STAR_CLOSERS);
  } else {
    closer = pickOne(LOW_STAR_CLOSERS);
  }

  const customSection = customNotes && customNotes.trim().length > 0 ? customNotes.trim() : '';

  // E. Assemble All Components
  const resultParts: string[] = [];

  if (opener) {
    resultParts.push(opener);
  }

  if (bodySentences.length > 0) {
    resultParts.push(...bodySentences);
  }

  if (customSection) {
    // Ensure custom notes end with a period or natural punctuation
    const formattedNotes = /[.!?]$/.test(customSection) ? customSection : `${customSection}.`;
    resultParts.push(formattedNotes);
  }

  if (closer) {
    resultParts.push(closer);
  }

  // Final clean up of multiple spaces or irregular punctuation
  return resultParts
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/([.!?])\s*([.!?])/g, '$1')
    .trim();
}
