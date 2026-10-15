import { TileTheme, getThemeById } from './tileThemes';

export interface CategoryNode {
  id: string;
  name: string;
  type: 'category' | 'sub_category' | 'sub_sub_category';
  group: 'material' | 'product' | 'service' | 'subcontractor' | 'outsourced';
  parentId?: string;
  parentName?: string;
  grandParentId?: string;
  grandParentName?: string;
  brief: string; // Few words/details
  itemCount?: number;
  themeId?: string;
  customGradient?: string;
  metaBadge?: string;
  actionText?: string;
  rateRange?: string;
  baseRate?: number;
  unit?: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  tagline: string; // concise
  industry: string;
  location: string;
  status: 'Active Partner' | 'Strategic Tier 1' | 'Key Account';
  activeProjectsCount: number;
  totalQuotedValue: number;
  contactPerson: string;
  email: string;
  themeId: string;
  customGradient?: string;
}

export const INITIAL_CLIENT_PROFILES: ClientProfile[] = [];

export const INITIAL_CATEGORY_HIERARCHY: CategoryNode[] = [];
