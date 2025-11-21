/**
 * Root categories for supplier products
 * These match the categories in the database
 */
export const ROOT_CATEGORIES = [
  'Hand Tools',
  'Power Tools',
  'Fasteners & Fittings',
  'Electrical Supplies',
  'Plumbing Supplies',
  'Construction Materials',
  'Safety Gear',
  'Cleaning & Maintenance',
  'Outdoor & Garden',
  'Automotive & Industrial'
];

/**
 * Sub-categories (products) for each root category
 * Each category has 20 sub-categories
 */
export const SUB_CATEGORIES = {
  'Hand Tools': [
    'Hammers',
    'Screwdrivers',
    'Wrenches',
    'Pliers',
    'Saws',
    'Chisels',
    'Files & Rasps',
    'Measuring Tools',
    'Levels',
    'Clamps',
    'Vises',
    'Pry Bars',
    'Utility Knives',
    'Hand Drills',
    'Awls',
    'Snips',
    'Wire Strippers',
    'Tape Measures',
    'Squares',
    'Punches'
  ],
  'Power Tools': [
    'Drills',
    'Circular Saws',
    'Jigsaws',
    'Angle Grinders',
    'Orbital Sanders',
    'Rotary Tools',
    'Nail Guns',
    'Staplers',
    'Heat Guns',
    'Routers',
    'Planers',
    'Biscuit Joiners',
    'Miter Saws',
    'Table Saws',
    'Band Saws',
    'Chainsaws',
    'Impact Drivers',
    'Hammer Drills',
    'Multi-Tools',
    'Oscillating Tools'
  ],
  'Fasteners & Fittings': [
    'Screws',
    'Nails',
    'Bolts',
    'Nuts',
    'Washers',
    'Rivets',
    'Anchors',
    'Hooks',
    'Brackets',
    'Clips',
    'Rings',
    'Pins',
    'Clamps',
    'Cable Ties',
    'Wire Rope Clips',
    'Turnbuckles',
    'Eye Bolts',
    'U-Bolts',
    'Threaded Rods',
    'Studs'
  ],
  'Electrical Supplies': [
    'Wire & Cable',
    'Electrical Boxes',
    'Switches',
    'Outlets',
    'Circuit Breakers',
    'Fuses',
    'Wire Connectors',
    'Conduit',
    'Conduit Fittings',
    'Wire Nuts',
    'Cable Management',
    'Electrical Tape',
    'Wire Strippers',
    'Voltage Testers',
    'Multimeters',
    'GFCI Outlets',
    'Light Switches',
    'Dimmers',
    'Junction Boxes',
    'Cable Clamps'
  ],
  'Plumbing Supplies': [
    'Pipes',
    'Fittings',
    'Valves',
    'Faucets',
    'Showerheads',
    'Toilets',
    'Sinks',
    'Drains',
    'Traps',
    'Water Heaters',
    'Pumps',
    'Hoses',
    'Clamps',
    'Sealants',
    'Pipe Wrenches',
    'Plungers',
    'Augers',
    'Pipe Cutters',
    'Thread Seal Tape',
    'Pipe Insulation'
  ],
  'Construction Materials': [
    'Lumber',
    'Plywood',
    'Drywall',
    'Insulation',
    'Concrete',
    'Cement',
    'Rebar',
    'Wire Mesh',
    'Bricks',
    'Blocks',
    'Roofing Materials',
    'Siding',
    'Windows',
    'Doors',
    'Hardware',
    'Adhesives',
    'Caulk',
    'Paint',
    'Primer',
    'Stucco'
  ],
  'Safety Gear': [
    'Hard Hats',
    'Safety Glasses',
    'Face Shields',
    'Ear Protection',
    'Respirators',
    'Gloves',
    'Safety Vests',
    'Work Boots',
    'Knee Pads',
    'Fall Protection',
    'First Aid Kits',
    'Fire Extinguishers',
    'Warning Signs',
    'Barricades',
    'Lockout/Tagout',
    'Safety Harnesses',
    'Reflective Clothing',
    'Cut-Resistant Gear',
    'Welding Protection',
    'Emergency Equipment'
  ],
  'Cleaning & Maintenance': [
    'Brooms',
    'Mops',
    'Brushes',
    'Sponges',
    'Cleaning Cloths',
    'Detergents',
    'Degreasers',
    'Disinfectants',
    'Bleach',
    'Trash Bags',
    'Dustpans',
    'Squeegees',
    'Scrubbers',
    'Cleaning Carts',
    'Vacuum Bags',
    'Air Fresheners',
    'Paper Towels',
    'Hand Soap',
    'Floor Cleaners',
    'Window Cleaners'
  ],
  'Outdoor & Garden': [
    'Shovels',
    'Rakes',
    'Hoes',
    'Pruners',
    'Shears',
    'Lawn Mowers',
    'Trimmers',
    'Hedge Trimmers',
    'Garden Hoses',
    'Sprinklers',
    'Planters',
    'Pots',
    'Soil',
    'Fertilizers',
    'Seeds',
    'Garden Tools',
    'Wheelbarrows',
    'Garden Carts',
    'Outdoor Lighting',
    'Garden Decor'
  ],
  'Automotive & Industrial': [
    'Engine Oil',
    'Filters',
    'Brake Pads',
    'Belts',
    'Hoses',
    'Spark Plugs',
    'Batteries',
    'Tires',
    'Wheels',
    'Lubricants',
    'Grease',
    'Coolant',
    'Transmission Fluid',
    'Hydraulic Fluid',
    'Compressed Air Tools',
    'Welding Equipment',
    'Industrial Fasteners',
    'Bearings',
    'Seals',
    'Gaskets'
  ]
};

/**
 * Get sub-categories for a given root category
 * @param {string} rootCategory - The root category name
 * @returns {Array<string>} - Array of sub-category names
 */
export const getSubCategories = (rootCategory) => {
  return SUB_CATEGORIES[rootCategory] || [];
};

/**
 * Get formatted product supplied string
 * @param {string} rootCategory - The root category
 * @param {string} subCategory - The sub-category
 * @returns {string} - Formatted string (e.g., "Hand Tools - Hammers")
 */
export const formatProductSupplied = (rootCategory, subCategory) => {
  if (!rootCategory || !subCategory) return '';
  return `${rootCategory} - ${subCategory}`;
};

/**
 * Parse product supplied string back to root and sub category
 * @param {string} productSupplied - The formatted product supplied string
 * @returns {Object} - Object with rootCategory and subCategory
 */
export const parseProductSupplied = (productSupplied) => {
  if (!productSupplied) return { rootCategory: '', subCategory: '' };
  
  const parts = productSupplied.split(' - ');
  if (parts.length === 2) {
    return {
      rootCategory: parts[0].trim(),
      subCategory: parts[1].trim()
    };
  }
  
  // Fallback: if no separator, treat entire string as sub-category
  return { rootCategory: '', subCategory: productSupplied };
};

