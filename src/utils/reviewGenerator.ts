import { ReviewPhrase, ReviewTemplate } from '../types';

export interface GenerateReviewInput {
  rating: number; // 1 to 5
  selectedPhrases: ReviewPhrase[] | string[];
  restaurantName?: string;
  customNotes?: string;
  templates?: ReviewTemplate[];
}

/**
 * Deterministic Rule-Based Review Generator.
 *
 * Combines selected phrases, categories, and rating level into a natural, cohesive,
 * grammatically sound review draft WITHOUT using any AI, LLM API calls, or external services.
 *
 * Guaranteed Properties:
 * 1. ZERO External AI / LLM / API dependencies.
 * 2. Only uses information selected or entered by the customer.
 * 3. Supports centrally managed Super Admin Review Templates with placeholders:
 *    {food}, {service}, {ambience}, {value}, {overall}
 * 4. Never invents dishes, service details, prices, or fictitious experiences.
 * 5. Accurately reflects rating sentiment (1–5 stars).
 * 6. Strips unpopulated template tokens safely to prevent UI formatting leaks.
 */
export function generateDeterministicReview(input: GenerateReviewInput): string {
  const { rating, selectedPhrases, restaurantName, customNotes, templates = [] } = input;

  // Clamp rating between 1 and 5
  const clampedRating = Math.max(1, Math.min(5, Math.round(rating || 5)));

  // 1. Group phrases by category
  const categoryMap: Record<string, string[]> = {
    food: [],
    service: [],
    ambience: [],
    value: [],
    overall: [],
    general: [],
  };

  const phraseObjects: ReviewPhrase[] = [];
  const rawStrings: string[] = [];

  for (const item of (selectedPhrases || [])) {
    if (typeof item === 'string') {
      rawStrings.push(item.trim());
    } else if (item && item.text) {
      phraseObjects.push(item);
      const cat = item.category || 'general';
      if (!categoryMap[cat]) categoryMap[cat] = [];
      categoryMap[cat].push(item.text.trim());
    }
  }

  // If passed raw strings, categorize safely into buckets
  for (const str of rawStrings) {
    const s = str.toLowerCase();
    if (s.includes('food') || s.includes('flavour') || s.includes('flavor') || s.includes('delicious') || s.includes('taste') || s.includes('dish')) {
      categoryMap.food.push(str);
    } else if (s.includes('staff') || s.includes('service') || s.includes('friendly') || s.includes('waiter') || s.includes('team') || s.includes('hospitality')) {
      categoryMap.service.push(str);
    } else if (s.includes('ambience') || s.includes('atmosphere') || s.includes('decor') || s.includes('music') || s.includes('vibe') || s.includes('seating')) {
      categoryMap.ambience.push(str);
    } else if (s.includes('price') || s.includes('value') || s.includes('portion') || s.includes('cost') || s.includes('worth')) {
      categoryMap.value.push(str);
    } else {
      categoryMap.overall.push(str);
    }
  }

  const placeName = restaurantName ? restaurantName.trim() : 'here';

  // 2. Check if an active template can be filled
  const activeTemplates = (templates || []).filter((t) => t.active !== false && t.status !== 'disabled');
  if (activeTemplates.length > 0) {
    // Find matching template based on available categories
    const matchingTemplate = activeTemplates.find((t) => {
      const neededPlaceholders = t.placeholders || [];
      return (
        neededPlaceholders.length > 0 &&
        neededPlaceholders.every((ph) => {
          const key = ph.replace(/[{}]/g, '').toLowerCase().trim();
          return categoryMap[key] && categoryMap[key].length > 0;
        })
      );
    });

    if (matchingTemplate) {
      let populatedText = matchingTemplate.templateText;
      for (const ph of matchingTemplate.placeholders) {
        const key = ph.replace(/[{}]/g, '').toLowerCase().trim();
        const phrases = categoryMap[key] || [];
        if (phrases.length > 0) {
          const phraseText = phrases[0].replace(/^[,\s.]+/, '').replace(/[,\s.]+$/, '');
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

  // 3. Fallback to intelligent deterministic rule-based composition
  let openingSentence = '';
  if (clampedRating === 5) {
    openingSentence = restaurantName
      ? `Had a wonderful dining experience at ${placeName}!`
      : 'Really enjoyed my experience here!';
  } else if (clampedRating === 4) {
    openingSentence = restaurantName
      ? `Had a great visit to ${placeName}.`
      : 'Great experience overall.';
  } else if (clampedRating === 3) {
    openingSentence = restaurantName
      ? `Visited ${placeName} recently. Decent experience overall.`
      : 'Had an okay experience.';
  } else if (clampedRating === 2) {
    openingSentence = restaurantName
      ? `Visited ${placeName}.`
      : 'Sharing some feedback from my recent visit.';
  } else {
    // 1 Star
    openingSentence = restaurantName
      ? `Visited ${placeName}.`
      : 'Sharing my feedback from my visit.';
  }

  const allPhraseTexts: string[] = [
    ...categoryMap.overall,
    ...categoryMap.food,
    ...categoryMap.service,
    ...categoryMap.ambience,
    ...categoryMap.value,
    ...categoryMap.general,
  ].filter((t) => t && t.trim().length > 0);

  const cleanedPhrases = allPhraseTexts.map((text) => {
    return text.replace(/^[,\s.]+/, '').replace(/[,\s.]+$/, '');
  });

  let bodyContent = '';
  if (cleanedPhrases.length === 1) {
    const p0 = cleanedPhrases[0];
    bodyContent = `${p0.charAt(0).toUpperCase() + p0.slice(1)}.`;
  } else if (cleanedPhrases.length === 2) {
    const p0 = cleanedPhrases[0];
    const p1 = cleanedPhrases[1];
    const secondPart = p1.charAt(0).toLowerCase() + p1.slice(1);
    bodyContent = `${p0}, and ${secondPart}.`;
  } else if (cleanedPhrases.length >= 3) {
    const firstParts = cleanedPhrases.slice(0, -1);
    const lastPart = cleanedPhrases[cleanedPhrases.length - 1];
    const lastCleaned = lastPart.charAt(0).toLowerCase() + lastPart.slice(1);
    bodyContent = `${firstParts.join(', ')}, and ${lastCleaned}.`;
  }

  let closing = '';
  if (clampedRating === 5) {
    closing = 'Would definitely recommend to friends and family!';
  } else if (clampedRating === 4) {
    closing = 'Looking forward to visiting again.';
  } else if (clampedRating === 3) {
    closing = 'Hope to see improvements next time.';
  }

  const customSection = customNotes && customNotes.trim().length > 0 ? customNotes.trim() : '';

  const parts: string[] = [];
  if (openingSentence) parts.push(openingSentence);
  if (bodyContent) parts.push(bodyContent);
  if (customSection) parts.push(customSection);
  if (closing && (clampedRating >= 4 || parts.length <= 2)) parts.push(closing);

  return parts.join(' ').replace(/\s{2,}/g, ' ').trim();
}
