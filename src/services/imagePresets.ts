/**
 * Smart Preset Food Image Matcher for Menu Items
 * Automatically suggests and applies high-resolution photography based on dish name keywords.
 */

export interface FoodPreset {
  name: string;
  keywords: string[];
  url: string;
}

export const FOOD_PRESETS: FoodPreset[] = [
  {
    name: 'Garlic Bread / Knots',
    keywords: [
      'garlic knot',
      'garlic knots',
      'garlic bread',
      'knot',
      'knots',
      'bruschetta',
      'focaccia',
      'bread',
      'toast',
      'naan',
      'roti',
      'paratha',
      'kulcha',
    ],
    url: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Biryani & Rice',
    keywords: [
      'biryani',
      'biriyani',
      'dum biryani',
      'pulao',
      'fried rice',
      'rice',
      'jeera rice',
      'khichdi',
      'curd rice',
      'pilaf',
    ],
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Pizza',
    keywords: [
      'pizza',
      'margherita',
      'pepperoni',
      'calzone',
      'woodfired',
      'flatbread',
      'marinara',
    ],
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Pasta',
    keywords: [
      'pasta',
      'spaghetti',
      'alfredo',
      'carbonara',
      'penne',
      'macaroni',
      'lasagna',
      'ravioli',
      'fettuccine',
      'arrabbiata',
      'pesto',
      'fusilli',
      'rigatoni',
      'mac & cheese',
      'mac and cheese',
    ],
    url: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Burger',
    keywords: [
      'burger',
      'slider',
      'sliders',
      'whopper',
      'patty',
      'cheeseburger',
      'hamburger',
    ],
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Sandwich & Rolls',
    keywords: [
      'sandwich',
      'sub',
      'panini',
      'wrap',
      'roll',
      'frankie',
      'club sandwich',
      'toastie',
      'shawarma',
      'kathi roll',
    ],
    url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Curry & Gravy',
    keywords: [
      'curry',
      'butter chicken',
      'paneer',
      'tikka masala',
      'masala',
      'korma',
      'dal',
      'makhani',
      'gravy',
      'kadhai',
      'kadai',
      'kofta',
      'rajma',
      'chole',
      'palak',
      'sambar',
    ],
    url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Tandoori & Tikka',
    keywords: [
      'tikka',
      'kebab',
      'kabab',
      'tandoori',
      'seekh',
      'roasted',
      'roast chicken',
      'tandoor',
      'boti',
    ],
    url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Salad',
    keywords: [
      'salad',
      'caprese',
      'caesar',
      'greek salad',
      'greens',
      'bowl',
      'slaw',
      'sprouts',
    ],
    url: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Noodles & Asian',
    keywords: [
      'noodles',
      'chowmein',
      'chow mein',
      'ramen',
      'momos',
      'momo',
      'dim sum',
      'dimsum',
      'manchurian',
      'asian',
      'wok',
      'dumpling',
      'dumplings',
      'pad thai',
      'schezwan',
      'spring roll',
      'chopsuey',
    ],
    url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Fries & Appetizers',
    keywords: [
      'fries',
      'french fries',
      'peri peri fries',
      'potato',
      'wedges',
      'nuggets',
      'nachos',
      'onion rings',
      'crispy corn',
      'finger chips',
    ],
    url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Wings & Chicken',
    keywords: [
      'wings',
      'chicken wings',
      'crispy chicken',
      'chicken strips',
      'popcorn chicken',
      'drumsticks',
      'lollipop',
    ],
    url: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Dessert',
    keywords: [
      'dessert',
      'cake',
      'brownie',
      'ice cream',
      'pastry',
      'sweet',
      'halwa',
      'gulab jamun',
      'rasgulla',
      'waffle',
      'pancake',
      'cookie',
      'cookies',
      'donut',
      'doughnut',
      'cheesecake',
      'sundae',
      'tiramisu',
      'mousse',
      'pudding',
      'kulfi',
    ],
    url: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Drinks & Shakes',
    keywords: [
      'shake',
      'smoothie',
      'mojito',
      'mocktail',
      'cocktail',
      'beverage',
      'juice',
      'drink',
      'soda',
      'lemonade',
      'lassi',
      'cooler',
      'iced tea',
      'frappe',
    ],
    url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Coffee & Tea',
    keywords: [
      'coffee',
      'latte',
      'cappuccino',
      'espresso',
      'tea',
      'chai',
      'mocha',
      'americano',
      'macchiato',
    ],
    url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Soup',
    keywords: [
      'soup',
      'broth',
      'manchow',
      'hot and sour',
      'tomato soup',
      'sweet corn soup',
      'shorba',
    ],
    url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Tacos & Mexican',
    keywords: [
      'taco',
      'tacos',
      'quesadilla',
      'burrito',
      'enchilada',
      'fajita',
    ],
    url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Steak & Sizzler',
    keywords: [
      'steak',
      'sizzler',
      'bbq',
      'grill',
      'ribs',
      'chops',
    ],
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
  },
];

export const DEFAULT_DISH_PHOTO =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';

/**
 * Matches a dish name against food keywords and returns the most relevant preset image URL.
 */
export function getPresetImageForDishName(name: string): string | null {
  if (!name || !name.trim()) return null;

  const normalized = name.toLowerCase().trim();

  // Try exact or multi-word keyword matches first (longer keywords take precedence)
  for (const preset of FOOD_PRESETS) {
    for (const kw of preset.keywords) {
      // Check if dish name includes the keyword as a substring or word
      if (normalized.includes(kw)) {
        return preset.url;
      }
    }
  }

  return null;
}

/**
 * Returns the matching FoodPreset object if found.
 */
export function getMatchingPreset(name: string): FoodPreset | null {
  if (!name || !name.trim()) return null;

  const normalized = name.toLowerCase().trim();

  for (const preset of FOOD_PRESETS) {
    for (const kw of preset.keywords) {
      if (normalized.includes(kw)) {
        return preset;
      }
    }
  }

  return null;
}
