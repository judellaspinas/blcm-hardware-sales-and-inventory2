/**
 * Generate default password based on configured format
 * @param {string} format - Password format: 'easy', 'medium', or 'hard'
 * @param {string} username - User's username (required for 'easy' format)
 * @param {string} firstName - User's first name (required for 'medium' and 'hard' formats)
 * @param {string} lastName - User's last name (required for 'medium' and 'hard' formats)
 * @returns {string|null} Generated password or null if required fields are missing
 */
export const generatePassword = (format, username, firstName, lastName) => {
  if (format === 'easy') {
    // Easy: $Username1
    if (!username) {
      return null;
    }
    const capitalizedUsername = username.charAt(0).toUpperCase() + username.slice(1);
    return `$${capitalizedUsername}1`;
  } else if (format === 'medium') {
    // Medium: Firstname.Lastname01
    if (!firstName || !lastName) {
      return null;
    }
    const formattedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    const formattedLastName = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
    return `${formattedFirstName}.${formattedLastName}01`;
  } else if (format === 'hard') {
    // Hard: Firstname.Lastname123
    if (!firstName || !lastName) {
      return null;
    }
    const formattedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    const formattedLastName = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
    return `${formattedFirstName}.${formattedLastName}123`;
  }
  
  return null;
};

