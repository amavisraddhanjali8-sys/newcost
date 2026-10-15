/**
 * High-definition industrial & manufacturing image mapping for FXTT Grid Items
 * Supports Materials, Subcontractor Operations, Outsourced Services, Revenue Stream Produce Items, and Projects.
 * Includes local storage persistence so users can customize images on the fly.
 */

const LOCAL_STORAGE_IMAGE_KEY = 'fxtt_item_image_overrides';

// Curated high-resolution industrial photography (reliable Unsplash CDN)
export const CURATED_ITEM_IMAGES: Record<string, string> = {
  // MATERIALS
  'MAT-ALU-6061-T6': 'https://images.unsplash.com/photo-1535813547-99c456a41d4a?w=1200&auto=format&fit=crop&q=80',
  'MAT-TIT-GR5': 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=1200&auto=format&fit=crop&q=80',
  'MAT-SS-316L': 'https://images.unsplash.com/photo-1533158307587-828f0a76ef46?w=1200&auto=format&fit=crop&q=80',
  'MAT-STL-4140': 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=1200&auto=format&fit=crop&q=80',
  'MAT-CMP-CFRP': 'https://images.unsplash.com/photo-1508873696983-2df5293cb325?w=1200&auto=format&fit=crop&q=80',
  'MAT-POL-PEEK': 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1200&auto=format&fit=crop&q=80',
  'MAT-CU-C101': 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1200&auto=format&fit=crop&q=80',
  'MAT-OPT-QZ': 'https://images.unsplash.com/photo-1507499739999-097706ad8914?w=1200&auto=format&fit=crop&q=80',
  'MAT-INC-718': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80',
  'MAT-STR-WFB': 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=1200&auto=format&fit=crop&q=80',
  'MAT-NBR-SEAL': 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1200&auto=format&fit=crop&q=80',
  'MAT-TNG-W180': 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=1200&auto=format&fit=crop&q=80',

  // SUBCONTRACTOR SERVICES & LABOUR
  'SUB-CNC-5AX': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80',
  'SUB-EDM-WIRE': 'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=1200&auto=format&fit=crop&q=80',
  'SUB-LAT-TRN': 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=1200&auto=format&fit=crop&q=80',
  'SUB-HT-VAC': 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=1200&auto=format&fit=crop&q=80',
  'SUB-WLD-TIG': 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=1200&auto=format&fit=crop&q=80',
  'SUB-PVD-TIN': 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1200&auto=format&fit=crop&q=80',
  'SUB-CMM-INSP': 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1200&auto=format&fit=crop&q=80',
  'SUB-CLN-ASY': 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1200&auto=format&fit=crop&q=80',
  'SUB-AM-LPBF': 'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=1200&auto=format&fit=crop&q=80',
  'SUB-HYD-TST': 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=1200&auto=format&fit=crop&q=80',
  'SUB-NDT-UT': 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1200&auto=format&fit=crop&q=80',
  'SUB-BAL-DYN': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80',

  // OUTSOURCED SERVICES
  'OUT-PWR-HV': 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1200&auto=format&fit=crop&q=80',
  'OUT-TEL-FBR': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1200&auto=format&fit=crop&q=80',
  'OUT-LOG-FLT': 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1200&auto=format&fit=crop&q=80',
  'OUT-LAB-TEN': 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200&auto=format&fit=crop&q=80',
  'OUT-ENV-AUD': 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=1200&auto=format&fit=crop&q=80',
  'OUT-WST-REM': 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=1200&auto=format&fit=crop&q=80',
  'OUT-FIN-ESC': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=80',
  'OUT-LEG-REG': 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=1200&auto=format&fit=crop&q=80',
  'OUT-GAS-ARG': 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=1200&auto=format&fit=crop&q=80',
  'OUT-CRN-RIG': 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=1200&auto=format&fit=crop&q=80',
  'OUT-AIR-FRG': 'https://images.unsplash.com/photo-1519074069444-1ba4eae16e60?w=1200&auto=format&fit=crop&q=80',

  // REVENUE STREAM / PRODUCE ITEMS
  'PRD-STP-500-SRV': 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=1200&auto=format&fit=crop&q=80',
  'PRD-MIL-GNT-6AX': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80',
  'PRD-ROB-VIS-04': 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&auto=format&fit=crop&q=80',
  'PRD-ROB-PAL-D2': 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&auto=format&fit=crop&q=80',
  'PRD-FRN-VAC-1200': 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=1200&auto=format&fit=crop&q=80',
  'PRD-CLN-MOD-IS6': 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1200&auto=format&fit=crop&q=80',
  'PRD-LSR-CUT-10K': 'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=1200&auto=format&fit=crop&q=80',
  'PRD-AGV-FLT-08': 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&auto=format&fit=crop&q=80',
  'PRD-SFT-SCA-IOT': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80',
  'PRD-TUR-VAN-SOL': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',

  // PROJECTS
  'PRJ-2026-001': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80',
  'PRJ-2026-002': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
  'PRJ-2026-003': 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&auto=format&fit=crop&q=80',
  'PRJ-2026-004': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80'
};

