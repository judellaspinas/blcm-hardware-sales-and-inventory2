export const STANDARD_UNITS = [
  { value: 'Kilogram', label: 'Kilogram (Kg)', abbreviation: 'Kg' },
  { value: 'Gram', label: 'Gram (g)', abbreviation: 'g' },
  { value: 'Liter', label: 'Liter (L)', abbreviation: 'L' },
  { value: 'Milliliter', label: 'Milliliter (mL)', abbreviation: 'mL' },
  { value: 'Meter', label: 'Meter (m)', abbreviation: 'm' },
  { value: 'Centimeter', label: 'Centimeter (cm)', abbreviation: 'cm' },
  { value: 'Piece', label: 'Piece', abbreviation: 'pc' },
  { value: 'Gallon', label: 'Gallon (gal)', abbreviation: 'gal' },
  { value: 'Pound', label: 'Pound (lb)', abbreviation: 'lb' },
  { value: 'Ounce', label: 'Ounce (oz)', abbreviation: 'oz' },
  { value: 'Foot', label: 'Foot (ft)', abbreviation: 'ft' },
  { value: 'Inch', label: 'Inch (in)', abbreviation: 'in' },
];

export const SUB_CATEGORIES = [
  { value: 'Per Bottle', label: 'Per Bottle' },
  { value: 'Per Piece', label: 'Per Piece' },
  { value: 'Per Box', label: 'Per Box' },
  { value: 'Per Gallon', label: 'Per Gallon' },
  { value: 'Per Sachet/Pouch', label: 'Per Sachet/Pouch' },
  { value: 'Per Pack', label: 'Per Pack' },
  { value: 'Per Carton', label: 'Per Carton' },
  { value: 'Per Bag', label: 'Per Bag' },
  { value: 'Per Can', label: 'Per Can' },
  { value: 'Per Tube', label: 'Per Tube' },
];

/**
 * Get unit abbreviation by value
 * @param {string} unitValue - The unit value
 * @returns {string} - The abbreviation or the original value if not found
 */
export const getUnitAbbreviation = (unitValue) => {
  const unit = STANDARD_UNITS.find(u => u.value === unitValue);
  return unit ? unit.abbreviation : unitValue;
};

/**
 * Format product description with unit, amount, and sub-category
 * @param {Object} product - Product object
 * @returns {string} - Formatted description
 */
export const formatProductDescription = (product) => {
  if (!product.name) return '';
  
  const parts = [];
  
  if (product.amount && product.unit) {
    const unitAbbr = getUnitAbbreviation(product.unit);
    parts.push(`${product.amount}${unitAbbr}`);
  }
  
  parts.push(product.name);
  
  if (product.subCategory) {
    parts.push(`(${product.subCategory})`);
  }
  
  return parts.join(' ');
};


