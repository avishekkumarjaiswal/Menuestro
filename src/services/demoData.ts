import {
  createCategory,
  createMenuItem,
  createQRCode,
  updateBusiness,
} from './firestoreService';
import { MenuItemTag } from '../types';

export async function seedDemoRestaurantData(businessId: string): Promise<void> {
  // Update business profile info
  await updateBusiness(businessId, {
    name: 'The Green Plate',
    slug: 'thegreenplate',
    description: 'Good Food. Better Company.',
    address: 'Kamla Nagar, Delhi',
    phone: '+91 96765 43210',
    googleReviewUrl: 'https://g.page/thegreenplate/review',
    primaryColor: '#16A34A',
    currencySymbol: '₹',
    logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&auto=format&fit=crop&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
    googleRating: 4.6,
    ratingCount: 342,
  });

  // Category 1: Starters (6 items)
  const catStartersId = await createCategory(businessId, {
    name: 'Starters',
    description: 'Crispy, flavorful appetizers to awaken your palate',
    sortOrder: 1,
    isActive: true,
  });

  // Category 2: Main Course (8 items)
  const catMainsId = await createCategory(businessId, {
    name: 'Main Course',
    description: 'Hearty, chef-crafted signature entrees & specialties',
    sortOrder: 2,
    isActive: true,
  });

  // Category 3: Beverages (5 items)
  const catBeveragesId = await createCategory(businessId, {
    name: 'Beverages',
    description: 'Chilled artisanal brews, mocktails & refreshing sodas',
    sortOrder: 3,
    isActive: true,
  });

  // Category 4: Desserts (5 items)
  const catDessertsId = await createCategory(businessId, {
    name: 'Desserts',
    description: 'Decadent sweet endings made fresh in-house daily',
    sortOrder: 4,
    isActive: true,
  });

  // Starters (6 items)
  await createMenuItem(businessId, catStartersId, {
    name: 'Paneer Tikka',
    description: 'Grilled cottage cheese with spices',
    price: 249,
    isAvailable: true,
    sortOrder: 1,
    tags: ['Bestseller', 'Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Cottage Cheese', 'Bell Peppers', 'Hung Curd', 'Kashmiri Chili', 'Mint Chutney'],
  });

  await createMenuItem(businessId, catStartersId, {
    name: 'Veg Manchurian',
    description: 'Crispy veg balls in house sauce',
    price: 199,
    isAvailable: true,
    sortOrder: 2,
    tags: ['Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Cabbage', 'Carrots', 'Garlic', 'Soy Sauce', 'Spring Onion'],
  });

  await createMenuItem(businessId, catStartersId, {
    name: 'Spring Rolls',
    description: 'Crispy rolls with fresh veggies',
    price: 179,
    isAvailable: true,
    sortOrder: 3,
    tags: ['Bestseller', 'Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Cabbage', 'Carrot', 'Bell Pepper', 'Spring Roll Pastry', 'Sweet Chili Dip'],
  });

  await createMenuItem(businessId, catStartersId, {
    name: 'Garlic Bread',
    description: 'Freshly toasted baguette with herb butter and melted mozzarella',
    price: 149,
    isAvailable: true,
    sortOrder: 4,
    tags: ['Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Baguette', 'Garlic Butter', 'Mozzarella', 'Oregano'],
  });

  await createMenuItem(businessId, catStartersId, {
    name: 'Crispy Golden Corn',
    description: 'Tender sweet corn flash-fried with scallions and chatpata spices',
    price: 189,
    isAvailable: true,
    sortOrder: 5,
    tags: ['Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Sweet Corn', 'Black Pepper', 'Chili Flakes', 'Lemon Juice'],
  });

  await createMenuItem(businessId, catStartersId, {
    name: 'Dahi Ke Kebab',
    description: 'Velvety hung curd patties spiced with cardamoms and green chili',
    price: 229,
    isAvailable: true,
    sortOrder: 6,
    tags: ['Chef\'s Special', 'Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Hung Curd', 'Paneer', 'Green Chili', 'Cardamom', 'Coriander'],
  });

  // Main Course (8 items)
  await createMenuItem(businessId, catMainsId, {
    name: 'Pasta Alfredo',
    description: 'Creamy white sauce pasta with garlic, herbs and parmesan cheese.',
    price: 279,
    isAvailable: true,
    sortOrder: 1,
    tags: ['Bestseller', 'Chef\'s Special', 'Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Pasta', 'cream', 'garlic', 'parmesan', 'herbs'],
  });

  await createMenuItem(businessId, catMainsId, {
    name: 'Paneer Butter Masala',
    description: 'Classic North Indian curry',
    price: 299,
    isAvailable: true,
    sortOrder: 2,
    tags: ['Bestseller', 'Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Paneer', 'Roma Tomatoes', 'Cashew Cream', 'Butter', 'Kasoori Methi'],
  });

  await createMenuItem(businessId, catMainsId, {
    name: 'Margherita Pizza',
    description: 'Classic cheese pizza with fresh mozzarella and basil',
    price: 249,
    isAvailable: false, // matches screenshot unavailable status!
    sortOrder: 3,
    tags: ['Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Sourdough', 'San Marzano Tomatoes', 'Fresh Mozzarella', 'Basil', 'Olive Oil'],
  });

  await createMenuItem(businessId, catMainsId, {
    name: 'Dal Makhani',
    description: 'Slow cooked black lentils with aromatic butter and cream',
    price: 249,
    isAvailable: true,
    sortOrder: 4,
    tags: ['Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Urad Dal', 'Butter', 'Cream', 'Ginger', 'Fenugreek'],
  });

  await createMenuItem(businessId, catMainsId, {
    name: 'Chicken Biryani',
    description: 'Aromatic basmati rice cooked with succulent chicken and royal saffron',
    price: 299,
    isAvailable: true,
    sortOrder: 5,
    tags: ['Bestseller'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Basmati Rice', 'Chicken', 'Saffron', 'Mint', 'Fried Onions'],
  });

  await createMenuItem(businessId, catMainsId, {
    name: 'Farmhouse Pizza',
    description: 'Onion, capsicum, mushroom, and sweet corn on thin crust',
    price: 299,
    isAvailable: true,
    sortOrder: 6,
    tags: ['Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Bell Peppers', 'Red Onion', 'Button Mushrooms', 'Mozzarella'],
  });

  await createMenuItem(businessId, catMainsId, {
    name: 'Butter Chicken',
    description: 'Tender tandoori chicken simmered in a velvety makhani sauce',
    price: 347,
    isAvailable: true,
    sortOrder: 7,
    tags: ['Bestseller'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Boneless Chicken', 'Butter', 'Cashew Paste', 'Kasoori Methi'],
  });

  await createMenuItem(businessId, catMainsId, {
    name: 'Kadhai Paneer',
    description: 'Cottage cheese cubes tossed with freshly ground coriander seeds and bell peppers',
    price: 289,
    isAvailable: true,
    sortOrder: 8,
    tags: ['Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Paneer', 'Bell Peppers', 'Whole Spices', 'Tomato Gravy'],
  });

  // Beverages (5 items)
  await createMenuItem(businessId, catBeveragesId, {
    name: 'Cold Coffee',
    description: 'Chilled coffee with ice cream',
    price: 149,
    isAvailable: true,
    sortOrder: 1,
    tags: ['Bestseller'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Espresso', 'Vanilla Gelato', 'Chilled Milk'],
  });

  await createMenuItem(businessId, catBeveragesId, {
    name: 'Signature Cold Brew',
    description: 'Steeped for 20 hours from single-origin Arabica beans',
    price: 169,
    isAvailable: true,
    sortOrder: 2,
    tags: ['Chef\'s Special'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Single Origin Coffee', 'Ice Filtered Water'],
  });

  await createMenuItem(businessId, catBeveragesId, {
    name: 'Fresh Mint Lime Soda',
    description: 'Freshly squeezed Key limes with garden spearmint and soda',
    price: 129,
    isAvailable: true,
    sortOrder: 3,
    tags: ['Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Fresh Lime', 'Spearmint', 'Sparkling Soda', 'Black Salt'],
  });

  await createMenuItem(businessId, catBeveragesId, {
    name: 'Iced Peach Tea',
    description: 'Brewed Assam black tea infused with sweet white peach puree',
    price: 139,
    isAvailable: true,
    sortOrder: 4,
    tags: ['Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Black Tea', 'Peach Puree', 'Mint', 'Lemon'],
  });

  await createMenuItem(businessId, catBeveragesId, {
    name: 'Masala Chai',
    description: 'Traditional slow-brewed tea infused with ginger, cardamom and cloves',
    price: 79,
    isAvailable: true,
    sortOrder: 5,
    tags: ['Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Tea Leaves', 'Fresh Ginger', 'Cardamom Pods', 'Milk'],
  });

  // Desserts (5 items)
  await createMenuItem(businessId, catDessertsId, {
    name: 'Molten Chocolate Lava Cake',
    description: 'Warm dark chocolate cake with a gooey flowing center and vanilla gelato',
    price: 199,
    isAvailable: true,
    sortOrder: 1,
    tags: ['Chef\'s Special', 'Bestseller'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Dark Chocolate', 'Butter', 'Tahitian Vanilla Gelato'],
  });

  await createMenuItem(businessId, catDessertsId, {
    name: 'Classic Tiramisu',
    description: 'Layers of espresso-soaked ladyfingers and creamy mascarpone cream',
    price: 229,
    isAvailable: true,
    sortOrder: 2,
    tags: ['Chef\'s Special'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Mascarpone', 'Espresso', 'Ladyfinger Biscuits', 'Cocoa Powder'],
  });

  await createMenuItem(businessId, catDessertsId, {
    name: 'Classic Brownie with Ice Cream',
    description: 'Fudgy walnut brownie served sizzling with Belgian chocolate drizzle',
    price: 189,
    isAvailable: true,
    sortOrder: 3,
    tags: ['Bestseller'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Dark Chocolate', 'Walnuts', 'Vanilla Ice Cream', 'Chocolate Fudge'],
  });

  await createMenuItem(businessId, catDessertsId, {
    name: 'Gulab Jamun with Rabri',
    description: 'Warm melt-in-the-mouth milk dumplings served on chilled saffron rabri',
    price: 149,
    isAvailable: true,
    sortOrder: 4,
    tags: ['Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Mawa', 'Sugar Syrup', 'Cardamom', 'Pistachios', 'Saffron Rabri'],
  });

  await createMenuItem(businessId, catDessertsId, {
    name: 'New York Cheesecake',
    description: 'Dense and creamy baked cheesecake with wild strawberry compote',
    price: 249,
    isAvailable: true,
    sortOrder: 5,
    tags: ['Bestseller'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Cream Cheese', 'Graham Cracker Crust', 'Strawberries'],
  });

  // Default QR codes
  await createQRCode(businessId, {
    type: 'menu',
    label: 'Table 1 (Menu QR)',
    targetUrl: `/m/thegreenplate?table=1`,
    tableNumber: '1',
    color: '#16A34A',
  });

  await createQRCode(businessId, {
    type: 'review',
    label: 'Bill / Checkout (Review QR)',
    targetUrl: `/r/thegreenplate`,
    tableNumber: 'Checkout',
    color: '#2563EB',
  });

  await createQRCode(businessId, {
    type: 'combined',
    label: 'Patio Standee (Combined QR)',
    targetUrl: `/q/thegreenplate`,
    tableNumber: 'Patio',
    color: '#171717',
  });
}

/**
 * Seeds a curated artisan bistro menu for "The Artisan Bistro" or any restaurant
 * with high quality photography, descriptions, dietary tags, and authentic prices.
 */
export async function seedArtisanBistroMenu(businessId: string): Promise<void> {
  // Update cover image if not set
  await updateBusiness(businessId, {
    coverImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&auto=format&fit=crop&q=80',
    googleRating: 4.8,
    ratingCount: 186,
  });

  // 1. Starters
  const catStartersId = await createCategory(businessId, {
    name: 'Starters',
    description: 'Crisp appetizers and farm-fresh garden plates to awaken your palate.',
    sortOrder: 1,
    isActive: true,
  });

  await createMenuItem(businessId, catStartersId, {
    name: 'Truffle Bruschetta',
    description: 'Grilled rustic sourdough with heirloom tomatoes, fresh sweet basil, and aged Modena truffle balsamic glaze.',
    price: 280,
    isAvailable: true,
    sortOrder: 1,
    tags: ['Bestseller', "Chef's Special", 'Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Sourdough', 'Heirloom Tomatoes', 'Black Truffle Glaze', 'Fresh Basil', 'Extra Virgin Olive Oil'],
  });

  await createMenuItem(businessId, catStartersId, {
    name: 'Burrata Caprese',
    description: 'Imported creamy burrata with vine-ripened Campari tomatoes, pine nut basil pesto, and Maldon flake salt.',
    price: 340,
    isAvailable: true,
    sortOrder: 2,
    tags: ['Bestseller', 'Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Puglia Burrata', 'Campari Tomatoes', 'Genovese Pesto', 'Pine Nuts', 'Focaccia Toast'],
  });

  await createMenuItem(businessId, catStartersId, {
    name: 'Crispy Calamari Fritti',
    description: 'Flash-fried coastal tender squid served with roasted garlic Meyer lemon aioli and pickled cherry peppers.',
    price: 320,
    isAvailable: true,
    sortOrder: 3,
    tags: ["Chef's Special"] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1604909052743-94e838986d24?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Calamari', 'Meyer Lemon Aioli', 'Cherry Peppers', 'Fresh Parsley'],
  });

  await createMenuItem(businessId, catStartersId, {
    name: 'Wild Mushroom Crostini',
    description: 'Sautéed morels, chanterelles, and cremini over toasted brioche with whipped thyme goat cheese.',
    price: 290,
    isAvailable: true,
    sortOrder: 4,
    tags: ['Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Wild Mushrooms', 'Artisan Brioche', 'Goat Cheese', 'Fresh Thyme', 'Truffle Essence'],
  });

  // 2. Main Course
  const catMainsId = await createCategory(businessId, {
    name: 'Main Course',
    description: 'Bronze-die extruded pasta, slow-simmered risotto, and wood-fired specialties.',
    sortOrder: 2,
    isActive: true,
  });

  await createMenuItem(businessId, catMainsId, {
    name: 'Pappardelle al Tartufo',
    description: 'Silky broad ribbon egg pasta tossed in black summer truffle cream, wild porcini, and 24-month Parmigiano.',
    price: 420,
    isAvailable: true,
    sortOrder: 1,
    tags: ['Bestseller', "Chef's Special", 'Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Fresh Pappardelle', 'Summer Truffle', 'Porcini Mushrooms', 'Parmigiano Reggiano', 'Cultured Butter'],
  });

  await createMenuItem(businessId, catMainsId, {
    name: 'Tagliolini Gamberi & Limone',
    description: 'Hand-cut thin pasta with wild jumbo tiger prawns, Sorrento lemon zest, garlic butter, and Calabrian chili.',
    price: 460,
    isAvailable: true,
    sortOrder: 2,
    tags: ["Chef's Special", 'Spicy'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Tiger Prawns', 'Tagliolini', 'Sorrento Lemon', 'White Wine', 'Calabrian Chili', 'Italian Parsley'],
  });

  await createMenuItem(businessId, catMainsId, {
    name: 'Saffron Mushroom Risotto',
    description: 'Creamy Carnaroli rice simmered in golden saffron vegetable fumet with crispy enoki and mascarpone.',
    price: 390,
    isAvailable: true,
    sortOrder: 3,
    tags: ['Vegetarian', 'Gluten-Free'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Carnaroli Rice', 'Spanish Saffron', 'Wild Mushrooms', 'Mascarpone', 'Pecorino'],
  });

  await createMenuItem(businessId, catMainsId, {
    name: 'Margherita Verace Pizza',
    description: '48-hour fermented sourdough crust, San Marzano D.O.P. tomatoes, buffalo mozzarella, and fresh basil.',
    price: 360,
    isAvailable: true,
    sortOrder: 4,
    tags: ['Bestseller', 'Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Sourdough Crust', 'San Marzano D.O.P.', 'Buffalo Mozzarella', 'Sweet Basil', 'Olive Oil'],
  });

  await createMenuItem(businessId, catMainsId, {
    name: 'Artisan Smoked Chicken',
    description: 'Free-range chicken breast roasted with rosemary honey butter, caramelized baby carrots, and pomme purée.',
    price: 420,
    isAvailable: true,
    sortOrder: 5,
    tags: ['Bestseller'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Organic Chicken Breast', 'Pomme Purée', 'Baby Carrots', 'Rosemary Jus'],
  });

  // 3. Beverages
  const catDrinksId = await createCategory(businessId, {
    name: 'Beverages',
    description: 'House-steeped iced teas, cold brews, and botanic zero-proof mocktails.',
    sortOrder: 3,
    isActive: true,
  });

  await createMenuItem(businessId, catDrinksId, {
    name: 'Smoked Rosemary Citrus Tonic',
    description: 'Torched rosemary sprig, freshly crushed blood orange, Mediterranean tonic, and aromatic bitters.',
    price: 210,
    isAvailable: true,
    sortOrder: 1,
    tags: ['Bestseller', 'Vegan'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Blood Orange', 'Mediterranean Tonic', 'Smoked Rosemary', 'Botanical Bitters'],
  });

  await createMenuItem(businessId, catDrinksId, {
    name: 'Iced Espresso Tonic',
    description: 'Double extraction Ethiopian Yirgacheffe poured over sparkling tonic and garnished with Meyer lemon peel.',
    price: 180,
    isAvailable: true,
    sortOrder: 2,
    tags: ["Chef's Special", 'Vegan'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Ethiopian Arabica Coffee', 'Sparkling Mineral Tonic', 'Meyer Lemon'],
  });

  // 4. Desserts
  const catDessertsId = await createCategory(businessId, {
    name: 'Desserts',
    description: 'Artisanal Italian pastries, gelato, and warm chocolate creations.',
    sortOrder: 4,
    isActive: true,
  });

  await createMenuItem(businessId, catDessertsId, {
    name: 'Classic Tiramisu',
    description: 'Espresso-soaked artisanal Savoiardi biscuits layered with cloud-like mascarpone sabayon and Valrhona cocoa.',
    price: 260,
    isAvailable: true,
    sortOrder: 1,
    tags: ['Bestseller', 'Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Savoiardi Biscuits', 'Espresso', 'Mascarpone', 'Marsala', 'Valrhona Cocoa Powder'],
  });

  await createMenuItem(businessId, catDessertsId, {
    name: 'Molten Lava Cake',
    description: 'Warm 70% dark chocolate cake with flowing molten center, served alongside Tahitian vanilla bean gelato.',
    price: 280,
    isAvailable: true,
    sortOrder: 2,
    tags: ["Chef's Special", 'Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
    ingredients: ['70% Valrhona Dark Chocolate', 'Tahitian Vanilla Gelato', 'Berry Coulis', 'Gold Leaf'],
  });
}

export const DEFAULT_DEMO_CATEGORIES = [
  { id: 'cat-starters', name: 'Starters', description: 'Crispy, flavorful appetizers to awaken your palate', sortOrder: 1, isActive: true },
  { id: 'cat-main', name: 'Main Course', description: 'Hearty, chef-crafted signature entrees & specialties', sortOrder: 2, isActive: true },
  { id: 'cat-beverages', name: 'Beverages', description: 'Chilled artisanal brews, mocktails & refreshing sodas', sortOrder: 3, isActive: true },
  { id: 'cat-desserts', name: 'Desserts', description: 'Decadent sweet endings made fresh in-house daily', sortOrder: 4, isActive: true },
];

export const DEFAULT_DEMO_ITEMS = [
  // Starters
  {
    id: 'item-1',
    name: 'Paneer Tikka',
    description: 'Grilled cottage cheese cubes marinated in aromatic tandoori spices, hung curd, and bell peppers.',
    price: 249,
    categoryId: 'cat-starters',
    isAvailable: true,
    sortOrder: 1,
    tags: ['Bestseller', 'Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Cottage Cheese', 'Bell Peppers', 'Hung Curd', 'Kashmiri Chili', 'Mint Chutney'],
  },
  {
    id: 'item-2',
    name: 'Truffle Bruschetta',
    description: 'Grilled rustic sourdough with heirloom tomatoes, fresh sweet basil, and aged Modena truffle balsamic glaze.',
    price: 280,
    categoryId: 'cat-starters',
    isAvailable: true,
    sortOrder: 2,
    tags: ['Bestseller', "Chef's Special", 'Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Sourdough', 'Heirloom Tomatoes', 'Black Truffle Glaze', 'Fresh Basil', 'Extra Virgin Olive Oil'],
  },
  {
    id: 'item-3',
    name: 'Veg Manchurian',
    description: 'Crispy golden vegetable dumplings tossed in ginger, garlic, spring onions, and light soy sauce.',
    price: 199,
    categoryId: 'cat-starters',
    isAvailable: true,
    sortOrder: 3,
    tags: ['Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Cabbage', 'Carrots', 'Garlic', 'Soy Sauce', 'Spring Onion'],
  },
  {
    id: 'item-4',
    name: 'Burrata Caprese',
    description: 'Imported creamy burrata with vine-ripened Campari tomatoes, pine nut basil pesto, and Maldon flake salt.',
    price: 340,
    categoryId: 'cat-starters',
    isAvailable: true,
    sortOrder: 4,
    tags: ['Bestseller', 'Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Puglia Burrata', 'Campari Tomatoes', 'Genovese Pesto', 'Pine Nuts', 'Focaccia Toast'],
  },
  {
    id: 'item-5',
    name: 'Crispy Spring Rolls',
    description: 'Thin crispy wrapper filled with wok-tossed glass noodles and crunchy Asian julienned vegetables.',
    price: 179,
    categoryId: 'cat-starters',
    isAvailable: true,
    sortOrder: 5,
    tags: ['Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Cabbage', 'Carrot', 'Bell Pepper', 'Spring Roll Pastry', 'Sweet Chili Dip'],
  },
  // Main Course
  {
    id: 'item-6',
    name: 'Pasta Alfredo',
    description: 'Creamy artisanal white sauce pasta with minced garlic, Italian mountain herbs, and 24-month parmesan.',
    price: 279,
    categoryId: 'cat-main',
    isAvailable: true,
    sortOrder: 1,
    tags: ['Bestseller', "Chef's Special", 'Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Pasta', 'cream', 'garlic', 'parmesan', 'herbs'],
  },
  {
    id: 'item-7',
    name: 'Paneer Butter Masala',
    description: 'Soft cottage cheese cubes simmered in a creamy, velvety tomato and cashew nut makhani gravy.',
    price: 299,
    categoryId: 'cat-main',
    isAvailable: true,
    sortOrder: 2,
    tags: ['Bestseller', 'Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Paneer', 'Roma Tomatoes', 'Cashew Cream', 'Butter', 'Kasoori Methi'],
  },
  {
    id: 'item-8',
    name: 'Margherita Verace Pizza',
    description: '48-hour fermented sourdough crust, San Marzano D.O.P. tomatoes, buffalo mozzarella, and fresh basil.',
    price: 329,
    categoryId: 'cat-main',
    isAvailable: true,
    sortOrder: 3,
    tags: ['Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Sourdough', 'San Marzano Tomatoes', 'Fresh Mozzarella', 'Basil', 'Olive Oil'],
  },
  {
    id: 'item-9',
    name: 'Dal Makhani',
    description: 'Slow-cooked whole black lentils simmered overnight with organic butter, cream, and ginger.',
    price: 249,
    categoryId: 'cat-main',
    isAvailable: true,
    sortOrder: 4,
    tags: ['Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Urad Dal', 'Butter', 'Cream', 'Ginger', 'Fenugreek'],
  },
  {
    id: 'item-10',
    name: 'Artisan Smoked Chicken',
    description: 'Free-range roasted chicken breast with rosemary honey butter, caramelized baby carrots, and pomme purée.',
    price: 347,
    categoryId: 'cat-main',
    isAvailable: true,
    sortOrder: 5,
    tags: ['Bestseller'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Organic Chicken Breast', 'Pomme Purée', 'Baby Carrots', 'Rosemary Jus'],
  },
  // Beverages
  {
    id: 'item-11',
    name: 'Signature Cold Brew',
    description: 'Steeped for 20 hours from single-origin Arabica beans, served cold with natural sweetness.',
    price: 169,
    categoryId: 'cat-beverages',
    isAvailable: true,
    sortOrder: 1,
    tags: ["Chef's Special"] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Single Origin Coffee', 'Ice Filtered Water'],
  },
  {
    id: 'item-12',
    name: 'Fresh Mint Lime Soda',
    description: 'Freshly squeezed Key limes with garden spearmint, sparkling mineral water, and black salt.',
    price: 129,
    categoryId: 'cat-beverages',
    isAvailable: true,
    sortOrder: 2,
    tags: ['Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Fresh Lime', 'Spearmint', 'Sparkling Soda', 'Black Salt'],
  },
  {
    id: 'item-13',
    name: 'Iced Peach Tea',
    description: 'Brewed premium Assam black tea infused with sweet white peach puree and fresh lemon slice.',
    price: 139,
    categoryId: 'cat-beverages',
    isAvailable: true,
    sortOrder: 3,
    tags: ['Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Black Tea', 'Peach Puree', 'Mint', 'Lemon'],
  },
  // Desserts
  {
    id: 'item-14',
    name: 'Molten Chocolate Lava Cake',
    description: 'Warm dark chocolate cake with a gooey flowing center and French vanilla bean ice cream.',
    price: 199,
    categoryId: 'cat-desserts',
    isAvailable: true,
    sortOrder: 1,
    tags: ["Chef's Special", 'Bestseller'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Dark Chocolate', 'Butter', 'Tahitian Vanilla Gelato'],
  },
  {
    id: 'item-15',
    name: 'Classic Tiramisu',
    description: 'Layers of espresso-soaked ladyfingers and velvety mascarpone sabayon dusted with dark cocoa.',
    price: 229,
    categoryId: 'cat-desserts',
    isAvailable: true,
    sortOrder: 2,
    tags: ["Chef's Special", 'Vegetarian'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Mascarpone', 'Espresso', 'Ladyfinger Biscuits', 'Cocoa Powder'],
  },
  {
    id: 'item-16',
    name: 'New York Cheesecake',
    description: 'Dense and creamy baked cheesecake with wild strawberry compote and graham crust.',
    price: 249,
    categoryId: 'cat-desserts',
    isAvailable: true,
    sortOrder: 3,
    tags: ['Bestseller'] as MenuItemTag[],
    imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Cream Cheese', 'Graham Cracker Crust', 'Strawberries'],
  },
];


