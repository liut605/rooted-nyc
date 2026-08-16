/** Garden ids that have catalog or hardcoded photos. Used to size map pins. */
export const GARDENS_WITH_VISUALS = new Set([
  'B400-GT001',
  'B422-GT001',
  'B427-GT001',
  'BGT178',
  'M105-GT001',
  'M307-GT001',
  'M321-GT001',
  'M326-GT001',
  'M337-GT001',
  'M390-GT001',
  'M396-GT001',
  'MGT004',
  'MGT042',
  'MGT056',
  'MGT098',
  'Q300-GT001',
  'QGT013',
  'R123-GT001',
  'X293-GT001',
  'X345-GT001',
]);

export function gardenShowsPhotoPin(garden: {
  id?: string;
  propID?: string;
  hasVisuals?: boolean;
  name?: string;
}): boolean {
  if (garden.hasVisuals) return true;
  if (garden.id && GARDENS_WITH_VISUALS.has(garden.id)) return true;
  if (garden.propID && GARDENS_WITH_VISUALS.has(garden.propID)) return true;
  return /elizabeth\s+street/i.test(garden.name || '');
}