// Generic archetype fallback photos
export const ARCHETYPE_FALLBACKS: Record<string, string> = {
  material: 'https://images.unsplash.com/photo-1535813547-99c456a41d4a?w=1200&auto=format&fit=crop&q=80',
  subcontractor: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80',
  service: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1200&auto=format&fit=crop&q=80',
  outsourced: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1200&auto=format&fit=crop&q=80',
  produce: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=1200&auto=format&fit=crop&q=80',
  product: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&auto=format&fit=crop&q=80',
  project: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80',
  supplier: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&auto=format&fit=crop&q=80'
};

/**
 * Retrieve user custom image overrides saved in localStorage
 */
export function getSavedImageOverrides(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_IMAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse item image overrides:', err);
    return {};
  }
}

/**
 * Save user custom image override for a specific item code or ID
 */
export function saveItemImageOverride(itemIdOrCode: string, imageUrl: string): void {
  if (typeof window === 'undefined' || !itemIdOrCode) return;
  try {
    const current = getSavedImageOverrides();
    current[itemIdOrCode.trim()] = imageUrl.trim();
    localStorage.setItem(LOCAL_STORAGE_IMAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('fxtt-image-updated', { 
      detail: { idOrCode: itemIdOrCode.trim(), imageUrl: imageUrl.trim() } 
    }));
  } catch (err) {
    console.error('Failed to save item image override:', err);
  }
}

/**
 * Remove user custom image override to restore default system image
 */
export function removeItemImageOverride(itemIdOrCode: string): void {
  if (typeof window === 'undefined' || !itemIdOrCode) return;
  try {
    const current = getSavedImageOverrides();
    const key = itemIdOrCode.trim();
    if (current[key]) {
      delete current[key];
      localStorage.setItem(LOCAL_STORAGE_IMAGE_KEY, JSON.stringify(current));
      window.dispatchEvent(new CustomEvent('fxtt-image-updated', { 
        detail: { idOrCode: key, reset: true } 
      }));
    }
  } catch (err) {
    console.error('Failed to remove item image override:', err);
  }
}

/**
 * Get authentic, high-definition image for any grid item
 */
