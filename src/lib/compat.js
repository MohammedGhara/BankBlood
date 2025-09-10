// src/lib/compat.js

// donors that can safely donate TO a given recipient type
const COMPATIBLE_DONORS = {
  'A+':  ['A+','A-','O+','O-'],
  'O+':  ['O+','O-'],
  'B+':  ['B+','B-','O+','O-'],
  'AB+': ['A+','A-','B+','B-','AB+','AB-','O+','O-'], // everyone donates to AB+
  'A-':  ['A-','O-'],
  'O-':  ['O-'],
  'B-':  ['B-','O-'],
  'AB-': ['AB-','A-','B-','O-'],
};

// Israel population distribution (approx. %) – higher = נפוץ יותר
const ISRAEL_DISTRIBUTION = {
  'O+': 32.0,
  'A+': 34.0,
  'B+': 17.0,
  'AB+': 7.0,
  'O-': 3.0,
  'A-': 4.0,
  'B-': 2.0,
  'AB-': 1.0,
};

/** get compatible donor types for a recipient */
function compatibleDonorsFor(recipientType) {
  return COMPATIBLE_DONORS[recipientType] || [];
}

/**
 * Choose alternative types ordered by:
 *  1) higher population share (נפוץ יותר → עדיף)
 *  2) then more available units
 * We exclude the originally requested type to suggest a true alternative.
 */
function rankAlternatives(recipientType, requestedType, inventoryRows) {
  const donors = compatibleDonorsFor(recipientType)
    .filter(t => t !== requestedType);

  const byType = Object.fromEntries(inventoryRows.map(r => [r.bloodType, Number(r.units||0)]));

  return donors
    .map(t => ({
      type: t,
      available: byType[t] || 0,
      popularity: ISRAEL_DISTRIBUTION[t] || 0,
    }))
    // prefer more common (desc), then more available (desc)
    .sort((a,b) => (b.popularity - a.popularity) || (b.available - a.available));
}

module.exports = {
  compatibleDonorsFor,
  rankAlternatives,
};