export function getItemImageUrl(item: {
  id?: string;
  code?: string;
  name?: string;
  itemType?: string;
  classification?: string;
  category?: string;
  imageUrl?: string;
  rawItem?: any;
}): string {
  if (!item) return ARCHETYPE_FALLBACKS.material;

  // 1. Direct explicit image on the item
  if (item.imageUrl && item.imageUrl.trim().length > 5) {
    return item.imageUrl.trim();
  }
  if (item.rawItem?.imageUrl && item.rawItem.imageUrl.trim().length > 5) {
    return item.rawItem.imageUrl.trim();
  }

  // 2. Check localStorage overrides by code or ID
  const overrides = getSavedImageOverrides();
  const code = item.code?.trim();
  const id = item.id?.trim();

  if (code && overrides[code] && overrides[code].trim().length > 5) {
    return overrides[code].trim();
  }
  if (id && overrides[id] && overrides[id].trim().length > 5) {
    return overrides[id].trim();
  }

  // 3. Exact match in curated list by code
  if (code && CURATED_ITEM_IMAGES[code]) {
    return CURATED_ITEM_IMAGES[code];
  }

  // 4. Fuzzy code prefix or substring match
  if (code) {
    const upperCode = code.toUpperCase();
    for (const [key, url] of Object.entries(CURATED_ITEM_IMAGES)) {
      if (upperCode.includes(key) || key.includes(upperCode)) {
        return url;
      }
    }
    if (upperCode.startsWith('MAT-ALU') || upperCode.includes('ALU')) {
      return CURATED_ITEM_IMAGES['MAT-ALU-6061-T6'];
    }
    if (upperCode.startsWith('MAT-TIT') || upperCode.includes('TITAN')) {
      return CURATED_ITEM_IMAGES['MAT-TIT-GR5'];
    }
    if (upperCode.startsWith('MAT-SS') || upperCode.includes('STEEL')) {
      return CURATED_ITEM_IMAGES['MAT-SS-316L'];
    }
    if (upperCode.startsWith('SUB-CNC') || upperCode.includes('CNC')) {
      return CURATED_ITEM_IMAGES['SUB-CNC-5AX'];
    }
    if (upperCode.startsWith('SUB-EDM') || upperCode.includes('EDM')) {
      return CURATED_ITEM_IMAGES['SUB-EDM-WIRE'];
    }
    if (upperCode.startsWith('SUB-WLD') || upperCode.includes('WELD')) {
      return CURATED_ITEM_IMAGES['SUB-WLD-TIG'];
    }
    if (upperCode.startsWith('OUT-LOG') || upperCode.includes('FREIGHT')) {
      return CURATED_ITEM_IMAGES['OUT-LOG-FLT'];
    }
    if (upperCode.startsWith('OUT-PWR') || upperCode.includes('POWER')) {
      return CURATED_ITEM_IMAGES['OUT-PWR-HV'];
    }
    if (upperCode.startsWith('PRD-ROB') || upperCode.includes('ROBOT')) {
      return CURATED_ITEM_IMAGES['PRD-ROB-VIS-04'];
    }
    if (upperCode.startsWith('PRD-LSR') || upperCode.includes('LASER')) {
      return CURATED_ITEM_IMAGES['PRD-LSR-CUT-10K'];
    }
  }

  // 5. Contextual keyword match from Name & Category
  const searchStr = `${item.name || ''} ${item.category || ''}`.toLowerCase();
  if (searchStr.includes('aluminum') || searchStr.includes('alloy') || searchStr.includes('plate') || searchStr.includes('sheet')) {
    return CURATED_ITEM_IMAGES['MAT-ALU-6061-T6'];
  }
  if (searchStr.includes('titanium') || searchStr.includes('billet') || searchStr.includes('metal')) {
    return CURATED_ITEM_IMAGES['MAT-TIT-GR5'];
  }
  if (searchStr.includes('steel') || searchStr.includes('bar') || searchStr.includes('rod')) {
    return CURATED_ITEM_IMAGES['MAT-SS-316L'];
  }
  if (searchStr.includes('cnc') || searchStr.includes('machin') || searchStr.includes('milling')) {
    return CURATED_ITEM_IMAGES['SUB-CNC-5AX'];
  }
  if (searchStr.includes('welding') || searchStr.includes('tig') || searchStr.includes('heat treat')) {
    return CURATED_ITEM_IMAGES['SUB-WLD-TIG'];
  }
  if (searchStr.includes('edm') || searchStr.includes('laser')) {
    return CURATED_ITEM_IMAGES['SUB-EDM-WIRE'];
  }
  if (searchStr.includes('robot') || searchStr.includes('press') || searchStr.includes('press') || searchStr.includes('automation')) {
    return CURATED_ITEM_IMAGES['PRD-ROB-VIS-04'];
  }
  if (searchStr.includes('logistics') || searchStr.includes('freight') || searchStr.includes('transport')) {
    return CURATED_ITEM_IMAGES['OUT-LOG-FLT'];
  }
  if (searchStr.includes('telecom') || searchStr.includes('internet') || searchStr.includes('fiber') || searchStr.includes('network')) {
    return CURATED_ITEM_IMAGES['OUT-TEL-FBR'];
  }
  if (searchStr.includes('power') || searchStr.includes('electric') || searchStr.includes('grid')) {
    return CURATED_ITEM_IMAGES['OUT-PWR-HV'];
  }
  if (searchStr.includes('lab') || searchStr.includes('testing') || searchStr.includes('inspection') || searchStr.includes('cmm')) {
    return CURATED_ITEM_IMAGES['SUB-CMM-INSP'];
  }

  // 6. Archetype type fallback
  const typeKey = (item.itemType || item.classification || '').toLowerCase();
  if (typeKey.includes('material')) return ARCHETYPE_FALLBACKS.material;
  if (typeKey.includes('subcontractor') || typeKey.includes('labour')) return ARCHETYPE_FALLBACKS.subcontractor;
  if (typeKey.includes('service')) return ARCHETYPE_FALLBACKS.service;
  if (typeKey.includes('produce') || typeKey.includes('product')) return ARCHETYPE_FALLBACKS.produce;
  if (typeKey.includes('project')) return ARCHETYPE_FALLBACKS.project;

  return ARCHETYPE_FALLBACKS.material;
}
