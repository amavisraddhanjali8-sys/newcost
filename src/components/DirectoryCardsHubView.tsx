import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Search,
  PlusCircle,
  FolderTree,
  Briefcase,
  Layers,
  Box,
  Truck,
  Building2,
  Users,
  ShieldCheck,
  ChevronRight,
  Filter,
  CheckCircle2,
  Palette,
  X,
  ExternalLink,
  ArrowLeft,
  Table,
  Plus,
  LayoutGrid,
  ListFilter,
  FolderPlus,
  FilePlus,
  DollarSign,
  Cpu,
  TrendingUp,
  PackageCheck,
  HardHat,
  SlidersHorizontal,
  ChevronDown,
  Wrench,
  Check,
  Clock,
  Award,
  Edit,
  History,
  Zap,
  Radio,
  Landmark,
  ShieldAlert,
  Scale,
  Percent,
  Trash2,
  Upload
} from 'lucide-react';
import { ModernTileCard } from './ModernTileCard';
import { ColorGradientPicker } from './ColorGradientPicker';
import { FXTTCardItemsListView } from './FXTTCardItemsListView';
import { DataImportExportModal } from './DataImportExportModal';
import { ImportEntityType } from '../utils/excelImport';
import { TILE_GRADIENT_PRESETS, getThemeById, getRandomThemeIndex } from '../data/tileThemes';
import {
  INITIAL_CLIENT_PROFILES,
  INITIAL_CATEGORY_HIERARCHY,
  CategoryNode,
  ClientProfile
} from '../data/categoriesAndProfiles';
import { persistentDatabase } from '../services/persistentDatabase';
import {
  Project,
  MaterialItem,
  Supplier,
  OutsourcedService,
  SubcontractorRateItem,
  ProduceItem,
  AppUser
} from '../types';
import {
  CreateCategoryModal,
  CreateSubCategoryModal,
  AddItemModal,
  EditItemModal,
  DeleteConfirmModal
} from './DirectoryCRUDModals';

export type DirectoryTab =
  | 'projects'
  | 'materials-hierarchy'
  | 'service-categories'
  | 'revenue-streams'
  | 'products-hierarchy'
  | 'services-hierarchy'
  | 'clients'
  | 'suppliers'
  | 'service-providers'
  | 'subcontractors';

export type RevenueStreamSubTab = 'products' | 'services';
export type ServiceCategorySubTab = 'subcontractor' | 'outsourced';

interface DirectoryCardsHubViewProps {
  projects: Project[];
  selectedProject: Project | null;
  materials: MaterialItem[];
  suppliers: Supplier[];
  outsourcedServices: OutsourcedService[];
  subcontractors: SubcontractorRateItem[];
  produceItems?: ProduceItem[];
  initialTab?: DirectoryTab;
  onSelectProject: (p: Project) => void;
  onNavigateToCostAnalysis: (p: Project) => void;
  onNavigateToProjectHome?: (p: Project) => void;
  onNavigateTab: (tabId: string) => void;
  onUpdateMaterialPrice?: (id: string, newPrice: number, reason: string) => void;
  onAddProject?: (p: Partial<Project>) => void;
  onUpdateProject?: (id: string, p: Partial<Project>) => void;
  onDeleteProject?: (id: string) => void;
  onAddMaterial?: (m: Partial<MaterialItem>) => void;
  onUpdateMaterial?: (id: string, m: Partial<MaterialItem>) => void;
  onDeleteMaterial?: (id: string) => void;
  onAddProduceItem?: (p: Partial<ProduceItem>) => void;
  onUpdateProduceItem?: (id: string, p: Partial<ProduceItem>) => void;
  onDeleteProduceItem?: (id: string) => void;
  onAddOutsourcedService?: (s: Partial<OutsourcedService>) => void;
  onUpdateOutsourcedService?: (id: string, s: Partial<OutsourcedService>) => void;
  onDeleteOutsourcedService?: (id: string) => void;
  onAddSupplier?: (s: Partial<Supplier>) => void;
  onUpdateSupplier?: (id: string, s: Partial<Supplier>) => void;
  onDeleteSupplier?: (id: string) => void;
  onAddSubcontractor?: (s: Partial<SubcontractorRateItem>) => void;
  onUpdateSubcontractor?: (id: string, s: Partial<SubcontractorRateItem>) => void;
  categories?: CategoryNode[];
  onUpdateCategories?: (cats: CategoryNode[]) => void;
  currentUser?: AppUser | null;
}

export const DirectoryCardsHubView: React.FC<DirectoryCardsHubViewProps> = ({
  projects,
  selectedProject,
  materials,
  suppliers,
  outsourcedServices,
  subcontractors,
  produceItems = [],
  categories: categoriesProp,
  onUpdateCategories,
  initialTab,
  onSelectProject,
  onNavigateToCostAnalysis,
  onNavigateToProjectHome,
  onNavigateTab,
  onUpdateMaterialPrice,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  onAddProduceItem,
  onUpdateProduceItem,
  onDeleteProduceItem,
  onAddOutsourcedService,
  onUpdateOutsourcedService,
  onDeleteOutsourcedService,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onAddSubcontractor,
  onUpdateSubcontractor,
  onDeleteSubcontractor,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<DirectoryTab>(initialTab || 'projects');
  const [revenueSubTab, setRevenueSubTab] = useState<RevenueStreamSubTab>('products');
  const [serviceSubTab, setServiceSubTab] = useState<ServiceCategorySubTab>('subcontractor');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Subcontractor & Outsourced view & drilldown states
  const [selectedSubcontractorCatId, setSelectedSubcontractorCatId] = useState<string | null>(null);
  const [selectedSubcontractorSubCatId, setSelectedSubcontractorSubCatId] = useState<string | null>(null);
  const [selectedOutsourcedCatId, setSelectedOutsourcedCatId] = useState<string | null>(null);
  const [selectedOutsourcedSubCatId, setSelectedOutsourcedSubCatId] = useState<string | null>(null);
  const [subcontractorViewMode, setSubcontractorViewMode] = useState<'hierarchy' | 'fxtt_grid' | 'items_table'>('hierarchy');
  const [outsourcedViewMode, setOutsourcedViewMode] = useState<'hierarchy' | 'fxtt_grid' | 'items_table'>('hierarchy');
  const [productViewMode, setProductViewMode] = useState<'hierarchy' | 'fxtt_grid' | 'items_table'>('hierarchy');
  const [isCommandsMenuOpen, setIsCommandsMenuOpen] = useState(false);

  // Dedicated states for Outsourced Services sub-portal
  const [outsourcedTableCategoryFilter, setOutsourcedTableCategoryFilter] = useState<string>('all');
  const [expandedOutsourcedHistoryIds, setExpandedOutsourcedHistoryIds] = useState<Set<string>>(new Set());
  const [expandedOutsourcedRangesIds, setExpandedOutsourcedRangesIds] = useState<Set<string>>(new Set());
  const [activeOutsourcedRateItem, setActiveOutsourcedRateItem] = useState<OutsourcedService | null>(null);
  const [activeOutsourcedAuditItem, setActiveOutsourcedAuditItem] = useState<OutsourcedService | null>(null);
  const [activeOutsourcedRangesItem, setActiveOutsourcedRangesItem] = useState<OutsourcedService | null>(null);

  const toggleOutsourcedHistory = (id: string) => {
    setExpandedOutsourcedHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleOutsourcedRanges = (id: string) => {
    setExpandedOutsourcedRangesIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Synchronize tabs if initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Synchronize revenue stream sub-tab if legacy tabs are requested
  useEffect(() => {
    if (activeTab === 'services-hierarchy') {
      setRevenueSubTab('services');
    } else if (activeTab === 'products-hierarchy') {
      setRevenueSubTab('products');
    }
  }, [activeTab]);

  // Reactive state for categories hierarchy & client profiles (persisted to central database)
  const [categories, setCategories] = useState<CategoryNode[]>(() => {
    if (categoriesProp && categoriesProp.length > 0) return categoriesProp;
    return persistentDatabase.getCategories();
  });
  const [clientProfiles, setClientProfiles] = useState<ClientProfile[]>(INITIAL_CLIENT_PROFILES);

  // Synchronize when parent prop updates
  useEffect(() => {
    if (categoriesProp && categoriesProp.length > 0) {
      setCategories(categoriesProp);
    }
  }, [categoriesProp]);

  // Sync categories mutations to persistent database
  useEffect(() => {
    if (categories && categories.length > 0) {
      persistentDatabase.saveCategories(categories);
      onUpdateCategories?.(categories);
    }
  }, [categories, onUpdateCategories]);

  // Time-aware greeting for user
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Dynamic theme overrides so user can change colors of any tile on the fly (persisted to localStorage)
  const [themeOverrides, setThemeOverrides] = useState<Record<string, { themeId: string; customGradient?: string }>>(() => {
    try {
      const saved = localStorage.getItem('fxtt_tile_theme_overrides');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      'proj-01': { themeId: 'airbus-cobalt' },
      'proj-02': { themeId: 'pacific-sky' },
      'mat-cat-01': { themeId: 'pacific-sky' },
      'mat-cat-02': { themeId: 'napa-purple' },
      'client-01': { themeId: 'airbus-cobalt' },
      'client-02': { themeId: 'midnight-space' },
      'sup-01': { themeId: 'pacific-sky' },
      'sup-02': { themeId: 'sunset-amber' },
      'sub-01': { themeId: 'polymer-slate' },
      'serv-cat-01': { themeId: 'sunset-amber' }
    };
  });

  // Hierarchy drill-down states for 3-tier browsing
  const [selectedMaterialCatId, setSelectedMaterialCatId] = useState<string | null>(null);
  const [selectedMaterialSubCatId, setSelectedMaterialSubCatId] = useState<string | null>(null);

  const [selectedProductCatId, setSelectedProductCatId] = useState<string | null>(null);
  const [selectedProductSubCatId, setSelectedProductSubCatId] = useState<string | null>(null);

  const [selectedServiceCatId, setSelectedServiceCatId] = useState<string | null>(null);

  // Modal: Create New Tile / Card (Generic)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<
    'project' | 'material-category' | 'product-category' | 'service-category' | 'client' | 'supplier' | 'service-provider' | 'subcontractor'
  >('project');
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardTag, setNewCardTag] = useState('PROJECT');
  const [newCardBrief, setNewCardBrief] = useState('');
  const [newCardAction, setNewCardAction] = useState('READ NOW');
  const [newCardThemeId, setNewCardThemeId] = useState('pacific-sky');
  const [newCardCustomGradient, setNewCardCustomGradient] = useState<string | undefined>();

  // DEDICATED CRUD MODALS STATE
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const [createCategoryGroup, setCreateCategoryGroup] = useState<'material' | 'product' | 'service'>('material');

  const [isCreateSubCategoryModalOpen, setIsCreateSubCategoryModalOpen] = useState(false);
  const [createSubCategoryGroup, setCreateSubCategoryGroup] = useState<'material' | 'product' | 'service'>('material');

  // Dedicated Bulk Import Modal State (Master dataset or Subcategory-wise)
  const [bulkImportConfig, setBulkImportConfig] = useState<{
    isOpen: boolean;
    targetType: ImportEntityType;
    categoryScope?: string;
    subCategoryScope?: string;
  } | null>(null);
  const [createSubCategoryParentId, setCreateSubCategoryParentId] = useState<string | undefined>();

  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [addItemPortal, setAddItemPortal] = useState<string>('materials-hierarchy');

  const [editModalData, setEditModalData] = useState<{
    isOpen: boolean;
    itemType: string;
    id: string;
    initialData: Record<string, any>;
  } | null>(null);

  const [deleteModalData, setDeleteModalData] = useState<{
    isOpen: boolean;
    title: string;
    entityType: string;
    onConfirm: () => void;
  } | null>(null);

  // Custom User-Created Tiles State (persisted to central database)
  const [customTiles, setCustomTiles] = useState<
    Array<{
      id: string;
      group: DirectoryTab;
      tag: string;
      title: string;
      brief: string;
      action: string;
      themeId: string;
      customGradient?: string;
    }>
  >(() => persistentDatabase.getCustomTiles([]));

  // Sync customTiles mutations to persistent database
  useEffect(() => {
    persistentDatabase.saveCustomTiles(customTiles);
  }, [customTiles]);

  // Card Detail Quick Modal
  const [activeDetailItem, setActiveDetailItem] = useState<{
    title: string;
    tag: string;
    themeId: string;
    customGradient?: string;
    description: string;
    attributes: Array<{ label: string; value: string }>;
    primaryActionText?: string;
    onPrimaryAction?: () => void;
    onOpenListView?: () => void;
  } | null>(null);

  // Active Card for FXTT CRM List View Modal / Dedicated Grid View
  const [activeFXTTCard, setActiveFXTTCard] = useState<{
    cardType:
      | 'material_category'
      | 'product_category'
      | 'service_category'
      | 'service_provider'
      | 'outsourced'
      | 'supplier'
      | 'project'
      | 'subcontractor'
      | 'client'
      | 'produce';
    cardId?: string;
    cardTitle: string;
    cardSubtitle?: string;
    cardTag?: string;
  } | null>(null);

  // Color change handler
  const handleUpdateTileTheme = (cardId: string, newThemeId: string, customGrad?: string) => {
    setThemeOverrides((prev) => {
      const updated = {
        ...prev,
        [cardId]: { themeId: newThemeId, customGradient: customGrad }
      };
      try {
        localStorage.setItem('fxtt_tile_theme_overrides', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    const proj = projects.find((p) => p.id === cardId);
    if (proj && onUpdateProject) {
      onUpdateProject(cardId, {
        ...proj,
        themeId: newThemeId,
        customGradient: customGrad
      });
    }
  };

  const getTileStyle = (cardId: string, defaultThemeId: string) => {
    const override = themeOverrides[cardId];
    if (override) {
      return { themeId: override.themeId, customGradient: override.customGradient };
    }
    const proj = projects.find((p) => p.id === cardId);
    if (proj && (proj.themeId || proj.customGradient)) {
      return { themeId: proj.themeId || defaultThemeId, customGradient: proj.customGradient };
    }
    return { themeId: defaultThemeId };
  };

  // CRUD Handlers
  const handleSaveCategory = (nodeData: Partial<CategoryNode>) => {
    const newNode: CategoryNode = {
      id: `cat-${Date.now()}`,
      name: nodeData.name || 'New Category',
      type: 'category',
      group: nodeData.group || createCategoryGroup,
      brief: nodeData.brief || 'Category catalog branch',
      itemCount: 0,
      themeId: nodeData.themeId || 'pacific-sky',
      customGradient: nodeData.customGradient,
      metaBadge: 'CATALOG ROOT',
      actionText: 'EXPLORE SUB-CATEGORIES'
    };
    persistentDatabase.addCategory(newNode);
    setCategories((prev) => [newNode, ...prev.filter((c) => c.id !== newNode.id)]);
    onUpdateCategories?.([newNode, ...categories]);
  };

  const handleSaveSubCategory = (nodeData: Partial<CategoryNode>) => {
    const newNode: CategoryNode = {
      id: `subcat-${Date.now()}`,
      name: nodeData.name || 'New Sub-Category',
      type: 'sub_category',
      group: nodeData.group || createSubCategoryGroup,
      parentId: nodeData.parentId,
      parentName: nodeData.parentName,
      brief: nodeData.brief || 'Sub-category classification',
      itemCount: 0,
      themeId: nodeData.themeId || 'napa-purple',
      customGradient: nodeData.customGradient,
      metaBadge: 'SUB-CATEGORY',
      actionText: 'VIEW DEEP SPECS'
    };
    persistentDatabase.addCategory(newNode);
    setCategories((prev) => [newNode, ...prev.filter((c) => c.id !== newNode.id)]);
    onUpdateCategories?.([newNode, ...categories]);
  };

  const handleSaveItem = (entityType: string, itemData: any) => {
    if (entityType === 'material' && onAddMaterial) {
      onAddMaterial(itemData);
    } else if (entityType === 'produce' && onAddProduceItem) {
      onAddProduceItem(itemData);
    } else if (entityType === 'outsourced' && onAddOutsourcedService) {
      onAddOutsourcedService(itemData);
    } else if (entityType === 'project' && onAddProject) {
      onAddProject(itemData);
    } else if (entityType === 'supplier' && onAddSupplier) {
      onAddSupplier(itemData);
    } else if (entityType === 'subcontractor' && onAddSubcontractor) {
      onAddSubcontractor(itemData);
    } else if (entityType === 'client') {
      const newClient: ClientProfile = {
        id: `client-${Date.now()}`,
        name: itemData.name,
        tagline: itemData.tagline || 'Strategic Enterprise Partner',
        industry: itemData.industry || 'Manufacturing',
        location: itemData.location || 'Global',
        status: itemData.status || 'Active Partner',
        activeProjectsCount: 1,
        totalQuotedValue: itemData.totalQuotedValue || 250000,
        contactPerson: itemData.contactPerson || 'Procurement Executive',
        email: itemData.email || 'partner@enterprise.com',
        themeId: 'airbus-cobalt'
      };
      setClientProfiles((prev) => [newClient, ...prev]);
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (itemType: string, id: string, initialData: Record<string, any>) => {
    setEditModalData({
      isOpen: true,
      itemType,
      id,
      initialData
    });
  };

  // Save Edit Dialog
  const handleSaveEdit = (id: string, updatedData: Record<string, any>) => {
    if (!editModalData) return;
    const { itemType } = editModalData;

    if (itemType === 'category' || itemType === 'sub_category' || itemType === 'sub_sub_category') {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                name: updatedData.name || updatedData.title || c.name,
                brief: updatedData.brief || c.brief
              }
            : c
        )
      );
    } else if (itemType === 'client') {
      setClientProfiles((prev) =>
        prev.map((cl) =>
          cl.id === id
            ? {
                ...cl,
                name: updatedData.name || updatedData.title || cl.name,
                tagline: updatedData.tagline || cl.tagline,
                industry: updatedData.industry || cl.industry,
                location: updatedData.location || cl.location,
                status: updatedData.status || cl.status,
                totalQuotedValue: updatedData.totalQuotedValue ?? cl.totalQuotedValue,
                contactPerson: updatedData.contactPerson || cl.contactPerson,
                email: updatedData.email || cl.email
              }
            : cl
        )
      );
    } else if (itemType === 'project' && onUpdateProject) {
      if (updatedData.themeId || updatedData.customGradient) {
        handleUpdateTileTheme(id, updatedData.themeId, updatedData.customGradient);
      }
      onUpdateProject(id, updatedData);
    } else if (itemType === 'material' && onUpdateMaterial) {
      onUpdateMaterial(id, updatedData);
    } else if (itemType === 'produce' && onUpdateProduceItem) {
      onUpdateProduceItem(id, updatedData);
    } else if (itemType === 'service-provider' && onUpdateOutsourcedService) {
      onUpdateOutsourcedService(id, updatedData);
    } else if (itemType === 'supplier' && onUpdateSupplier) {
      onUpdateSupplier(id, updatedData);
    } else if (itemType === 'subcontractor' && onUpdateSubcontractor) {
      onUpdateSubcontractor(id, updatedData);
    } else if (itemType === 'custom-tile') {
      setCustomTiles((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                title: updatedData.title || t.title,
                brief: updatedData.brief || t.brief
              }
            : t
        )
      );
    }
  };

  // Open Delete Dialog
  const handleOpenDelete = (entityType: string, id: string, title: string, portalTab: DirectoryTab) => {
    setDeleteModalData({
      isOpen: true,
      title,
      entityType,
      onConfirm: () => {
        if (entityType === 'Category' || entityType === 'Sub-Category' || entityType === 'Deep Spec') {
          setCategories((prev) => prev.filter((c) => c.id !== id && c.parentId !== id));
        } else if (portalTab === 'projects' && onDeleteProject) {
          onDeleteProject(id);
        } else if (portalTab === 'clients') {
          setClientProfiles((prev) => prev.filter((cl) => cl.id !== id));
        } else if (portalTab === 'suppliers' && onDeleteSupplier) {
          onDeleteSupplier(id);
        } else if (portalTab === 'service-providers' && onDeleteOutsourcedService) {
          onDeleteOutsourcedService(id);
        } else if (portalTab === 'subcontractors' && onDeleteSubcontractor) {
          onDeleteSubcontractor(id);
        } else if (portalTab === 'materials-hierarchy' && onDeleteMaterial) {
          onDeleteMaterial(id);
        } else if ((portalTab === 'products-hierarchy' || portalTab === 'revenue-streams') && onDeleteProduceItem) {
          onDeleteProduceItem(id);
        } else {
          setCustomTiles((prev) => prev.filter((t) => t.id !== id));
        }
      }
    });
  };

  // Duplicate Handler
  const handleDuplicate = (itemType: string, id: string) => {
    if (itemType === 'category' || itemType === 'sub_category' || itemType === 'sub_sub_category') {
      const match = categories.find((c) => c.id === id);
      if (match) {
        const copy: CategoryNode = {
          ...match,
          id: `cat-copy-${Date.now()}`,
          name: `${match.name} (Copy)`
        };
        setCategories((prev) => [copy, ...prev]);
      }
    } else if (itemType === 'client') {
      const match = clientProfiles.find((c) => c.id === id);
      if (match) {
        const copy: ClientProfile = {
          ...match,
          id: `client-copy-${Date.now()}`,
          name: `${match.name} (Copy)`
        };
        setClientProfiles((prev) => [copy, ...prev]);
      }
    } else if (itemType === 'project' && onAddProject) {
      const match = projects.find((p) => p.id === id);
      if (match) {
        onAddProject({
          ...match,
          code: `${match.code}-CPY`,
          name: `${match.name} (Copy)`
        });
      }
    } else if (itemType === 'supplier' && onAddSupplier) {
      const match = suppliers.find((s) => s.id === id);
      if (match) {
        onAddSupplier({
          ...match,
          name: `${match.name} (Copy)`
        });
      }
    } else if (itemType === 'service-provider' && onAddOutsourcedService) {
      const match = outsourcedServices.find((s) => s.id === id);
      if (match) {
        onAddOutsourcedService({
          ...match,
          providerName: `${match.providerName} (Copy)`
        });
      }
    } else if (itemType === 'subcontractor' && onAddSubcontractor) {
      const match = subcontractors.find((s) => s.id === id);
      if (match) {
        onAddSubcontractor({
          ...match,
          subcontractorName: `${match.subcontractorName} (Copy)`
        });
      }
    } else if (itemType === 'custom-tile') {
      const match = customTiles.find((t) => t.id === id);
      if (match) {
        setCustomTiles((prev) => [
          {
            ...match,
            id: `custom-tile-${Date.now()}`,
            title: `${match.title} (Copy)`
          },
          ...prev
        ]);
      }
    }
  };

  // List of unique Outsourced Service Provider entities
  const outsourcedProvidersList = useMemo(() => {
    const list: Array<{
      id: string;
      providerId: string;
      name: string;
      category: string;
      city: string;
      country: string;
      contactPerson: string;
      email: string;
      phone: string;
      paymentTerms: string;
      rating: number;
      qualityScorePct: number;
      slaLevel: string;
      services: typeof outsourcedServices;
    }> = [];

    const seenNames = new Set<string>();

    // 1. Check suppliers that specialize in Outsourced Services
    suppliers
      .filter((s) => s.category === 'Outsourced' || s.supplyScope === 'service' || s.supplyScope === 'hybrid' || s.name.toLowerCase().includes('logistics') || s.name.toLowerCase().includes('freight'))
      .forEach((sup) => {
        const svcs = outsourcedServices.filter(
          (o) =>
            o.providerId === sup.id ||
            o.providerName.toLowerCase().trim() === sup.name.toLowerCase().trim() ||
            o.providerName.toLowerCase().includes(sup.name.toLowerCase()) ||
            sup.name.toLowerCase().includes(o.providerName.toLowerCase())
        );
        seenNames.add(sup.name.toLowerCase().trim());
        list.push({
          id: sup.id,
          providerId: sup.id,
          name: sup.name,
          category: sup.category || 'Outsourced Logistics & Freight',
          city: sup.city || 'Regional Hub',
          country: sup.country || 'United States',
          contactPerson: sup.contactPerson || 'Logistics Coordinator',
          email: sup.email || 'contracts@outsourced-provider.com',
          phone: sup.phone || '+1 (800) 555-0199',
          paymentTerms: sup.paymentTerms || 'Net 30',
          rating: sup.rating || 4.8,
          qualityScorePct: sup.qualityScorePct || 99.0,
          slaLevel: svcs[0]?.slaLevel || 'Tier-1 SLA (99.5%)',
          services: svcs
        });
      });

    // 2. Also register any unique providerName from outsourcedServices not yet in list
    outsourcedServices.forEach((svc) => {
      const nameClean = (svc.providerName || '').trim();
      if (nameClean && !seenNames.has(nameClean.toLowerCase())) {
        seenNames.add(nameClean.toLowerCase());
        const matchingSup = suppliers.find(
          (s) =>
            s.id === svc.providerId ||
            s.name.toLowerCase().trim() === nameClean.toLowerCase() ||
            s.name.toLowerCase().includes(nameClean.toLowerCase()) ||
            nameClean.toLowerCase().includes(s.name.toLowerCase())
        );
        const svcs = outsourcedServices.filter(
          (o) =>
            (svc.providerId && o.providerId === svc.providerId) ||
            o.providerName.toLowerCase().trim() === nameClean.toLowerCase()
        );
        list.push({
          id: svc.providerId || `prov-${nameClean.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          providerId: svc.providerId || `prov-${nameClean.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: nameClean,
          category: svc.category || 'Outsourced Processing & Transport',
          city: matchingSup?.city || 'Regional Terminal',
          country: matchingSup?.country || (svc as any).country || 'United States',
          contactPerson: matchingSup?.contactPerson || 'Operations Lead',
          email: matchingSup?.email || (svc as any).contactEmail || `contracts@${nameClean.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          phone: matchingSup?.phone || (svc as any).contactPhone || '+1 (800) 555-0199',
          paymentTerms: matchingSup?.paymentTerms || 'Net 30 / Escrow',
          rating: matchingSup?.rating || 4.8,
          qualityScorePct: matchingSup?.qualityScorePct || 99.2,
          slaLevel: svc.slaLevel || 'Tier-1 SLA (99.5%)',
          services: svcs
        });
      }
    });

    return list;
  }, [suppliers, outsourcedServices]);

  // List of unique Subcontractor Partner entities
  const subcontractorsList = useMemo(() => {
    const list: Array<{
      id: string;
      subcontractorId: string;
      name: string;
      serviceCategory: string;
      serviceType: string;
      skillLevel: string;
      city: string;
      country: string;
      contactPerson: string;
      email: string;
      phone: string;
      paymentTerms: string;
      rating: number;
      qualityScorePct: number;
      ratesCount: number;
      subcontractorItems: typeof subcontractors;
    }> = [];

    const seenNames = new Set<string>();

    // 1. Register all unique subcontractors from authoritative subcontractors dataset
    subcontractors.forEach((sub) => {
      const nameClean = (sub.subcontractorName || '').trim();
      if (nameClean && !seenNames.has(nameClean.toLowerCase())) {
        seenNames.add(nameClean.toLowerCase());

        const subItems = subcontractors.filter(
          (s) =>
            (sub.subcontractorId && s.subcontractorId === sub.subcontractorId) ||
            s.subcontractorName.toLowerCase().trim() === nameClean.toLowerCase()
        );

        const matchingSup = suppliers.find(
          (s) =>
            s.id === sub.subcontractorId ||
            s.name.toLowerCase().trim() === nameClean.toLowerCase() ||
            s.name.toLowerCase().includes(nameClean.toLowerCase()) ||
            nameClean.toLowerCase().includes(s.name.toLowerCase())
        );

        list.push({
          id: sub.subcontractorId || `sub-${nameClean.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          subcontractorId: sub.subcontractorId || `sub-${nameClean.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: nameClean,
          serviceCategory: sub.serviceCategory || 'Specialist Fabrication & Machining',
          serviceType: sub.serviceType || 'Trade Subcontractor',
          skillLevel: sub.skillLevel || 'Certified Master Crew',
          city: matchingSup?.city || 'Detroit, MI',
          country: matchingSup?.country || (sub as any).country || 'United States',
          contactPerson: matchingSup?.contactPerson || 'Field Operations Lead',
          email: matchingSup?.email || (sub as any).contactEmail || `dispatch@${nameClean.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          phone: matchingSup?.phone || (sub as any).contactPhone || '+1 (800) 555-0188',
          paymentTerms: matchingSup?.paymentTerms || 'Milestone Progress Billing',
          rating: matchingSup?.rating || 4.9,
          qualityScorePct: matchingSup?.qualityScorePct || 99.4,
          ratesCount: subItems.length,
          subcontractorItems: subItems
        });
      }
    });

    // 2. Also register any supplier with category === 'Subcontractor' not already registered
    suppliers
      .filter((s) => s.category === 'Subcontractor' && !seenNames.has(s.name.toLowerCase().trim()))
      .forEach((sup) => {
        const subItems = subcontractors.filter(
          (s) =>
            s.subcontractorId === sup.id ||
            s.subcontractorName.toLowerCase().trim() === sup.name.toLowerCase().trim() ||
            s.subcontractorName.toLowerCase().includes(sup.name.toLowerCase()) ||
            sup.name.toLowerCase().includes(s.subcontractorName.toLowerCase())
        );

        if (subItems.length > 0) {
          seenNames.add(sup.name.toLowerCase().trim());
          list.push({
            id: sup.id,
            subcontractorId: sup.id,
            name: sup.name,
            serviceCategory: subItems[0]?.serviceCategory || sup.category || 'Specialist Fabrication & Machining',
            serviceType: subItems[0]?.serviceType || 'Specialist Trade Subcontractor',
            skillLevel: subItems[0]?.skillLevel || 'Certified Master Crew',
            city: sup.city || 'Detroit, MI',
            country: sup.country || 'United States',
            contactPerson: sup.contactPerson || 'Field Operations Lead',
            email: sup.email || 'crews@subcontractor.com',
            phone: sup.phone || '+1 (800) 555-0188',
            paymentTerms: sup.paymentTerms || 'Milestone Progress Billing',
            rating: sup.rating || 4.9,
            qualityScorePct: sup.qualityScorePct || 99.4,
            ratesCount: subItems.length,
            subcontractorItems: subItems
          });
        }
      });

    return list;
  }, [suppliers, subcontractors]);

  // Filter tabs definition with simple, concise words
  const navTabs: { id: DirectoryTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'projects', label: 'Projects', icon: <Briefcase className="w-3.5 h-3.5" />, count: projects.length },
    {
      id: 'materials-hierarchy',
      label: 'Materials',
      icon: <Layers className="w-3.5 h-3.5" />,
      count: categories.filter((c) => c.group === 'material' && c.type === 'category').length
    },
    {
      id: 'service-categories',
      label: 'Services',
      icon: <HardHat className="w-3.5 h-3.5" />,
      count: categories.filter((c) => (c.group === 'subcontractor' || c.group === 'outsourced') && c.type === 'category').length
    },
    {
      id: 'revenue-streams',
      label: 'Revenue',
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      count: categories.filter((c) => (c.group === 'product' || c.group === 'service') && c.type === 'category').length
    },
    { id: 'clients', label: 'Clients', icon: <Users className="w-3.5 h-3.5" />, count: clientProfiles.length },
    { id: 'suppliers', label: 'Suppliers', icon: <Building2 className="w-3.5 h-3.5" />, count: suppliers.length },
    { id: 'service-providers', label: 'Providers', icon: <ShieldCheck className="w-3.5 h-3.5" />, count: outsourcedProvidersList.length },
    { id: 'subcontractors', label: 'Subcontractors', icon: <FolderTree className="w-3.5 h-3.5" />, count: subcontractorsList.length }
  ];

  // Handler to submit generic new tile
  const handleCreateTileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;

    let targetGroup: DirectoryTab = 'projects';
    if (createType === 'material-category') targetGroup = 'materials-hierarchy';
    else if (createType === 'subcontractor-category') {
      targetGroup = 'service-categories';
      setServiceSubTab('subcontractor');
    }
    else if (createType === 'outsourced-category') {
      targetGroup = 'service-categories';
      setServiceSubTab('outsourced');
    }
    else if (createType === 'product-category') {
      targetGroup = 'revenue-streams';
      setRevenueSubTab('products');
    }
    else if (createType === 'service-category') {
      targetGroup = 'revenue-streams';
      setRevenueSubTab('services');
    }
    else if (createType === 'client') targetGroup = 'clients';
    else if (createType === 'supplier') targetGroup = 'suppliers';
    else if (createType === 'service-provider') targetGroup = 'service-providers';
    else if (createType === 'subcontractor') targetGroup = 'subcontractors';

    const newTile = {
      id: `custom-tile-${Date.now()}`,
      group: targetGroup,
      tag: newCardTag.toUpperCase() || 'CUSTOM CARD',
      title: newCardTitle,
      brief: newCardBrief || 'Enterprise Verified Specification',
      action: newCardAction || 'VIEW DETAILS',
      themeId: newCardThemeId,
      customGradient: newCardCustomGradient
    };

    const updatedTiles = [newTile, ...customTiles];
    setCustomTiles(updatedTiles);
    persistentDatabase.saveCustomTiles(updatedTiles);

    // If tile represents a category type, also create a CategoryNode in the hierarchy
    let catGroup: 'material' | 'product' | 'subcontractor' | 'service' | undefined;
    if (createType === 'material-category') catGroup = 'material';
    else if (createType === 'subcontractor-category') catGroup = 'subcontractor';
    else if (createType === 'outsourced-category') catGroup = 'service';
    else if (createType === 'product-category') catGroup = 'product';
    else if (createType === 'service-category') catGroup = 'service';

    if (catGroup) {
      const newCatNode: CategoryNode = {
        id: `cat-${Date.now()}`,
        name: newCardTitle,
        type: 'category',
        group: catGroup,
        brief: newCardBrief || 'Enterprise Verified Specification',
        itemCount: 0,
        themeId: newCardThemeId,
        customGradient: newCardCustomGradient,
        metaBadge: newCardTag || 'CATEGORY',
        actionText: 'VIEW ITEMS'
      };
      persistentDatabase.addCategory(newCatNode);
      setCategories((prev) => [newCatNode, ...prev]);
      onUpdateCategories?.([newCatNode, ...categories]);
    }

    setIsCreateModalOpen(false);
    setNewCardTitle('');
    setNewCardBrief('');
  };

  // Reusable renderer for user-created custom cards in any directory portal tab
  const renderCustomTilesForTab = (group: DirectoryTab, subtitleDefault: string = 'Enterprise Specification') => {
    const tiles = customTiles.filter((t) => t.group === group);
    if (tiles.length === 0) return null;
    return (
      <div className="space-y-3 pt-2">
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Custom Cards & Specifications ({tiles.length})
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiles.map((t) => (
            <ModernTileCard
              key={t.id}
              id={t.id}
              tag={t.tag}
              title={t.title}
              brief={t.brief}
              actionLabel={t.action}
              actionVariant="link"
              themeId={t.themeId}
              customGradient={t.customGradient}
              onChangeTheme={(tId, grad) => handleUpdateTileTheme(t.id, tId, grad)}
              onEdit={() =>
                handleOpenEdit('custom-tile', t.id, {
                  title: t.title,
                  brief: t.brief,
                  tag: t.tag
                })
              }
              onDelete={() => handleOpenDelete('Custom Tile', t.id, t.title, group)}
              onDuplicate={() => handleDuplicate('custom-tile', t.id)}
              onAction={() => {
                setActiveDetailItem({
                  title: t.title,
                  tag: t.tag,
                  themeId: t.themeId,
                  customGradient: t.customGradient,
                  description: t.brief
                });
              }}
              onViewListView={() => {
                setActiveFXTTCard({
                  cardType:
                    group === 'materials-hierarchy'
                      ? 'material_category'
                      : group === 'clients'
                      ? 'client'
                      : group === 'suppliers'
                      ? 'supplier'
                      : group === 'subcontractors'
                      ? 'subcontractor'
                      : group === 'service-providers'
                      ? 'service_provider'
                      : 'product_category',
                  cardId: t.id,
                  cardTitle: t.title,
                  cardSubtitle: t.brief || subtitleDefault,
                  cardTag: t.tag
                });
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-12 relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 z-50 bg-[#003049] border border-[#669bbc] text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-in slide-in-from-bottom-2 duration-150">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#fdf0d5] shrink-0" />
          <span className="text-xs font-normal text-white">{toastMsg}</span>
        </div>
      )}

      {/* 1. Header: Welcome Portal with Personal Greeting */}
      <div className="bg-white pt-2 pb-2 border-b border-slate-100 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span className="uppercase text-[#003049] font-normal tracking-wide">Enterprise Operations Portal</span>
            <span>•</span>
            <span className="text-emerald-700 font-normal">Active Session</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight flex flex-wrap items-center gap-2.5">
            <span>{getGreeting()}, {currentUser?.name || 'Innovista Imports'}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#fdf0d5] text-[#780000] border border-[#e5d8b8]">
              {currentUser?.role === 'ADMIN' ? 'Enterprise Lead' : 'Project Manager'}
            </span>
          </h1>
        </div>

        {/* Global Actions */}
        <div className="flex items-center space-x-2">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('item-grid')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-normal rounded-xl border border-slate-300 transition-colors shadow-2xs"
            >
              <Table className="w-3.5 h-3.5 text-emerald-600" />
              <span>CRM Item Grid</span>
            </button>
          )}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded-xl transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-[#fdf0d5]" />
            <span>Create Custom Tile</span>
          </button>
        </div>
      </div>

      {/* 2. Top Segmented Navigation Tabs */}
      <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto">
        <div className="flex space-x-1 min-w-max">
          {navTabs.map((tab) => {
            const isActive =
              activeTab === tab.id ||
              (tab.id === 'revenue-streams' &&
                (activeTab === 'products-hierarchy' || activeTab === 'services-hierarchy'));
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  // Reset drill-down
                  setSelectedMaterialCatId(null);
                  setSelectedMaterialSubCatId(null);
                  setSelectedProductCatId(null);
                  setSelectedProductSubCatId(null);
                  setSelectedServiceCatId(null);
                }}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs transition-all font-normal whitespace-nowrap ${
                  isActive
                    ? 'bg-[#003049] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className={isActive ? 'text-[#fdf0d5]' : 'text-slate-400'}>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-[#669bbc]/40 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2.5 REVENUE STREAMS SUB TABS: 'Products' & 'Services' */}
      {(activeTab === 'revenue-streams' || activeTab === 'products-hierarchy' || activeTab === 'services-hierarchy') && (
        <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center space-x-1.5 text-xs text-slate-700">
              <TrendingUp className="w-4 h-4 text-[#003049]" />
              <span className="font-bold text-slate-900 text-xs">Revenue Streams:</span>
            </div>

            {/* Segmented Sub-Tabs: 'Products' & 'Services' */}
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 gap-1">
              {/* 1. Products Sub-Tab */}
              <button
                type="button"
                id="subtab-revenue-products"
                onClick={() => {
                  setRevenueSubTab('products');
                  setSelectedProductCatId(null);
                  setSelectedProductSubCatId(null);
                }}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  revenueSubTab === 'products'
                    ? 'bg-[#003049] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Box className={`w-3.5 h-3.5 ${revenueSubTab === 'products' ? 'text-[#fdf0d5]' : 'text-slate-500'}`} />
                <span>Products</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    revenueSubTab === 'products' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {categories.filter((c) => c.group === 'product' && c.type === 'category').length}
                </span>
              </button>

              {/* 2. Services Sub-Tab */}
              <button
                type="button"
                id="subtab-revenue-services"
                onClick={() => {
                  setRevenueSubTab('services');
                  setSelectedServiceCatId(null);
                }}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  revenueSubTab === 'services'
                    ? 'bg-[#003049] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Truck className={`w-3.5 h-3.5 ${revenueSubTab === 'services' ? 'text-[#fdf0d5]' : 'text-slate-500'}`} />
                <span>Services</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    revenueSubTab === 'services' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {categories.filter((c) => c.group === 'service' && c.type === 'category').length}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2b. Sub-Portal Selector for Service Categories: Subcontractor vs Outsourced */}
      {activeTab === 'service-categories' && (
        <div className="bg-slate-100/80 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-1">
              Service:
            </span>
            <div className="inline-flex p-1 bg-slate-200/80 dark:bg-slate-700 rounded-lg space-x-1">
              {/* 1. Subcontractor Sub-Tab */}
              <button
                type="button"
                id="subtab-service-subcontractor"
                onClick={() => {
                  setServiceSubTab('subcontractor');
                  setSelectedSubcontractorCatId(null);
                  setSelectedSubcontractorSubCatId(null);
                }}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  serviceSubTab === 'subcontractor'
                    ? 'bg-[#0078d4] text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <HardHat className="w-3.5 h-3.5" />
                <span>Subcontractor</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    serviceSubTab === 'subcontractor' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {categories.filter((c) => c.group === 'subcontractor' && c.type === 'category').length}
                </span>
              </button>

              {/* 2. Outsourced Sub-Tab */}
              <button
                type="button"
                id="subtab-service-outsourced"
                onClick={() => {
                  setServiceSubTab('outsourced');
                  setSelectedOutsourcedCatId(null);
                  setSelectedOutsourcedSubCatId(null);
                }}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  serviceSubTab === 'outsourced'
                    ? 'bg-[#0078d4] text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Outsourced</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    serviceSubTab === 'outsourced' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {categories.filter((c) => c.group === 'outsourced' && c.type === 'category').length}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Refined Title Row - Simple UI like Home tab */}
      <div className="bg-white dark:bg-[#0b101b] px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3 relative">
        {/* Left: Portal Identity */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight tracking-tight truncate">
            {activeTab === 'projects' && 'Projects'}
            {activeTab === 'materials-hierarchy' && 'Materials'}
            {activeTab === 'service-categories' && (
              serviceSubTab === 'subcontractor' ? 'Subcontractors' : 'Outsourced'
            )}
            {(activeTab === 'revenue-streams' || activeTab === 'products-hierarchy' || activeTab === 'services-hierarchy') && (
              revenueSubTab === 'products' ? 'Products' : 'Services'
            )}
            {activeTab === 'clients' && 'Clients'}
            {activeTab === 'suppliers' && 'Suppliers'}
            {activeTab === 'service-providers' && 'Providers'}
            {activeTab === 'subcontractors' && 'Subcontractors'}
          </h2>

          {/* Portal Scope Indicator Pill */}
          <span className="inline-flex items-center space-x-1 text-xs font-bold font-mono text-[#0078d4] dark:text-sky-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
            {activeTab === 'service-categories' && (
              serviceSubTab === 'subcontractor'
                ? `${categories.filter(c => c.group === 'subcontractor' && c.type === 'category').length} Categories`
                : `${categories.filter(c => c.group === 'outsourced' && c.type === 'category').length} Tariffs`
            )}
            {activeTab === 'materials-hierarchy' && `${categories.filter(c => c.group === 'material' && c.type === 'category').length} Categories`}
            {activeTab === 'revenue-streams' && (
              revenueSubTab === 'products'
                ? `${categories.filter(c => c.group === 'product' && c.type === 'category').length} Products`
                : `${categories.filter(c => c.group === 'service' && c.type === 'category').length} Services`
            )}
            {activeTab === 'projects' && `${projects.length} Total`}
            {activeTab === 'clients' && `${clientProfiles.length} Total`}
            {activeTab === 'suppliers' && `${suppliers.length} Total`}
            {activeTab === 'service-providers' && `${outsourcedServices.length} Total`}
            {activeTab === 'subcontractors' && `${subcontractors.length} Total`}
          </span>
        </div>

        {/* Right: Search and Actions */}
        <div className="flex items-center flex-wrap gap-2 ml-auto">
          {/* Simple Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search directory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    showToast(`Filtering portal cards matching "${searchQuery}"`);
                  }
                }
              }}
              className="bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#003049] rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-44 sm:w-56 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Fine Vertical Divider Line */}
          <span className="hidden sm:inline-block h-5 w-px bg-slate-200 mx-0.5" />

          {/* Primary Quick Action Button with Fine Lines */}
          {activeTab === 'materials-hierarchy' && (
            <button
              type="button"
              onClick={() => {
                setAddItemPortal('materials-hierarchy');
                setIsAddItemModalOpen(true);
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold rounded-lg transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>+ Item</span>
            </button>
          )}

          {activeTab === 'service-categories' && (
            serviceSubTab === 'subcontractor' ? (
              <button
                type="button"
                onClick={() => {
                  setAddItemPortal('subcontractors');
                  setIsAddItemModalOpen(true);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold rounded-lg transition-all shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>+ Service</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAddItemPortal('service-providers');
                  setIsAddItemModalOpen(true);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold rounded-lg transition-all shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>+ Tariff</span>
              </button>
            )
          )}

          {(activeTab === 'revenue-streams' || activeTab === 'products-hierarchy' || activeTab === 'services-hierarchy') && (
            revenueSubTab === 'products' ? (
              <button
                type="button"
                onClick={() => {
                  setAddItemPortal('products-hierarchy');
                  setIsAddItemModalOpen(true);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold rounded-lg transition-all shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>+ Product</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAddItemPortal('services-hierarchy');
                  setIsAddItemModalOpen(true);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold rounded-lg transition-all shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>+ Tariff</span>
              </button>
            )
          )}

          {activeTab === 'projects' && (
            <button
              type="button"
              onClick={() => {
                setAddItemPortal('projects');
                setIsAddItemModalOpen(true);
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold rounded-lg transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>+ Project</span>
            </button>
          )}

          {activeTab === 'clients' && (
            <button
              type="button"
              onClick={() => {
                setAddItemPortal('clients');
                setIsAddItemModalOpen(true);
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold rounded-lg transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>+ Client</span>
            </button>
          )}

          {activeTab === 'suppliers' && (
            <button
              type="button"
              onClick={() => {
                setAddItemPortal('suppliers');
                setIsAddItemModalOpen(true);
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold rounded-lg transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>+ Supplier</span>
            </button>
          )}

          {activeTab === 'service-providers' && (
            <button
              type="button"
              onClick={() => {
                setAddItemPortal('service-providers');
                setIsAddItemModalOpen(true);
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold rounded-lg transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>+ Provider</span>
            </button>
          )}

          {activeTab === 'subcontractors' && (
            <button
              type="button"
              onClick={() => {
                setAddItemPortal('subcontractors');
                setIsAddItemModalOpen(true);
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold rounded-lg transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>+ Subcontractor</span>
            </button>
          )}

          {/* Universal Bulk Import Button (Excel & CSV) */}
          <button
            type="button"
            id="portal-bulk-import-btn"
            onClick={() => {
              const target: ImportEntityType =
                activeTab === 'materials-hierarchy'
                  ? 'materials'
                  : activeTab === 'revenue-streams' || activeTab === 'products-hierarchy'
                  ? 'produce'
                  : activeTab === 'service-categories'
                  ? serviceSubTab === 'subcontractor'
                    ? 'subcontractors'
                    : 'outsourced'
                  : activeTab === 'suppliers'
                  ? 'suppliers'
                  : activeTab === 'subcontractors'
                  ? 'subcontractors'
                  : activeTab === 'service-providers'
                  ? 'outsourced'
                  : 'materials';

              let currentCat: string | undefined;
              let currentSub: string | undefined;

              if (activeTab === 'materials-hierarchy') {
                if (selectedMaterialCatId) {
                  currentCat = categories.find((c) => c.id === selectedMaterialCatId)?.name;
                }
                if (selectedMaterialSubCatId) {
                  currentSub = categories.find((c) => c.id === selectedMaterialSubCatId)?.name;
                }
              } else if (activeTab === 'service-categories' && serviceSubTab === 'subcontractor') {
                if (selectedSubcontractorCatId) {
                  currentCat = categories.find((c) => c.id === selectedSubcontractorCatId)?.name;
                }
                if (selectedSubcontractorSubCatId) {
                  currentSub = categories.find((c) => c.id === selectedSubcontractorSubCatId)?.name;
                }
              } else if (activeTab === 'service-categories' && serviceSubTab === 'outsourced') {
                if (selectedOutsourcedCatId) {
                  currentCat = categories.find((c) => c.id === selectedOutsourcedCatId)?.name;
                }
                if (selectedOutsourcedSubCatId) {
                  currentSub = categories.find((c) => c.id === selectedOutsourcedSubCatId)?.name;
                }
              }

              setBulkImportConfig({
                isOpen: true,
                targetType: target,
                categoryScope: currentCat,
                subCategoryScope: currentSub
              });
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer border border-emerald-600"
            title="Bulk import items via Excel / CSV (Master datasets or Sub-category wise)"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bulk Import</span>
            <span className="sm:hidden">Import</span>
          </button>

          {/* Consolidated Commands Menu Button */}
          <div className="relative">
            <button
              type="button"
              id="portal-commands-menu-btn"
              onClick={() => setIsCommandsMenuOpen(!isCommandsMenuOpen)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-[#003049] border text-xs font-medium rounded-xl transition-all shadow-2xs cursor-pointer ${
                isCommandsMenuOpen ? 'border-[#003049] ring-2 ring-[#003049]/10 bg-slate-50' : 'border-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#003049]" />
              <span>Commands</span>
              <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform duration-150 ${isCommandsMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Consolidated Dropdown Menu with Fine Dividers and Clean Layout */}
            {isCommandsMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsCommandsMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
                  {/* Category / Creation Commands */}
                  <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Create & Structure
                  </div>

                  {activeTab === 'service-categories' && (
                    <>
                      {serviceSubTab === 'subcontractor' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCommandsMenuOpen(false);
                              setCreateCategoryGroup('subcontractor');
                              setIsCreateCategoryModalOpen(true);
                            }}
                            className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#003049] rounded-lg transition-colors cursor-pointer text-left"
                          >
                            <FolderPlus className="w-3.5 h-3.5 text-[#003049]" />
                            <span>Create Subcontractor Category</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsCommandsMenuOpen(false);
                              setCreateSubCategoryGroup('subcontractor');
                              setCreateSubCategoryParentId(selectedSubcontractorCatId || undefined);
                              setIsCreateSubCategoryModalOpen(true);
                            }}
                            className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#003049] rounded-lg transition-colors cursor-pointer text-left"
                          >
                            <Layers className="w-3.5 h-3.5 text-[#669bbc]" />
                            <span>Create Hired Trade (Sub-Category)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsCommandsMenuOpen(false);
                              setAddItemPortal('subcontractors');
                              setIsAddItemModalOpen(true);
                            }}
                            className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#003049] rounded-lg transition-colors cursor-pointer text-left"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Add Hired Service Item & Rates</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCommandsMenuOpen(false);
                              setCreateCategoryGroup('outsourced');
                              setIsCreateCategoryModalOpen(true);
                            }}
                            className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#003049] rounded-lg transition-colors cursor-pointer text-left"
                          >
                            <FolderPlus className="w-3.5 h-3.5 text-[#003049]" />
                            <span>Create Outsourced Category</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsCommandsMenuOpen(false);
                              setCreateSubCategoryGroup('outsourced');
                              setCreateSubCategoryParentId(selectedOutsourcedCatId || undefined);
                              setIsCreateSubCategoryModalOpen(true);
                            }}
                            className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#003049] rounded-lg transition-colors cursor-pointer text-left"
                          >
                            <Layers className="w-3.5 h-3.5 text-[#669bbc]" />
                            <span>Create Outsourced Sub-Category</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsCommandsMenuOpen(false);
                              setAddItemPortal('service-providers');
                              setIsAddItemModalOpen(true);
                            }}
                            className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#003049] rounded-lg transition-colors cursor-pointer text-left"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Add Outsourced Tariff Item</span>
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {activeTab === 'materials-hierarchy' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCommandsMenuOpen(false);
                          setCreateCategoryGroup('material');
                          setIsCreateCategoryModalOpen(true);
                        }}
                        className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#003049] rounded-lg transition-colors cursor-pointer text-left"
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-[#003049]" />
                        <span>Create Category</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsCommandsMenuOpen(false);
                          setCreateSubCategoryGroup('material');
                          setCreateSubCategoryParentId(selectedMaterialCatId || undefined);
                          setIsCreateSubCategoryModalOpen(true);
                        }}
                        className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#003049] rounded-lg transition-colors cursor-pointer text-left"
                      >
                        <Layers className="w-3.5 h-3.5 text-[#669bbc]" />
                        <span>Create Sub-Category</span>
                      </button>
                    </>
                  )}

                  {(activeTab === 'revenue-streams' || activeTab === 'products-hierarchy' || activeTab === 'services-hierarchy') && (
                    revenueSubTab === 'products' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCommandsMenuOpen(false);
                            setCreateCategoryGroup('product');
                            setIsCreateCategoryModalOpen(true);
                          }}
                          className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#003049] rounded-lg transition-colors cursor-pointer text-left"
                        >
                          <FolderPlus className="w-3.5 h-3.5 text-[#003049]" />
                          <span>Create Product Category</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsCommandsMenuOpen(false);
                            setCreateSubCategoryGroup('product');
                            setCreateSubCategoryParentId(selectedProductCatId || undefined);
                            setIsCreateSubCategoryModalOpen(true);
                          }}
                          className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#003049] rounded-lg transition-colors cursor-pointer text-left"
                        >
                          <Layers className="w-3.5 h-3.5 text-[#669bbc]" />
                          <span>Create Sub-Category</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCommandsMenuOpen(false);
                            setCreateCategoryGroup('service');
                            setIsCreateCategoryModalOpen(true);
                          }}
                          className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#003049] rounded-lg transition-colors cursor-pointer text-left"
                        >
                          <FolderPlus className="w-3.5 h-3.5 text-[#003049]" />
                          <span>Create Service Scope</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsCommandsMenuOpen(false);
                            setCreateSubCategoryGroup('service');
                            setCreateSubCategoryParentId(selectedServiceCatId || undefined);
                            setIsCreateSubCategoryModalOpen(true);
                          }}
                          className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#003049] rounded-lg transition-colors cursor-pointer text-left"
                        >
                          <Layers className="w-3.5 h-3.5 text-[#669bbc]" />
                          <span>Create Sub-Scope / Tariff</span>
                        </button>
                      </>
                    )
                  )}

                  {activeTab === 'projects' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCommandsMenuOpen(false);
                        setAddItemPortal('materials-hierarchy');
                        setIsAddItemModalOpen(true);
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#003049] rounded-lg transition-colors cursor-pointer text-left"
                    >
                      <FilePlus className="w-3.5 h-3.5 text-slate-500" />
                      <span>Add BOM Item</span>
                    </button>
                  )}

                  {activeTab === 'clients' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCommandsMenuOpen(false);
                        setAddItemPortal('projects');
                        setIsAddItemModalOpen(true);
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#003049] rounded-lg transition-colors cursor-pointer text-left"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                      <span>Add Quote / Contract</span>
                    </button>
                  )}

                  {activeTab === 'suppliers' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCommandsMenuOpen(false);
                        setAddItemPortal('materials-hierarchy');
                        setIsAddItemModalOpen(true);
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#003049] rounded-lg transition-colors cursor-pointer text-left"
                    >
                      <Truck className="w-3.5 h-3.5 text-slate-500" />
                      <span>Add Supplied Material</span>
                    </button>
                  )}

                  {activeTab === 'service-providers' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCommandsMenuOpen(false);
                        setAddItemPortal('services-hierarchy');
                        setIsAddItemModalOpen(true);
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#003049] rounded-lg transition-colors cursor-pointer text-left"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                      <span>Add Tariff Rate</span>
                    </button>
                  )}

                  {activeTab === 'subcontractors' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCommandsMenuOpen(false);
                        setAddItemPortal('subcontractors');
                        setIsAddItemModalOpen(true);
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#003049] rounded-lg transition-colors cursor-pointer text-left"
                    >
                      <Cpu className="w-3.5 h-3.5 text-slate-500" />
                      <span>Add Labor Rate Sheet</span>
                    </button>
                  )}

                  {/* Fine divider line */}
                  <div className="my-1.5 border-t border-slate-100" />

                  {/* View Switching & CRM Grids */}
                  <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Views & Tools
                  </div>

                  {activeTab === 'service-categories' && serviceSubTab === 'outsourced' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCommandsMenuOpen(false);
                        setOutsourcedViewMode(outsourcedViewMode === 'hierarchy' ? 'items_table' : 'hierarchy');
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#003049] rounded-lg transition-colors cursor-pointer text-left"
                    >
                      <Table className="w-3.5 h-3.5 text-sky-600" />
                      <span>
                        {outsourcedViewMode === 'hierarchy'
                          ? 'Switch to All Outsourced Table'
                          : 'Switch to Category Cards'}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsCommandsMenuOpen(false);
                      if (activeTab === 'service-categories') {
                        if (serviceSubTab === 'subcontractor') {
                          setActiveFXTTCard({
                            cardType: 'subcontractor',
                            cardId: 'subcontractors-catalog',
                            cardTitle: 'Hired Subcontractor Labor Rate Grid',
                            cardSubtitle: 'Hourly Rates & Volume Brackets',
                            cardTag: 'HIRED SUB'
                          });
                        } else {
                          setActiveFXTTCard({
                            cardType: 'service_provider',
                            cardId: 'outsourced-catalog',
                            cardTitle: 'Outsourced Services & Utility Tariffs',
                            cardSubtitle: 'Contract Rates & SLAs',
                            cardTag: 'OUTSOURCED'
                          });
                        }
                      } else if (activeTab === 'materials-hierarchy') {
                        setActiveFXTTCard({
                          cardType: 'material_category',
                          cardId: 'mat-all',
                          cardTitle: 'Material Catalog & Vendor Grid',
                          cardSubtitle: 'Master CRM Price Matrix',
                          cardTag: 'MATERIALS'
                        });
                      } else if (activeTab === 'revenue-streams') {
                        setActiveFXTTCard({
                          cardType: 'project',
                          cardId: 'rev-all',
                          cardTitle: revenueSubTab === 'products' ? 'Supplied Product Catalog' : 'Customer Service Tariffs',
                          cardSubtitle: 'Master Revenue Streams Grid',
                          cardTag: 'REVENUE'
                        });
                      } else if (activeTab === 'suppliers') {
                        setActiveFXTTCard({
                          cardType: 'supplier',
                          cardId: 'all-suppliers',
                          cardTitle: 'All Material Suppliers & Supplies',
                          cardSubtitle: 'Master Material Suppliers & Supplies Matrix',
                          cardTag: 'SUPPLIER PORTAL'
                        });
                      } else if (activeTab === 'service-providers') {
                        setActiveFXTTCard({
                          cardType: 'service_provider',
                          cardId: 'all-service-providers',
                          cardTitle: 'All Outsourced Service Providers',
                          cardSubtitle: 'Master Outsourced Tariffs & SLAs Matrix',
                          cardTag: 'SERVICE PROVIDERS'
                        });
                      } else if (activeTab === 'subcontractors') {
                        setActiveFXTTCard({
                          cardType: 'subcontractor',
                          cardId: 'all-subcontractors',
                          cardTitle: 'All Subcontractor Services',
                          cardSubtitle: 'Master Subcontractor Services & Labour Charges Grid',
                          cardTag: 'SUBCONTRACTOR SERVICES'
                        });
                      } else {
                        setIsCreateModalOpen(true);
                      }
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#003049] rounded-lg transition-colors cursor-pointer text-left"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                    <span>Open in FXTT CRM Grid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCommandsMenuOpen(false);
                      setIsCreateModalOpen(true);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#003049] rounded-lg transition-colors cursor-pointer text-left"
                  >
                    <Palette className="w-3.5 h-3.5 text-purple-600" />
                    <span>Design Custom Portal Tile</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. MAIN CONTENT GRIDS */}

      {/* TAB: PROJECTS CARDS / TILES */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {projects
              .filter((p) => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return p.name.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
              })
              .map((proj, idx) => {
                const defaultTheme = getRandomThemeIndex(idx);
                const style = getTileStyle(proj.id, defaultTheme.id);
                return (
                  <ModernTileCard
                    key={proj.id}
                    id={proj.id}
                    tag={`PROJECT • ${proj.code}`}
                    title={proj.name}
                    brief={`Client: ${proj.clientName} • Quoted: $${(Number(proj.quotedPrice) || 0).toLocaleString()}`}
                    actionLabel="OPEN PROJECT HOME & PLANS"
                    actionVariant="link"
                    themeId={style.themeId}
                    customGradient={style.customGradient}
                    selected={selectedProject?.id === proj.id}
                    onChangeTheme={(tId, grad) => handleUpdateTileTheme(proj.id, tId, grad)}
                    onClick={() => {
                      onSelectProject(proj);
                      if (onNavigateToProjectHome) {
                        onNavigateToProjectHome(proj);
                      } else {
                        onNavigateToCostAnalysis(proj);
                      }
                    }}
                    onEdit={() =>
                      handleOpenEdit('project', proj.id, {
                        title: proj.name,
                        name: proj.name,
                        clientName: proj.clientName,
                        code: proj.code,
                        targetProduct: proj.targetProduct,
                        quotedPrice: proj.quotedPrice,
                        targetMarginPct: proj.targetMarginPct,
                        overheadPct: proj.overheadPct,
                        contingencyPct: proj.contingencyPct,
                        startDate: proj.startDate,
                        deliveryDeadline: proj.deliveryDeadline,
                        notes: proj.notes,
                        status: proj.status,
                        themeId: style.themeId || proj.themeId,
                        customGradient: style.customGradient || proj.customGradient
                      })
                    }
                    onDelete={() => handleOpenDelete('Project', proj.id, proj.name, 'projects')}
                    onDuplicate={() => handleDuplicate('project', proj.id)}
                    onAction={() => {
                      onSelectProject(proj);
                      if (onNavigateToProjectHome) {
                        onNavigateToProjectHome(proj);
                      } else {
                        onNavigateToCostAnalysis(proj);
                      }
                    }}
                    onViewListView={() => {
                      setActiveFXTTCard({
                        cardType: 'project',
                        cardId: proj.id,
                        cardTitle: proj.name,
                        cardSubtitle: `Client: ${proj.clientName} • Quoted $${(Number(proj.quotedPrice) || 0).toLocaleString()}`,
                        cardTag: `PROJECT • ${proj.code}`
                      });
                    }}
                  />
                );
              })}

            {/* User-created project tiles */}
            {customTiles
              .filter((t) => t.group === 'projects')
              .map((t) => (
                <ModernTileCard
                  key={t.id}
                  id={t.id}
                  tag={t.tag}
                  title={t.title}
                  brief={t.brief}
                  actionLabel={t.action}
                  actionVariant="link"
                  themeId={t.themeId}
                  customGradient={t.customGradient}
                  onChangeTheme={(tId, grad) => handleUpdateTileTheme(t.id, tId, grad)}
                  onEdit={() =>
                    handleOpenEdit('custom-tile', t.id, {
                      title: t.title,
                      brief: t.brief,
                      tag: t.tag
                    })
                  }
                  onDelete={() => handleOpenDelete('Custom Tile', t.id, t.title, 'projects')}
                  onDuplicate={() => handleDuplicate('custom-tile', t.id)}
                  onAction={() => {
                    setActiveDetailItem({
                      title: t.title,
                      tag: t.tag,
                      themeId: t.themeId,
                      customGradient: t.customGradient,
                      description: t.brief,
                      attributes: [{ label: 'Custom Tile ID', value: t.id }],
                      onOpenListView: () => {
                        setActiveFXTTCard({
                          cardType: 'project',
                          cardId: t.id,
                          cardTitle: t.title,
                          cardSubtitle: t.brief,
                          cardTag: t.tag
                        });
                      }
                    });
                  }}
                  onViewListView={() => {
                    setActiveFXTTCard({
                      cardType: 'project',
                      cardId: t.id,
                      cardTitle: t.title,
                      cardSubtitle: t.brief,
                      cardTag: t.tag
                    });
                  }}
                />
              ))}
          </div>
        </div>
      )}

      {/* TAB: MATERIAL CATEGORIES, SUB CATEGORIES, DEEP SPECS (3-TIER HIERARCHY) */}
      {activeTab === 'materials-hierarchy' && (
        <div className="space-y-4">
          {/* Breadcrumbs for Hierarchy Navigation */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center space-x-2 text-xs text-slate-600">
            <button
              onClick={() => {
                setSelectedMaterialCatId(null);
                setSelectedMaterialSubCatId(null);
              }}
              className={`hover:text-[#003049] transition-colors ${!selectedMaterialCatId ? 'font-normal text-[#003049]' : ''}`}
            >
              All Material Categories (Level 1)
            </button>

            {selectedMaterialCatId && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <button
                  onClick={() => setSelectedMaterialSubCatId(null)}
                  className={`hover:text-[#003049] transition-colors ${!selectedMaterialSubCatId ? 'font-normal text-[#003049]' : ''}`}
                >
                  {categories.find((c) => c.id === selectedMaterialCatId)?.name} (Sub-Categories)
                </button>
              </>
            )}

            {selectedMaterialSubCatId && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-normal text-[#003049]">
                  {categories.find((c) => c.id === selectedMaterialSubCatId)?.name} (Deep Specs)
                </span>
              </>
            )}
          </div>

          {/* Level 1: Categories */}
          {!selectedMaterialCatId && (
            <div>
              <div className="text-xs text-slate-500 mb-2">
                Click any category card to drill down into sub-categories, or use edit/delete/duplicate to manage catalog:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories
                  .filter((c) => c.group === 'material' && c.type === 'category')
                  .filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.brief.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((cat) => {
                    const style = getTileStyle(cat.id, cat.themeId);
                    return (
                      <ModernTileCard
                        key={cat.id}
                        id={cat.id}
                        tag="MATERIAL CATEGORY"
                        title={cat.name}
                        brief={cat.brief}
                        actionLabel="VIEW SUB-CATEGORIES"
                        actionVariant="link"
                        themeId={style.themeId}
                        customGradient={style.customGradient}
                        onChangeTheme={(tId, grad) => handleUpdateTileTheme(cat.id, tId, grad)}
                        onEdit={() =>
                          handleOpenEdit('category', cat.id, {
                            title: cat.name,
                            name: cat.name,
                            brief: cat.brief
                          })
                        }
                        onDelete={() => handleOpenDelete('Category', cat.id, cat.name, 'materials-hierarchy')}
                        onDuplicate={() => handleDuplicate('category', cat.id)}
                        onAction={() => setSelectedMaterialCatId(cat.id)}
                        onViewListView={() => {
                          setActiveFXTTCard({
                            cardType: 'material_category',
                            cardId: cat.id,
                            cardTitle: cat.name,
                            cardSubtitle: cat.brief,
                            cardTag: 'MATERIAL CATEGORY'
                          });
                        }}
                      />
                    );
                  })}
              </div>
              {renderCustomTilesForTab('materials-hierarchy', 'Material Specification')}
            </div>
          )}

          {/* Level 2: Sub-Categories */}
          {selectedMaterialCatId && !selectedMaterialSubCatId && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-slate-500">Sub-categories for selected parent category:</div>
                  <button
                    onClick={() => {
                      setCreateSubCategoryGroup('material');
                      setCreateSubCategoryParentId(selectedMaterialCatId);
                      setIsCreateSubCategoryModalOpen(true);
                    }}
                    className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 font-normal"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create Sub-Category</span>
                  </button>
                  <button
                    onClick={() => {
                      setAddItemPortal('materials-hierarchy');
                      setIsAddItemModalOpen(true);
                    }}
                    className="text-xs text-[#003049] hover:underline flex items-center space-x-1 font-normal ml-2"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item Here</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const parentCat = categories.find((c) => c.id === selectedMaterialCatId)?.name;
                      setBulkImportConfig({
                        isOpen: true,
                        targetType: 'materials',
                        categoryScope: parentCat
                      });
                    }}
                    className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center space-x-1 font-semibold ml-2 cursor-pointer shadow-2xs"
                    title="Bulk import items using Excel or CSV file"
                  >
                    <Upload className="w-3 h-3 text-emerald-700" />
                    <span>Bulk Import Items</span>
                  </button>
                </div>
                <button
                  onClick={() => setSelectedMaterialCatId(null)}
                  className="text-xs text-[#003049] flex items-center space-x-1 hover:underline"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to All Categories</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories
                  .filter((c) => c.group === 'material' && c.type === 'sub_category' && c.parentId === selectedMaterialCatId)
                  .filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((subCat) => {
                    const style = getTileStyle(subCat.id, subCat.themeId);
                    return (
                      <ModernTileCard
                        key={subCat.id}
                        id={subCat.id}
                        tag="SUB-CATEGORY"
                        title={subCat.name}
                        brief={subCat.brief}
                        actionLabel="VIEW DEEP SPECS"
                        actionVariant="link"
                        themeId={style.themeId}
                        customGradient={style.customGradient}
                        onChangeTheme={(tId, grad) => handleUpdateTileTheme(subCat.id, tId, grad)}
                        onEdit={() =>
                          handleOpenEdit('sub_category', subCat.id, {
                            title: subCat.name,
                            name: subCat.name,
                            brief: subCat.brief
                          })
                        }
                        onDelete={() => handleOpenDelete('Sub-Category', subCat.id, subCat.name, 'materials-hierarchy')}
                        onDuplicate={() => handleDuplicate('sub_category', subCat.id)}
                        onBulkImport={() => {
                          const parentCat = categories.find((c) => c.id === selectedMaterialCatId)?.name;
                          setBulkImportConfig({
                            isOpen: true,
                            targetType: 'materials',
                            categoryScope: parentCat,
                            subCategoryScope: subCat.name
                          });
                        }}
                        onAction={() => setSelectedMaterialSubCatId(subCat.id)}
                        onViewListView={() => {
                          setActiveFXTTCard({
                            cardType: 'material_category',
                            cardId: subCat.id,
                            cardTitle: subCat.name,
                            cardSubtitle: subCat.brief,
                            cardTag: 'SUB-CATEGORY'
                          });
                        }}
                      />
                    );
                  })}
              </div>
            </div>
          )}

          {/* Level 3: Sub-Sub Categories / Deep Spec */}
          {selectedMaterialSubCatId && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-slate-500">Sub-sub categories & deep material specifications:</div>
                  <button
                    onClick={() => {
                      setAddItemPortal('materials-hierarchy');
                      setIsAddItemModalOpen(true);
                    }}
                    className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 font-normal"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Material Item to this Sub-Category</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const parentSubCat = categories.find((c) => c.id === selectedMaterialSubCatId);
                      const parentCat = categories.find((c) => c.id === parentSubCat?.parentId)?.name;
                      setBulkImportConfig({
                        isOpen: true,
                        targetType: 'materials',
                        categoryScope: parentCat,
                        subCategoryScope: parentSubCat?.name
                      });
                    }}
                    className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center space-x-1 font-semibold ml-2 cursor-pointer shadow-2xs"
                    title="Bulk import items into this sub-sub category"
                  >
                    <Upload className="w-3 h-3 text-emerald-700" />
                    <span>Bulk Import Items</span>
                  </button>
                </div>
                <button
                  onClick={() => setSelectedMaterialSubCatId(null)}
                  className="text-xs text-[#003049] flex items-center space-x-1 hover:underline"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to Sub-Categories</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories
                  .filter((c) => c.group === 'material' && c.type === 'sub_sub_category' && c.parentId === selectedMaterialSubCatId)
                  .filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((deep) => {
                    const style = getTileStyle(deep.id, deep.themeId);
                    return (
                      <ModernTileCard
                        key={deep.id}
                        id={deep.id}
                        tag="SUB-SUB-CATEGORY"
                        title={deep.name}
                        brief={deep.brief}
                        actionLabel="BROWSE ITEMS"
                        actionVariant="link"
                        themeId={style.themeId}
                        customGradient={style.customGradient}
                        onChangeTheme={(tId, grad) => handleUpdateTileTheme(deep.id, tId, grad)}
                        onEdit={() =>
                          handleOpenEdit('sub_sub_category', deep.id, {
                            title: deep.name,
                            name: deep.name,
                            brief: deep.brief
                          })
                        }
                        onDelete={() => handleOpenDelete('Deep Spec', deep.id, deep.name, 'materials-hierarchy')}
                        onDuplicate={() => handleDuplicate('sub_sub_category', deep.id)}
                        onBulkImport={() => {
                          const parentSubCat = categories.find((c) => c.id === selectedMaterialSubCatId);
                          const parentCat = categories.find((c) => c.id === parentSubCat?.parentId)?.name;
                          setBulkImportConfig({
                            isOpen: true,
                            targetType: 'materials',
                            categoryScope: parentCat,
                            subCategoryScope: deep.name
                          });
                        }}
                        onAction={() => {
                          setActiveFXTTCard({
                            cardType: 'material_category',
                            cardId: deep.id,
                            cardTitle: deep.name,
                            cardSubtitle: deep.brief,
                            cardTag: 'DEEP MATERIAL SPEC'
                          });
                        }}
                        onViewListView={() => {
                          setActiveFXTTCard({
                            cardType: 'material_category',
                            cardId: deep.id,
                            cardTitle: deep.name,
                            cardSubtitle: deep.brief,
                            cardTag: 'DEEP MATERIAL SPEC'
                          });
                        }}
                      />
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: SERVICE CATEGORIES (SUBCONTRACTOR HIRED SERVICES & OUTSOURCED PROVIDERS) */}
      {activeTab === 'service-categories' && (
        <div className="space-y-4">
          {/* ===================== SUB-PORTAL 1: SUBCONTRACTOR (Hired Only) ===================== */}
          {serviceSubTab === 'subcontractor' && (
            <div className="space-y-4">
              {/* Breadcrumb Navigation & View Mode Toggles */}
              <div className="bg-white p-2.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shadow-2xs">
                <div className="flex items-center space-x-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubcontractorCatId(null);
                      setSelectedSubcontractorSubCatId(null);
                    }}
                    className={`hover:text-[#003049] transition-colors cursor-pointer ${
                      !selectedSubcontractorCatId ? 'font-bold text-[#003049]' : ''
                    }`}
                  >
                    All Hired Subcontractor Categories (Level 1)
                  </button>

                  {selectedSubcontractorCatId && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <button
                        type="button"
                        onClick={() => setSelectedSubcontractorSubCatId(null)}
                        className={`hover:text-[#003049] transition-colors cursor-pointer ${
                          !selectedSubcontractorSubCatId ? 'font-bold text-[#003049]' : ''
                        }`}
                      >
                        {categories.find((c) => c.id === selectedSubcontractorCatId)?.name || 'Category'}
                      </button>
                    </>
                  )}

                  {selectedSubcontractorSubCatId && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-bold text-[#003049]">
                        {categories.find((c) => c.id === selectedSubcontractorSubCatId)?.name || 'Sub-Category / Trade'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* View 1: 3-Tier Hierarchy Cards */}
              {subcontractorViewMode === 'hierarchy' && (
                <>
                  {/* LEVEL 1: Subcontractor Categories (Hired Services only) */}
                  {!selectedSubcontractorCatId && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-500 font-medium">
                          Select a hired subcontractor category to drill into trades, operations, rate cards, and range matrices:
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCreateCategoryGroup('subcontractor');
                            setIsCreateCategoryModalOpen(true);
                          }}
                          className="text-xs text-[#003049] hover:underline flex items-center space-x-1 font-medium cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Subcontractor Category</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {categories
                          .filter((c) => c.group === 'subcontractor' && c.type === 'category')
                          .filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.brief && c.brief.toLowerCase().includes(searchQuery.toLowerCase())))
                          .map((cat) => {
                            const style = getTileStyle(cat.id, cat.themeId);
                            const childTradesCount = categories.filter(
                              (c) => c.group === 'subcontractor' && c.type === 'sub_category' && c.parentId === cat.id
                            ).length;
                            return (
                              <ModernTileCard
                                key={cat.id}
                                id={cat.id}
                                tag="HIRED TRADE CATEGORY"
                                title={cat.name}
                                brief={cat.brief || `${childTradesCount} hired trades & rate schedules`}
                                actionLabel="EXPLORE TRADES"
                                actionVariant="link"
                                themeId={style.themeId}
                                customGradient={style.customGradient}
                                onChangeTheme={(tId, grad) => handleUpdateTileTheme(cat.id, tId, grad)}
                                onEdit={() =>
                                  handleOpenEdit('category', cat.id, {
                                    title: cat.name,
                                    name: cat.name,
                                    brief: cat.brief
                                  })
                                }
                                onDelete={() => handleOpenDelete('Subcontractor Category', cat.id, cat.name, 'subcontractors')}
                                onDuplicate={() => handleDuplicate('category', cat.id)}
                                onAction={() => setSelectedSubcontractorCatId(cat.id)}
                                onViewListView={() => {
                                  setActiveFXTTCard({
                                    cardType: 'subcontractor',
                                    cardId: cat.id,
                                    cardTitle: cat.name,
                                    cardSubtitle: cat.brief || 'Hired Subcontractor Rate Sheet',
                                    cardTag: 'HIRED SUB'
                                  });
                                }}
                              />
                            );
                          })}
                      </div>
                      {renderCustomTilesForTab('service-categories', 'Subcontractor Trade')}
                    </div>
                  )}

                  {/* LEVEL 2: Sub-Categories / Hired Specialist Trades */}
                  {selectedSubcontractorCatId && !selectedSubcontractorSubCatId && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className="text-xs text-slate-700 font-semibold">
                            Hired Trades under "{categories.find((c) => c.id === selectedSubcontractorCatId)?.name}":
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setCreateSubCategoryGroup('subcontractor');
                              setCreateSubCategoryParentId(selectedSubcontractorCatId);
                              setIsCreateSubCategoryModalOpen(true);
                            }}
                            className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 font-medium cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Hired Trade Specialization</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const parentCat = categories.find((c) => c.id === selectedSubcontractorCatId)?.name;
                              setBulkImportConfig({
                                isOpen: true,
                                targetType: 'subcontractors',
                                categoryScope: parentCat
                              });
                            }}
                            className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center space-x-1 font-semibold cursor-pointer shadow-2xs"
                            title="Bulk import subcontractor items into this category"
                          >
                            <Upload className="w-3 h-3 text-emerald-700" />
                            <span>Bulk Import Trade Items</span>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedSubcontractorCatId(null)}
                          className="text-xs text-[#003049] flex items-center space-x-1 hover:underline cursor-pointer font-medium"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          <span>Back to Categories</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {categories
                          .filter((c) => c.group === 'subcontractor' && c.type === 'sub_category' && c.parentId === selectedSubcontractorCatId)
                          .filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.brief && c.brief.toLowerCase().includes(searchQuery.toLowerCase())))
                          .map((subCat) => {
                            const style = getTileStyle(subCat.id, subCat.themeId);
                            const rateRangeText = subCat.minRate && subCat.maxRate
                              ? `Rate Range: $${subCat.minRate.toFixed(2)} - $${subCat.maxRate.toFixed(2)} / ${subCat.rateUnit || 'hr'}`
                              : subCat.ratePerUnit
                              ? `Base Rate: $${subCat.ratePerUnit.toFixed(2)} / ${subCat.rateUnit || 'hr'}`
                              : subCat.brief || 'Specialist hired trade';

                            return (
                              <ModernTileCard
                                key={subCat.id}
                                id={subCat.id}
                                tag="HIRED TRADE SPECIALTY"
                                title={subCat.name}
                                brief={rateRangeText}
                                actionLabel="VIEW OPERATIONS & RATES"
                                actionVariant="link"
                                themeId={style.themeId}
                                customGradient={style.customGradient}
                                onChangeTheme={(tId, grad) => handleUpdateTileTheme(subCat.id, tId, grad)}
                                onEdit={() =>
                                  handleOpenEdit('sub_category', subCat.id, {
                                    title: subCat.name,
                                    name: subCat.name,
                                    brief: subCat.brief,
                                    ratePerUnit: subCat.ratePerUnit,
                                    minRate: subCat.minRate,
                                    maxRate: subCat.maxRate,
                                    rateUnit: subCat.rateUnit
                                  })
                                }
                                onDelete={() => handleOpenDelete('Trade Specialty', subCat.id, subCat.name, 'subcontractors')}
                                onDuplicate={() => handleDuplicate('sub_category', subCat.id)}
                                onBulkImport={() => {
                                  const parentCat = categories.find((c) => c.id === selectedSubcontractorCatId)?.name;
                                  setBulkImportConfig({
                                    isOpen: true,
                                    targetType: 'subcontractors',
                                    categoryScope: parentCat,
                                    subCategoryScope: subCat.name
                                  });
                                }}
                                onAction={() => setSelectedSubcontractorSubCatId(subCat.id)}
                                onViewListView={() => {
                                  setActiveFXTTCard({
                                    cardType: 'subcontractor',
                                    cardId: subCat.id,
                                    cardTitle: subCat.name,
                                    cardSubtitle: rateRangeText,
                                    cardTag: 'HIRED TRADE'
                                  });
                                }}
                              />
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* LEVEL 3: Deep Subcontractor Operations & Direct Rates */}
                  {selectedSubcontractorSubCatId && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className="text-xs text-slate-700 font-semibold">
                            Operations & Rate Cards for "{categories.find((c) => c.id === selectedSubcontractorSubCatId)?.name}":
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setAddItemPortal('subcontractors');
                              setIsAddItemModalOpen(true);
                            }}
                            className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 font-medium cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Hired Operation & Rate</span>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedSubcontractorSubCatId(null)}
                          className="text-xs text-[#003049] flex items-center space-x-1 hover:underline cursor-pointer font-medium"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          <span>Back to Trades</span>
                        </button>
                      </div>

                      {categories.filter((c) => c.group === 'subcontractor' && c.type === 'sub_sub_category' && c.parentId === selectedSubcontractorSubCatId).length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                          {categories
                            .filter((c) => c.group === 'subcontractor' && c.type === 'sub_sub_category' && c.parentId === selectedSubcontractorSubCatId)
                            .filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.brief && c.brief.toLowerCase().includes(searchQuery.toLowerCase())))
                            .map((deep) => {
                              const style = getTileStyle(deep.id, deep.themeId);
                              const rateRangeText = deep.minRate && deep.maxRate
                                ? `Rate: $${deep.ratePerUnit || deep.minRate} / ${deep.rateUnit || 'hr'} (Range: $${deep.minRate} - $${deep.maxRate})`
                                : deep.ratePerUnit
                                ? `Rate: $${deep.ratePerUnit} / ${deep.rateUnit || 'hr'}`
                                : deep.brief || 'Direct hired operation';

                              return (
                                <ModernTileCard
                                  key={deep.id}
                                  id={deep.id}
                                  tag="HIRED OPERATION RATE"
                                  title={deep.name}
                                  brief={rateRangeText}
                                  actionLabel="RATE SHEET & SPECS"
                                  actionVariant="link"
                                  themeId={style.themeId}
                                  customGradient={style.customGradient}
                                  onChangeTheme={(tId, grad) => handleUpdateTileTheme(deep.id, tId, grad)}
                                  onEdit={() =>
                                    handleOpenEdit('sub_sub_category', deep.id, {
                                      title: deep.name,
                                      name: deep.name,
                                      brief: deep.brief,
                                      ratePerUnit: deep.ratePerUnit,
                                      minRate: deep.minRate,
                                      maxRate: deep.maxRate,
                                      rateUnit: deep.rateUnit
                                    })
                                  }
                                  onDelete={() => handleOpenDelete('Operation Rate', deep.id, deep.name, 'subcontractors')}
                                  onDuplicate={() => handleDuplicate('sub_sub_category', deep.id)}
                                  onAction={() => {
                                    setActiveFXTTCard({
                                      cardType: 'subcontractor',
                                      cardId: deep.id,
                                      cardTitle: deep.name,
                                      cardSubtitle: rateRangeText,
                                      cardTag: 'HIRED SUB'
                                    });
                                  }}
                                  onViewListView={() => {
                                    setActiveFXTTCard({
                                      cardType: 'subcontractor',
                                      cardId: deep.id,
                                      cardTitle: deep.name,
                                      cardSubtitle: rateRangeText,
                                      cardTag: 'HIRED SUB'
                                    });
                                  }}
                                />
                              );
                            })}
                        </div>
                      )}

                      {/* Full Screen FXTT CRM Grid for Subcontractor Trade Operations */}
                      <FXTTCardItemsListView
                        isModal={true}
                        cardType="subcontractor"
                        cardId={selectedSubcontractorSubCatId}
                        cardTitle={categories.find((c) => c.id === selectedSubcontractorSubCatId)?.name || 'Hired Trade Operations'}
                        cardSubtitle={categories.find((c) => c.id === selectedSubcontractorSubCatId)?.brief || 'Hired Trade Operations & Direct Rate Matrix'}
                        cardTag="HIRED SUBCONTRACTOR TRADE"
                        materials={materials}
                        suppliers={suppliers}
                        outsourcedServices={outsourcedServices}
                        subcontractors={subcontractors}
                        projects={projects}
                        produceItems={produceItems}
                        onClose={() => setSelectedSubcontractorSubCatId(null)}
                        onUpdatePrice={onUpdateMaterialPrice}
                        onUpdateMaterial={onUpdateMaterial}
                        onAddSupplier={onAddSupplier}
                      />
                    </div>
                  )}
                </>
              )}

              {/* View 2: FXTT Enterprise List & Grid View for Subcontractor Services */}
              {subcontractorViewMode === 'fxtt_grid' && (
                <FXTTCardItemsListView
                  isModal={true}
                  cardType="subcontractor"
                    cardId={selectedSubcontractorSubCatId || selectedSubcontractorCatId || 'subcontractors-catalog'}
                    cardTitle={
                      selectedSubcontractorSubCatId
                        ? categories.find((c) => c.id === selectedSubcontractorSubCatId)?.name || 'Subcontractor Trade Operations'
                        : selectedSubcontractorCatId
                        ? categories.find((c) => c.id === selectedSubcontractorCatId)?.name || 'Subcontractor Category Items'
                        : 'All Hired Subcontractor Services'
                    }
                    cardSubtitle={
                      selectedSubcontractorSubCatId
                        ? categories.find((c) => c.id === selectedSubcontractorSubCatId)?.brief || 'Hired Trade Operations & Direct Rate Matrix'
                        : selectedSubcontractorCatId
                        ? categories.find((c) => c.id === selectedSubcontractorCatId)?.brief || 'Hired Trades & Rates'
                        : 'Direct Hired Trade Operations & Standard Rate Schedules'
                    }
                    cardTag="HIRED SUBCONTRACTOR"
                    materials={materials}
                    suppliers={suppliers}
                    outsourcedServices={outsourcedServices}
                    subcontractors={subcontractors}
                    projects={projects}
                    produceItems={produceItems}
                    onClose={() => setSubcontractorViewMode('hierarchy')}
                    onUpdatePrice={onUpdateMaterialPrice}
                    onUpdateMaterial={onUpdateMaterial}
                    onAddSupplier={onAddSupplier}
                  />
              )}

              {/* View 2: Comprehensive Subcontractor Rates, Ranges & Items Table */}
              {subcontractorViewMode === 'items_table' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Direct Hired Subcontractor Trade Operations, Standard Rates & Price Ranges
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Restricted strictly to subcontractor labor and specialist services hired for projects
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAddItemPortal('subcontractors');
                          setIsAddItemModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-[#003049] hover:bg-[#002235] text-white rounded-lg text-xs font-medium flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#fdf0d5]" />
                        <span>Add Rate Line</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Trade / Service Item</th>
                          <th className="py-2.5 px-3 font-semibold">Hierarchy Category</th>
                          <th className="py-2.5 px-3 font-semibold">Billing Unit</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Standard Rate</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Rate Range (Min - Max)</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Overtime / OT</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Min Callout</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {categories
                          .filter((c) => c.group === 'subcontractor' && (c.type === 'sub_category' || c.type === 'sub_sub_category'))
                          .filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.brief && c.brief.toLowerCase().includes(searchQuery.toLowerCase())))
                          .map((item) => {
                            const parentCat = categories.find((c) => c.id === item.parentId);
                            const minR = item.minRate ?? (item.ratePerUnit ? item.ratePerUnit * 0.85 : 85);
                            const maxR = item.maxRate ?? (item.ratePerUnit ? item.ratePerUnit * 1.25 : 140);
                            const baseR = item.ratePerUnit ?? (minR + maxR) / 2;
                            const unit = item.rateUnit || 'hr';

                            return (
                              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2.5 px-3">
                                  <div className="font-semibold text-slate-900">{item.name}</div>
                                  <div className="text-[11px] text-slate-500 line-clamp-1">{item.brief || 'Certified trade operation'}</div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                    {parentCat ? parentCat.name : 'Subcontractor Trade'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-medium text-slate-600">
                                  per {unit}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                  ${baseR.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                                    ${minR.toFixed(2)} – ${maxR.toFixed(2)}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center text-slate-600 font-medium">
                                  1.5x (1.8x Sat/Sun)
                                </td>
                                <td className="py-2.5 px-3 text-center text-slate-600 font-medium">
                                  4.0 hrs
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end space-x-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveFXTTCard({
                                          cardType: 'subcontractor',
                                          cardId: item.id,
                                          cardTitle: item.name,
                                          cardSubtitle: `Rate Range: $${minR.toFixed(2)} - $${maxR.toFixed(2)} / ${unit}`,
                                          cardTag: 'HIRED SUB'
                                        });
                                      }}
                                      className="p-1 hover:bg-slate-200 rounded text-[#003049] transition-colors cursor-pointer"
                                      title="Open in Rate Sheet Grid"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenEdit(item.type, item.id, {
                                          title: item.name,
                                          name: item.name,
                                          brief: item.brief,
                                          ratePerUnit: baseR,
                                          minRate: minR,
                                          maxRate: maxR,
                                          rateUnit: unit
                                        })
                                      }
                                      className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors cursor-pointer"
                                      title="Edit Rates"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================== SUB-PORTAL 2: OUTSOURCED (Providers & Tariffs) ===================== */}
          {serviceSubTab === 'outsourced' && (
            <div className="space-y-4">
              {/* Informative Scope Header Banner - STRICTLY OUTSOURCED THIRD-PARTY PROVIDERS */}
              <div className="bg-gradient-to-r from-slate-900 via-[#003049] to-slate-800 text-white p-3.5 rounded-2xl shadow-sm border border-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2 text-[11px] text-[#fdf0d5]">
                      <span className="px-2 py-0.5 rounded bg-white/10 text-white uppercase tracking-wider font-semibold border border-white/15">
                        Exclusively External Providers We Hire
                      </span>
                      <span>•</span>
                      <span>Auxiliary Utilities, Heavy Logistics, Lab Testing & Precision Services</span>
                    </div>
                    <h3 className="text-sm font-bold text-white mt-1">
                      Outsourced Services Directory & Tariff Rate Management
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Direct repository of outsourced service categories, specialized sub-categories, hired service items, tiered volume ranges, contract unit rates, and audited tariff change logs.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveFXTTCard({
                          cardType: 'outsourced',
                          cardTitle: 'All Outsourced Services',
                          cardSubtitle: 'External Service Providers & Procured Tariffs',
                          cardTag: 'OUTSOURCED SCOPE'
                        });
                      }}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium border border-white/20 flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Table className="w-3.5 h-3.5 text-[#fdf0d5]" />
                      <span>Open All in FXTT Grid</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddItemPortal('service-providers');
                        setIsAddItemModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-[#fdf0d5] hover:bg-[#fae7bc] text-[#003049] rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#003049]" />
                      <span>Register Outsourced Service</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Breadcrumb Navigation & View Mode Toggles */}
              <div className="bg-white p-2.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shadow-2xs">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOutsourcedCatId(null);
                      setSelectedOutsourcedSubCatId(null);
                    }}
                    className={`hover:text-[#003049] transition-colors cursor-pointer px-2 py-1 rounded-md ${
                      !selectedOutsourcedCatId ? 'bg-slate-100 font-bold text-[#003049]' : 'text-slate-600'
                    }`}
                  >
                    All Outsourced Categories (Level 1)
                  </button>

                  {selectedOutsourcedCatId && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <button
                        type="button"
                        onClick={() => setSelectedOutsourcedSubCatId(null)}
                        className={`hover:text-[#003049] transition-colors cursor-pointer px-2 py-1 rounded-md ${
                          selectedOutsourcedCatId && !selectedOutsourcedSubCatId
                            ? 'bg-slate-100 font-bold text-[#003049]'
                            : 'text-slate-600'
                        }`}
                      >
                        {categories.find((c) => c.id === selectedOutsourcedCatId)?.name || 'Category'} (Level 2)
                      </button>
                    </>
                  )}

                  {selectedOutsourcedSubCatId && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="px-2 py-1 rounded-md bg-[#fdf0d5] font-bold text-[#003049] border border-[#ecd5a8]">
                        {categories.find((c) => c.id === selectedOutsourcedSubCatId)?.name || 'Sub-Category'} (Level 3 Items)
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-600 font-medium px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                    {categories.filter((c) => c.group === 'outsourced' && c.type === 'category').length} Categories •{' '}
                    {categories.filter((c) => c.group === 'outsourced' && c.type === 'sub_category').length} Sub-Categories •{' '}
                    {outsourcedServices.length} Hired Service Items
                  </span>
                  <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setOutsourcedViewMode('hierarchy')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                        outsourcedViewMode === 'hierarchy'
                          ? 'bg-white text-[#003049] shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      3-Tier Cards
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutsourcedViewMode('fxtt_grid')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                        outsourcedViewMode === 'fxtt_grid'
                          ? 'bg-white text-[#003049] shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      FXTT Grid View
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutsourcedViewMode('items_table')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                        outsourcedViewMode === 'items_table'
                          ? 'bg-white text-[#003049] shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tariffs Table
                    </button>
                  </div>
                </div>
              </div>

              {/* View 1: 3-Tier Hierarchy Cards (Level 1 -> Level 2 -> Level 3) */}
              {outsourcedViewMode === 'hierarchy' && (
                <>
                  {/* LEVEL 1: ALL OUTSOURCED SERVICE CATEGORIES */}
                  {!selectedOutsourcedCatId && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Level 1: Outsourced Service Categories We Hire
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Click any category to inspect specialized sub-categories, hired service items, tiered volume ranges, and change logs.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCreateCategoryGroup('outsourced');
                            setIsCreateCategoryModalOpen(true);
                          }}
                          className="text-xs text-[#003049] hover:underline flex items-center space-x-1 font-medium cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Outsourced Category</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {categories
                          .filter((c) => c.group === 'outsourced' && c.type === 'category')
                          .filter(
                            (c) =>
                              !searchQuery ||
                              c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (c.brief && c.brief.toLowerCase().includes(searchQuery.toLowerCase()))
                          )
                          .map((cat) => {
                            const style = getTileStyle(cat.id, cat.themeId);
                            const childSubCategories = categories.filter(
                              (c) => c.group === 'outsourced' && c.type === 'sub_category' && c.parentId === cat.id
                            );
                            const matchingServices = outsourcedServices.filter(
                              (s) =>
                                s.category.toLowerCase().includes(cat.name.toLowerCase()) ||
                                cat.name.toLowerCase().includes(s.category.toLowerCase())
                            );

                            return (
                              <ModernTileCard
                                key={cat.id}
                                id={cat.id}
                                tag="OUTSOURCED CATEGORY (HIRED)"
                                title={cat.name}
                                brief={cat.brief || `${childSubCategories.length} sub-categories • ${matchingServices.length} hired services`}
                                actionLabel="EXPLORE SUB-CATEGORIES"
                                actionVariant="link"
                                themeId={style.themeId}
                                customGradient={style.customGradient}
                                onChangeTheme={(tId, grad) => handleUpdateTileTheme(cat.id, tId, grad)}
                                onEdit={() =>
                                  handleOpenEdit('category', cat.id, {
                                    title: cat.name,
                                    name: cat.name,
                                    brief: cat.brief
                                  })
                                }
                                onDelete={() =>
                                  handleOpenDelete('Outsourced Category', cat.id, cat.name, 'service-providers')
                                }
                                onDuplicate={() => handleDuplicate('category', cat.id)}
                                onAction={() => {
                                  setSelectedOutsourcedCatId(cat.id);
                                  setSelectedOutsourcedSubCatId(null);
                                }}
                                onViewListView={() => {
                                  setActiveFXTTCard({
                                    cardType: 'outsourced',
                                    cardId: cat.id,
                                    cardTitle: cat.name,
                                    cardSubtitle: cat.brief || 'Outsourced Service Tariffs',
                                    cardTag: 'OUTSOURCED'
                                  });
                                }}
                              />
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* LEVEL 2: OUTSOURCED SUB-CATEGORIES */}
                  {selectedOutsourcedCatId && !selectedOutsourcedSubCatId && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                              Level 2: Sub-Categories in "
                              {categories.find((c) => c.id === selectedOutsourcedCatId)?.name}"
                            </h4>
                            <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-semibold">
                              Specialized Provider Tariffs
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Select a sub-category below to examine specific hired service items, tiered ranges, contract rates, and audit change logs.
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCreateSubCategoryGroup('outsourced');
                              setCreateSubCategoryParentId(selectedOutsourcedCatId);
                              setIsCreateSubCategoryModalOpen(true);
                            }}
                            className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 font-medium cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Sub-Category</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const parentCat = categories.find((c) => c.id === selectedOutsourcedCatId)?.name;
                              setBulkImportConfig({
                                isOpen: true,
                                targetType: 'outsourced',
                                categoryScope: parentCat
                              });
                            }}
                            className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center space-x-1 font-semibold cursor-pointer shadow-2xs"
                            title="Bulk import outsourced service items into this category"
                          >
                            <Upload className="w-3 h-3 text-emerald-700" />
                            <span>Bulk Import Service Items</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOutsourcedCatId(null);
                              setSelectedOutsourcedSubCatId(null);
                            }}
                            className="text-xs text-[#003049] flex items-center space-x-1 hover:underline cursor-pointer font-medium"
                          >
                            <ArrowLeft className="w-3 h-3" />
                            <span>Back to Categories</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {categories
                          .filter(
                            (c) =>
                              c.group === 'outsourced' &&
                              c.type === 'sub_category' &&
                              c.parentId === selectedOutsourcedCatId
                          )
                          .filter(
                            (c) =>
                              !searchQuery ||
                              c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (c.brief && c.brief.toLowerCase().includes(searchQuery.toLowerCase()))
                          )
                          .map((subCat) => {
                            const style = getTileStyle(subCat.id, subCat.themeId);
                            const matchingServices = outsourcedServices.filter(
                              (s) =>
                                s.subCategory.toLowerCase().includes(subCat.name.toLowerCase()) ||
                                subCat.name.toLowerCase().includes(s.subCategory.toLowerCase())
                            );
                            const tariffBrief = subCat.rateRange
                              ? `Contract Range: ${subCat.rateRange} (${matchingServices.length} service items)`
                              : subCat.brief || `${matchingServices.length} hired services`;

                            return (
                              <ModernTileCard
                                key={subCat.id}
                                id={subCat.id}
                                tag="OUTSOURCED SUB-CATEGORY"
                                title={subCat.name}
                                brief={tariffBrief}
                                actionLabel="OPEN FXTT GRID VIEW"
                                actionVariant="primary"
                                themeId={style.themeId}
                                customGradient={style.customGradient}
                                onChangeTheme={(tId, grad) => handleUpdateTileTheme(subCat.id, tId, grad)}
                                onEdit={() =>
                                  handleOpenEdit('sub_category', subCat.id, {
                                    title: subCat.name,
                                    name: subCat.name,
                                    brief: subCat.brief
                                  })
                                }
                                onDelete={() =>
                                  handleOpenDelete('Outsourced Sub-Category', subCat.id, subCat.name, 'service-providers')
                                }
                                onDuplicate={() => handleDuplicate('sub_category', subCat.id)}
                                onBulkImport={() => {
                                  const parentCat = categories.find((c) => c.id === selectedOutsourcedCatId)?.name;
                                  setBulkImportConfig({
                                    isOpen: true,
                                    targetType: 'outsourced',
                                    categoryScope: parentCat,
                                    subCategoryScope: subCat.name
                                  });
                                }}
                                onAction={() => {
                                  setSelectedOutsourcedSubCatId(subCat.id);
                                }}
                                onViewListView={() => {
                                  setSelectedOutsourcedSubCatId(subCat.id);
                                }}
                              />
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* LEVEL 3: FULL SCREEN FXTT GRID VIEW FOR OUTSOURCED SERVICE SUB-CATEGORIES */}
                  {selectedOutsourcedSubCatId && (
                    <FXTTCardItemsListView
                      isModal={true}
                      cardType="outsourced"
                      cardId={selectedOutsourcedSubCatId}
                      cardTitle={categories.find((c) => c.id === selectedOutsourcedSubCatId)?.name || 'Outsourced Service Operations'}
                      cardSubtitle={categories.find((c) => c.id === selectedOutsourcedSubCatId)?.brief || 'Contracted Service Tariffs & Rate Matrix'}
                      cardTag="OUTSOURCED SERVICE SUB-CATEGORY"
                      categories={categories}
                      materials={materials}
                      suppliers={suppliers}
                      outsourcedServices={outsourcedServices}
                      subcontractors={subcontractors}
                      projects={projects}
                      produceItems={produceItems}
                      onClose={() => setSelectedOutsourcedSubCatId(null)}
                      onUpdatePrice={onUpdateMaterialPrice}
                      onUpdateMaterialPrice={onUpdateMaterialPrice}
                      onUpdateMaterial={onUpdateMaterial}
                      onAddSupplier={onAddSupplier}
                    />
                  )}

                  {false && selectedOutsourcedSubCatId && (
                    <div className="space-y-4">
                      {(() => {
                        const activeCat = categories.find((c) => c.id === selectedOutsourcedCatId);
                        const activeSubCat = categories.find((c) => c.id === selectedOutsourcedSubCatId);
                        const currentItems = outsourcedServices.filter((s) => {
                          if (!activeSubCat) return true;
                          return (
                            s.subCategory.toLowerCase().includes(activeSubCat.name.toLowerCase()) ||
                            activeSubCat.name.toLowerCase().includes(s.subCategory.toLowerCase())
                          );
                        });

                        return (
                          <>
                            <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-slate-200">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                                    Level 3: Hired Service Items in "{activeSubCat?.name}"
                                  </h4>
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                                    {currentItems.length} Hired Services Found
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  Category: <span className="font-semibold text-slate-700">{activeCat?.name}</span> • Sub-Category: <span className="font-semibold text-slate-700">{activeSubCat?.name}</span>
                                </p>
                              </div>

                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedOutsourcedSubCatId(null)}
                                  className="text-xs text-[#003049] flex items-center space-x-1 hover:underline cursor-pointer font-medium"
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                  <span>Back to Sub-Categories</span>
                                </button>
                              </div>
                            </div>

                            {/* Service Item Cards with Rates, Ranges & Change Logs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {currentItems.map((svc) => {
                                const isHistoryExpanded = expandedOutsourcedHistoryIds.has(svc.id);
                                const isRangesExpanded = expandedOutsourcedRangesIds.has(svc.id);

                                return (
                                  <div
                                    key={svc.id}
                                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-shadow space-y-3"
                                  >
                                    {/* Card Header: Service Name & Provider */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                                          HIRED OUTSOURCED SERVICE
                                        </span>
                                        <h4 className="text-sm font-bold text-slate-900 mt-1.5">{svc.name}</h4>
                                        {svc.moreSubCategory && (
                                          <p className="text-xs text-slate-600 mt-0.5 italic">
                                            {svc.moreSubCategory}
                                          </p>
                                        )}
                                      </div>
                                      <div className="text-right shrink-0">
                                        <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded uppercase">
                                          {svc.slaLevel}
                                        </span>
                                        <div className="text-[10px] text-slate-400 mt-1">
                                          Updated: {svc.lastUpdated}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Hired Provider Information Box */}
                                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex items-center justify-between text-xs">
                                      <div className="flex items-center space-x-2">
                                        <Building2 className="w-4 h-4 text-[#003049] shrink-0" />
                                        <div>
                                          <div className="text-[10px] uppercase font-semibold text-slate-500">
                                            Hired External Provider
                                          </div>
                                          <div className="font-bold text-slate-900">{svc.providerName}</div>
                                        </div>
                                      </div>
                                      <span className="text-[10px] bg-white border border-slate-300 text-slate-700 px-2 py-0.5 rounded font-mono">
                                        Unit: {svc.baseUnitType.replace(/_/g, ' ')}
                                      </span>
                                    </div>

                                    {/* Contract Hired Rate vs Retail Benchmark */}
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-2.5">
                                        <div className="text-[10px] uppercase tracking-wider font-semibold text-blue-800">
                                          Contract Hired Rate
                                        </div>
                                        <div className="text-base font-extrabold text-[#003049] mt-0.5">
                                          ${svc.rate < 1 ? svc.rate.toFixed(3) : svc.rate.toFixed(2)}
                                          <span className="text-xs font-normal text-slate-500 ml-1">
                                            / {svc.baseUnitType.replace('per_', '')}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-blue-700 mt-0.5 font-medium">Cost to Hire</div>
                                      </div>

                                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                                        <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                                          Commercial Benchmark
                                        </div>
                                        <div className="text-base font-bold text-slate-800 mt-0.5">
                                          {svc.retailPrice ? `$${svc.retailPrice < 1 ? svc.retailPrice.toFixed(3) : svc.retailPrice.toFixed(2)}` : 'N/A'}
                                          <span className="text-xs font-normal text-slate-500 ml-1">
                                            / {svc.baseUnitType.replace('per_', '')}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">Billable Benchmark</div>
                                      </div>
                                    </div>

                                    {/* RANGES: Volume Pricing Tier Rates Section */}
                                    <div className="border border-amber-200 bg-[#fdf0d5]/30 rounded-xl p-2.5 space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-1 text-xs font-bold text-amber-900">
                                          <Scale className="w-3.5 h-3.5 text-amber-700" />
                                          <span>Volume Pricing Ranges ({svc.tierRates?.length || 1} Tiers)</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => toggleOutsourcedRanges(svc.id)}
                                          className="text-[11px] text-[#003049] hover:underline font-semibold flex items-center space-x-0.5 cursor-pointer"
                                        >
                                          <span>{isRangesExpanded ? 'Hide Ranges' : 'Inspect Ranges'}</span>
                                          <ChevronDown
                                            className={`w-3 h-3 transition-transform ${
                                              isRangesExpanded ? 'rotate-180' : ''
                                            }`}
                                          />
                                        </button>
                                      </div>

                                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {svc.tierRates && svc.tierRates.length > 0 ? (
                                          svc.tierRates.map((tr, idx) => (
                                            <span
                                              key={idx}
                                              className="text-[10px] px-2 py-0.5 bg-white rounded border border-[#ecd5a8] text-[#003049] font-medium shadow-2xs"
                                            >
                                              {tr.description}: <strong className="font-bold">${tr.rate}</strong>
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-[10px] text-slate-500 italic">
                                            Flat contract rate applies across all volumes.
                                          </span>
                                        )}
                                      </div>

                                      {/* Expanded Ranges Drawer */}
                                      {isRangesExpanded && svc.tierRates && (
                                        <div className="pt-2 mt-2 border-t border-amber-200/80 space-y-1.5">
                                          <div className="text-[10px] font-bold text-amber-900 uppercase">
                                            Detailed Volume Bracket Matrix:
                                          </div>
                                          <div className="bg-white rounded-lg border border-amber-200 overflow-hidden text-[11px]">
                                            <table className="w-full text-left">
                                              <thead className="bg-amber-50/60 text-slate-600 border-b border-amber-100">
                                                <tr>
                                                  <th className="py-1 px-2 font-semibold">Volume Range</th>
                                                  <th className="py-1 px-2 font-semibold">Tier Rate</th>
                                                  <th className="py-1 px-2 font-semibold">Scope Description</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-amber-100/60">
                                                {svc.tierRates.map((tr, idx) => (
                                                  <tr key={idx}>
                                                    <td className="py-1 px-2 font-mono font-medium text-slate-900">
                                                      {tr.minVolume} {tr.maxVolume ? `- ${tr.maxVolume}` : '+'} units
                                                    </td>
                                                    <td className="py-1 px-2 font-bold text-[#003049]">
                                                      ${tr.rate}
                                                    </td>
                                                    <td className="py-1 px-2 text-slate-600">{tr.description}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* CHANGE LOGS: Tariff Audit History Section */}
                                    <div className="border border-slate-200 bg-slate-50/80 rounded-xl p-2.5 space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                                          <History className="w-3.5 h-3.5 text-[#003049]" />
                                          <span>Rate Change Logs ({svc.priceHistory?.length || 0} Revisions)</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => toggleOutsourcedHistory(svc.id)}
                                          className="text-[11px] text-[#003049] hover:underline font-semibold flex items-center space-x-0.5 cursor-pointer"
                                        >
                                          <span>{isHistoryExpanded ? 'Collapse Change Log' : 'View Change Log'}</span>
                                          <ChevronDown
                                            className={`w-3 h-3 transition-transform ${
                                              isHistoryExpanded ? 'rotate-180' : ''
                                            }`}
                                          />
                                        </button>
                                      </div>

                                      {/* Most recent revision preview */}
                                      {svc.priceHistory && svc.priceHistory.length > 0 && !isHistoryExpanded && (
                                        <div className="text-[11px] text-slate-600 flex items-center justify-between bg-white px-2 py-1 rounded border border-slate-200">
                                          <span>
                                            Latest: <strong>{svc.priceHistory[0].date}</strong> — ${svc.priceHistory[0].oldRate} → ${svc.priceHistory[0].newRate}
                                          </span>
                                          <span className="text-[10px] text-slate-500 truncate max-w-[180px]" title={svc.priceHistory[0].reason}>
                                            "{svc.priceHistory[0].reason}"
                                          </span>
                                        </div>
                                      )}

                                      {/* Full Expanded Change Logs Drawer */}
                                      {isHistoryExpanded && (
                                        <div className="pt-2 mt-2 border-t border-slate-200 space-y-2">
                                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                            {svc.priceHistory && svc.priceHistory.length > 0 ? (
                                              svc.priceHistory.map((hist) => {
                                                const diff = hist.newRate - hist.oldRate;
                                                const pct = hist.oldRate > 0 ? (diff / hist.oldRate) * 100 : 0;
                                                return (
                                                  <div
                                                    key={hist.id}
                                                    className="bg-white rounded-lg border border-slate-200 p-2 text-xs space-y-1"
                                                  >
                                                    <div className="flex items-center justify-between">
                                                      <span className="font-semibold text-slate-900">{hist.date}</span>
                                                      <span
                                                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                          diff > 0
                                                            ? 'bg-amber-100 text-amber-800'
                                                            : diff < 0
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-slate-100 text-slate-700'
                                                        }`}
                                                      >
                                                        ${hist.oldRate} → ${hist.newRate} ({diff >= 0 ? '+' : ''}
                                                        {pct.toFixed(2)}%)
                                                      </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-600 font-normal">
                                                      <strong>Audit Reason:</strong> {hist.reason}
                                                    </p>
                                                    {hist.updatedBy && (
                                                      <div className="text-[10px] text-slate-400">
                                                        Authorized By: {hist.updatedBy}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })
                                            ) : (
                                              <div className="text-[11px] text-slate-400 italic">
                                                No rate changes recorded yet. Initial baseline rate active.
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                                      <div className="flex items-center space-x-1.5">
                                        <button
                                          type="button"
                                          onClick={() => setActiveOutsourcedRateItem(svc)}
                                          className="px-2.5 py-1 bg-[#003049] hover:bg-[#002235] text-white rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                                        >
                                          <DollarSign className="w-3 h-3 text-[#fdf0d5]" />
                                          <span>Change Rate & Ranges</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setActiveOutsourcedAuditItem(svc)}
                                          className="px-2.5 py-1 bg-[#fdf0d5] hover:bg-[#fae7bc] text-[#003049] border border-[#ecd5a8] rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                        >
                                          <History className="w-3 h-3 text-[#003049]" />
                                          <span>Audit Trail</span>
                                        </button>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveFXTTCard({
                                            cardType: 'outsourced',
                                            cardId: svc.id,
                                            cardTitle: svc.name,
                                            cardSubtitle: `Hired from ${svc.providerName} • $${svc.rate} / ${svc.baseUnitType}`,
                                            cardTag: 'OUTSOURCED'
                                          });
                                        }}
                                        className="text-xs text-[#003049] hover:underline font-semibold flex items-center space-x-1 cursor-pointer"
                                      >
                                        <span>Open in FXTT Grid</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}

              {/* View 2: Full Screen FXTT CRM Grid View for All Outsourced Services */}
              {outsourcedViewMode === 'fxtt_grid' && (
                <FXTTCardItemsListView
                  isModal={true}
                  cardType="outsourced"
                  cardId={selectedOutsourcedSubCatId || selectedOutsourcedCatId || 'all-outsourced'}
                  cardTitle={
                    selectedOutsourcedSubCatId
                      ? categories.find((c) => c.id === selectedOutsourcedSubCatId)?.name || 'Outsourced Service Operations'
                      : selectedOutsourcedCatId
                      ? categories.find((c) => c.id === selectedOutsourcedCatId)?.name || 'Outsourced Service Category'
                      : 'All Outsourced Services'
                  }
                  cardSubtitle={
                    selectedOutsourcedSubCatId
                      ? categories.find((c) => c.id === selectedOutsourcedSubCatId)?.brief || 'Contracted Service Tariffs & Rate Matrix'
                      : 'Enterprise Contracted Service Providers & Rate Matrix'
                  }
                  cardTag="OUTSOURCED SERVICE"
                  categories={categories}
                  materials={materials}
                  suppliers={suppliers}
                  outsourcedServices={outsourcedServices}
                  subcontractors={subcontractors}
                  projects={projects}
                  produceItems={produceItems}
                  onClose={() => setOutsourcedViewMode('hierarchy')}
                  onUpdatePrice={onUpdateMaterialPrice}
                  onUpdateMaterialPrice={onUpdateMaterialPrice}
                  onUpdateMaterial={onUpdateMaterial}
                  onAddSupplier={onAddSupplier}
                />
              )}

              {/* View 3: Master Tariffs, Ranges, Rates & Change Logs Data Table */}
              {outsourcedViewMode === 'items_table' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs space-y-0">
                  {/* Table Control Header */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center space-x-2">
                        <span>Master Outsourced Service Items & Procured Tariffs</span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                          {outsourcedServices.length} Contract Items
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Strictly third-party services hired from external providers with tiered volume pricing ranges, contract rates, and audited change logs.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 flex-wrap">
                      {/* Category Filter Dropdown */}
                      <div className="flex items-center space-x-1 text-xs">
                        <Filter className="w-3.5 h-3.5 text-slate-500" />
                        <select
                          value={outsourcedTableCategoryFilter}
                          onChange={(e) => setOutsourcedTableCategoryFilter(e.target.value)}
                          className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#003049]"
                        >
                          <option value="all">All Outsourced Categories</option>
                          {Array.from(new Set(outsourcedServices.map((s) => s.category))).map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setAddItemPortal('service-providers');
                          setIsAddItemModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-[#003049] hover:bg-[#002235] text-white rounded-lg text-xs font-medium flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#fdf0d5]" />
                        <span>Add Outsourced Item</span>
                      </button>
                    </div>
                  </div>

                  {/* Main Data Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100/80 text-[11px] uppercase tracking-wider text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Service Item & Provider</th>
                          <th className="py-2.5 px-3 font-semibold">Category & Sub-Category</th>
                          <th className="py-2.5 px-3 font-semibold">Billing Unit</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Contract Hired Rate</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Retail Benchmark</th>
                          <th className="py-2.5 px-3 font-semibold">Volume Pricing Ranges</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Change Logs</th>
                          <th className="py-2.5 px-3 font-semibold text-center">SLA & Updated</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {outsourcedServices
                          .filter((s) => {
                            if (
                              outsourcedTableCategoryFilter !== 'all' &&
                              s.category !== outsourcedTableCategoryFilter
                            )
                              return false;
                            if (searchQuery) {
                              const q = searchQuery.toLowerCase();
                              return (
                                s.name.toLowerCase().includes(q) ||
                                s.providerName.toLowerCase().includes(q) ||
                                s.category.toLowerCase().includes(q) ||
                                s.subCategory.toLowerCase().includes(q) ||
                                (s.moreSubCategory && s.moreSubCategory.toLowerCase().includes(q)) ||
                                s.baseUnitType.toLowerCase().includes(q)
                              );
                            }
                            return true;
                          })
                          .map((service) => {
                            const isHistoryOpen = expandedOutsourcedHistoryIds.has(service.id);
                            const isRangesOpen = expandedOutsourcedRangesIds.has(service.id);

                            return (
                              <React.Fragment key={service.id}>
                                <tr className="hover:bg-slate-50/80 transition-colors">
                                  {/* 1. Service Name & Provider */}
                                  <td className="py-2.5 px-3 align-top max-w-[240px]">
                                    <div className="font-bold text-slate-900">{service.name}</div>
                                    <div className="text-[11px] text-[#003049] font-medium flex items-center space-x-1 mt-0.5">
                                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span>Provider: {service.providerName}</span>
                                    </div>
                                    {service.moreSubCategory && (
                                      <div className="text-[10px] text-slate-500 italic mt-0.5 truncate">
                                        {service.moreSubCategory}
                                      </div>
                                    )}
                                  </td>

                                  {/* 2. Category & Sub-Category */}
                                  <td className="py-2.5 px-3 align-top max-w-[220px]">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                                      {service.category}
                                    </span>
                                    <div className="text-[11px] text-slate-700 font-medium mt-1">
                                      {service.subCategory}
                                    </div>
                                  </td>

                                  {/* 3. Billing Unit */}
                                  <td className="py-2.5 px-3 align-top whitespace-nowrap">
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-mono uppercase border border-slate-200">
                                      {service.baseUnitType.replace(/_/g, ' ')}
                                    </span>
                                  </td>

                                  {/* 4. Contract Hired Rate */}
                                  <td className="py-2.5 px-3 align-top text-right whitespace-nowrap">
                                    <div className="font-bold text-[#003049] text-sm">
                                      ${service.rate < 1 ? service.rate.toFixed(3) : service.rate.toFixed(2)}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      / {service.baseUnitType.replace('per_', '')}
                                    </div>
                                  </td>

                                  {/* 5. Retail Benchmark */}
                                  <td className="py-2.5 px-3 align-top text-right whitespace-nowrap">
                                    <div className="font-semibold text-slate-700">
                                      {service.retailPrice
                                        ? `$${service.retailPrice < 1 ? service.retailPrice.toFixed(3) : service.retailPrice.toFixed(2)}`
                                        : '—'}
                                    </div>
                                    <div className="text-[10px] text-slate-400">Benchmark</div>
                                  </td>

                                  {/* 6. Volume Pricing Ranges */}
                                  <td className="py-2.5 px-3 align-top max-w-[220px]">
                                    <div className="space-y-1">
                                      {service.tierRates && service.tierRates.length > 0 ? (
                                        service.tierRates.slice(0, 2).map((tr, idx) => (
                                          <div
                                            key={idx}
                                            className="text-[10px] px-1.5 py-0.5 bg-[#fdf0d5] text-[#003049] rounded border border-[#ecd5a8] truncate"
                                            title={`${tr.description}: $${tr.rate}`}
                                          >
                                            {tr.description}: <strong>${tr.rate}</strong>
                                          </div>
                                        ))
                                      ) : (
                                        <span className="text-[10px] text-slate-400 italic">Flat rate</span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => toggleOutsourcedRanges(service.id)}
                                        className="text-[10px] text-[#003049] hover:underline font-semibold flex items-center space-x-1"
                                      >
                                        <Scale className="w-2.5 h-2.5 text-amber-700" />
                                        <span>
                                          {isRangesOpen ? 'Hide Tiers' : `View All Ranges (${service.tierRates?.length || 1})`}
                                        </span>
                                      </button>
                                    </div>
                                  </td>

                                  {/* 7. Change Logs */}
                                  <td className="py-2.5 px-3 align-top text-center whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => toggleOutsourcedHistory(service.id)}
                                      className="inline-flex items-center space-x-1 px-2 py-1 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                                      title="Click to toggle full historical rate change logs"
                                    >
                                      <History className="w-3 h-3 text-amber-600" />
                                      <span>{service.priceHistory?.length || 0} Revisions</span>
                                      <ChevronDown
                                        className={`w-3 h-3 transition-transform ${isHistoryOpen ? 'rotate-180' : ''}`}
                                      />
                                    </button>
                                    {service.priceHistory && service.priceHistory[0] && (
                                      <div className="text-[10px] text-slate-500 mt-1">
                                        Last: {service.priceHistory[0].date}
                                      </div>
                                    )}
                                  </td>

                                  {/* 8. SLA & Updated */}
                                  <td className="py-2.5 px-3 align-top text-center whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      {service.slaLevel}
                                    </span>
                                    <div className="text-[10px] text-slate-500 mt-1">
                                      {service.lastUpdated}
                                    </div>
                                  </td>

                                  {/* 9. Actions */}
                                  <td className="py-2.5 px-3 align-top text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end space-x-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setActiveOutsourcedRateItem(service)}
                                        className="p-1 px-2 bg-[#003049] hover:bg-[#002235] text-white rounded text-[11px] font-medium flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                                        title="Change contract rate and ranges"
                                      >
                                        <DollarSign className="w-3 h-3 text-[#fdf0d5]" />
                                        <span>Rate</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setActiveOutsourcedAuditItem(service)}
                                        className="p-1 px-2 bg-[#fdf0d5] hover:bg-[#fae7bc] text-[#003049] border border-[#ecd5a8] rounded text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                        title="View comprehensive audit changelog"
                                      >
                                        <History className="w-3 h-3 text-[#003049]" />
                                        <span>Audit</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveFXTTCard({
                                            cardType: 'outsourced',
                                            cardId: service.id,
                                            cardTitle: service.name,
                                            cardSubtitle: `$${service.rate} / ${service.baseUnitType} • ${service.providerName}`,
                                            cardTag: 'OUTSOURCED'
                                          });
                                        }}
                                        className="p-1 hover:bg-slate-200 rounded text-[#003049] transition-colors cursor-pointer"
                                        title="Open in FXTT Grid"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* INLINE EXPANDED ROW: RANGES & CHANGE LOGS FOR THIS ITEM */}
                                {(isHistoryOpen || isRangesOpen) && (
                                  <tr key={`${service.id}-expanded-details`} className="bg-slate-50 border-b border-slate-200">
                                    <td colSpan={9} className="p-3">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
                                        {/* Left Panel: Volume Pricing Ranges */}
                                        <div className="space-y-2 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-4">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-1.5 text-xs font-bold text-[#003049]">
                                              <Scale className="w-3.5 h-3.5 text-amber-600" />
                                              <span>Contract Volume Pricing Ranges</span>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => setActiveOutsourcedRangesItem(service)}
                                              className="text-[11px] text-blue-700 hover:underline font-semibold cursor-pointer"
                                            >
                                              Open Simulator & Calculator
                                            </button>
                                          </div>

                                          <div className="overflow-hidden rounded-lg border border-slate-200">
                                            <table className="w-full text-left text-xs">
                                              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] uppercase">
                                                <tr>
                                                  <th className="py-1 px-2 font-semibold">Tier Bracket</th>
                                                  <th className="py-1 px-2 font-semibold">Unit Rate</th>
                                                  <th className="py-1 px-2 font-semibold">Scope Description</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100 text-[11px]">
                                                {service.tierRates && service.tierRates.length > 0 ? (
                                                  service.tierRates.map((t, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                      <td className="py-1 px-2 font-mono font-semibold text-slate-800">
                                                        {t.minVolume} {t.maxVolume ? `- ${t.maxVolume}` : '+'} units
                                                      </td>
                                                      <td className="py-1 px-2 font-bold text-[#003049]">
                                                        ${t.rate} / {service.baseUnitType.replace('per_', '')}
                                                      </td>
                                                      <td className="py-1 px-2 text-slate-600">{t.description}</td>
                                                    </tr>
                                                  ))
                                                ) : (
                                                  <tr>
                                                    <td colSpan={3} className="py-2 px-2 text-slate-400 italic">
                                                      Flat rate schedule: ${service.rate} / {service.baseUnitType}
                                                    </td>
                                                  </tr>
                                                )}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>

                                        {/* Right Panel: Historical Change Logs */}
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-1.5 text-xs font-bold text-[#003049]">
                                              <History className="w-3.5 h-3.5 text-amber-600" />
                                              <span>Tariff Rate Change Logs & Audit History</span>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => setActiveOutsourcedAuditItem(service)}
                                              className="text-[11px] text-blue-700 hover:underline font-semibold cursor-pointer"
                                            >
                                              Full Audit Modal
                                            </button>
                                          </div>

                                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                            {service.priceHistory && service.priceHistory.length > 0 ? (
                                              service.priceHistory.map((hist) => {
                                                const diff = hist.newRate - hist.oldRate;
                                                const pct = hist.oldRate > 0 ? (diff / hist.oldRate) * 100 : 0;
                                                return (
                                                  <div
                                                    key={hist.id}
                                                    className="bg-slate-50 rounded-lg border border-slate-200 p-2 text-xs space-y-0.5"
                                                  >
                                                    <div className="flex items-center justify-between">
                                                      <span className="font-bold text-slate-800">{hist.date}</span>
                                                      <span
                                                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                                          diff > 0
                                                            ? 'bg-amber-100 text-amber-900'
                                                            : diff < 0
                                                            ? 'bg-emerald-100 text-emerald-900'
                                                            : 'bg-slate-200 text-slate-700'
                                                        }`}
                                                      >
                                                        ${hist.oldRate} → ${hist.newRate} ({diff >= 0 ? '+' : ''}
                                                        {pct.toFixed(2)}%)
                                                      </span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-600">
                                                      <strong className="text-slate-700">Reason:</strong> {hist.reason}
                                                    </div>
                                                    {hist.updatedBy && (
                                                      <div className="text-[10px] text-slate-400">
                                                        Authorized by: {hist.updatedBy}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })
                                            ) : (
                                              <div className="text-slate-400 italic text-xs py-2">
                                                No rate changes logged yet.
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: REVENUE STREAMS (PRODUCTS SUPPLIED & SERVICES RENDERED TO CUSTOMERS) */}
      {(activeTab === 'revenue-streams' || activeTab === 'products-hierarchy' || activeTab === 'services-hierarchy') && (
        <>
          {/* SUB-PORTAL: PRODUCTS (Product categories which we supply) */}
          {revenueSubTab === 'products' && (
            <div className="space-y-4">
              {/* Portal Header: Breadcrumbs & View Switcher (Hierarchy Cards, Full-Screen FXTT Grid, Variants Table) */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center space-x-2 flex-wrap">
                  <button
                    onClick={() => {
                      setSelectedProductCatId(null);
                      setSelectedProductSubCatId(null);
                      setProductViewMode('hierarchy');
                    }}
                    className={`hover:text-[#003049] transition-colors ${!selectedProductCatId ? 'font-medium text-[#003049]' : ''}`}
                  >
                    All Supplied Product Categories (Level 1)
                  </button>

                  {selectedProductCatId && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      <button
                        onClick={() => setSelectedProductSubCatId(null)}
                        className={`hover:text-[#003049] transition-colors ${!selectedProductSubCatId ? 'font-medium text-[#003049]' : ''}`}
                      >
                        {categories.find((c) => c.id === selectedProductCatId)?.name} (Sub-Categories)
                      </button>
                    </>
                  )}

                  {selectedProductSubCatId && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-[#003049]">
                        {categories.find((c) => c.id === selectedProductSubCatId)?.name} (FXTT Grid)
                      </span>
                    </>
                  )}
                </div>

                {/* View Mode Switcher */}
                <div className="flex items-center space-x-1.5">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setProductViewMode('hierarchy')}
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1.5 cursor-pointer ${
                        productViewMode === 'hierarchy'
                          ? 'bg-white text-[#003049] font-medium shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Cards View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductViewMode('fxtt_grid')}
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1.5 cursor-pointer ${
                        productViewMode === 'fxtt_grid'
                          ? 'bg-[#0077b6] text-white font-medium shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Table className="w-3.5 h-3.5" />
                      <span>Full Screen FXTT Grid</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductViewMode('items_table')}
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1.5 cursor-pointer ${
                        productViewMode === 'items_table'
                          ? 'bg-white text-[#003049] font-medium shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ListFilter className="w-3.5 h-3.5" />
                      <span>Variants Table</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* View 1: Hierarchy Cards */}
              {productViewMode === 'hierarchy' && (
                <>
                  {/* Level 1: Categories */}
                  {!selectedProductCatId && (
                    <div>
                      <div className="text-xs text-slate-500 mb-2">
                        Click any product category to drill into assemblies & manufactured models which we supply:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {categories
                          .filter((c) => c.group === 'product' && c.type === 'category')
                          .filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.brief.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((cat) => {
                            const style = getTileStyle(cat.id, cat.themeId);
                            return (
                              <ModernTileCard
                                key={cat.id}
                                id={cat.id}
                                tag="SUPPLIED PRODUCT CATEGORY"
                                title={cat.name}
                                brief={cat.brief}
                                actionLabel="VIEW ASSEMBLIES"
                                actionVariant="button"
                                themeId={style.themeId}
                                customGradient={style.customGradient}
                                onChangeTheme={(tId, grad) => handleUpdateTileTheme(cat.id, tId, grad)}
                                onEdit={() =>
                                  handleOpenEdit('category', cat.id, {
                                    title: cat.name,
                                    name: cat.name,
                                    brief: cat.brief
                                  })
                                }
                                onDelete={() => handleOpenDelete('Product Category', cat.id, cat.name, 'revenue-streams')}
                                onDuplicate={() => handleDuplicate('category', cat.id)}
                                onAction={() => setSelectedProductCatId(cat.id)}
                                onViewListView={() => {
                                  setActiveFXTTCard({
                                    cardType: 'product_category',
                                    cardId: cat.id,
                                    cardTitle: cat.name,
                                    cardSubtitle: cat.brief,
                                    cardTag: 'SUPPLIED PRODUCT CATEGORY'
                                  });
                                }}
                                listViewLabel="FXTT Grid"
                              />
                            );
                          })}
                      </div>
                      {renderCustomTilesForTab('revenue-streams', 'Product Specification')}
                    </div>
                  )}

                  {/* Level 2: Sub-Categories with FXTT Grid View style */}
                  {selectedProductCatId && !selectedProductSubCatId && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="text-xs text-slate-500">Manufactured assemblies for supplied category:</div>
                          <button
                            onClick={() => {
                              setCreateSubCategoryGroup('product');
                              setCreateSubCategoryParentId(selectedProductCatId);
                              setIsCreateSubCategoryModalOpen(true);
                            }}
                            className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 font-normal"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Create Sub-Assembly</span>
                          </button>
                          <button
                            onClick={() => {
                              setAddItemPortal('products-hierarchy');
                              setIsAddItemModalOpen(true);
                            }}
                            className="text-xs text-[#003049] hover:underline flex items-center space-x-1 font-normal ml-2"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Product Item</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const parentCat = categories.find((c) => c.id === selectedProductCatId)?.name;
                              setBulkImportConfig({
                                isOpen: true,
                                targetType: 'produce',
                                categoryScope: parentCat
                              });
                            }}
                            className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center space-x-1 font-semibold ml-2 cursor-pointer shadow-2xs"
                            title="Bulk import products into this category"
                          >
                            <Upload className="w-3 h-3 text-emerald-700" />
                            <span>Bulk Import Product Items</span>
                          </button>
                        </div>
                        <button
                          onClick={() => setSelectedProductCatId(null)}
                          className="text-xs text-[#003049] flex items-center space-x-1 hover:underline cursor-pointer"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          <span>Back to Supplied Categories</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {categories
                          .filter((c) => c.group === 'product' && c.type === 'sub_category' && c.parentId === selectedProductCatId)
                          .filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((subCat) => {
                            const style = getTileStyle(subCat.id, subCat.themeId);
                            const variantsCount = produceItems.filter(
                              (p) =>
                                p.type === 'product' &&
                                (p.subCategory.toLowerCase() === subCat.name.toLowerCase() ||
                                  p.category.toLowerCase() === subCat.name.toLowerCase())
                            ).length || 3;

                            return (
                              <ModernTileCard
                                key={subCat.id}
                                id={subCat.id}
                                tag="PRODUCT SUB-CATEGORY"
                                title={subCat.name}
                                brief={subCat.brief}
                                actionLabel="OPEN FXTT GRID"
                                actionVariant="button"
                                themeId={style.themeId}
                                customGradient={style.customGradient}
                                onChangeTheme={(tId, grad) => handleUpdateTileTheme(subCat.id, tId, grad)}
                                onEdit={() =>
                                  handleOpenEdit('sub_category', subCat.id, {
                                    title: subCat.name,
                                    name: subCat.name,
                                    brief: subCat.brief
                                  })
                                }
                                onDelete={() => handleOpenDelete('Product Sub-Category', subCat.id, subCat.name, 'revenue-streams')}
                                onDuplicate={() => handleDuplicate('sub_category', subCat.id)}
                                onBulkImport={() => {
                                  const parentCat = categories.find((c) => c.id === selectedProductCatId)?.name;
                                  setBulkImportConfig({
                                    isOpen: true,
                                    targetType: 'produce',
                                    categoryScope: parentCat,
                                    subCategoryScope: subCat.name
                                  });
                                }}
                                onAction={() => setSelectedProductSubCatId(subCat.id)}
                                onViewListView={() => setSelectedProductSubCatId(subCat.id)}
                                listViewLabel="FXTT Grid"
                                extraMeta={
                                  <div className="flex items-center justify-between text-[11px] text-white/90 pt-1">
                                    <span className="bg-black/25 px-2 py-0.5 rounded text-[10px] font-mono">
                                      {variantsCount} Variants
                                    </span>
                                    <span className="text-[10px] text-white/80">Full Screen FXTT Grid</span>
                                  </div>
                                }
                              />
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Level 3: Full-Screen FXTT Grid View for Selected Product Sub-Category */}
                  {selectedProductSubCatId && (
                    <FXTTCardItemsListView
                      isModal={true}
                      cardType="product_category"
                      cardId={selectedProductSubCatId}
                      cardTitle={categories.find((c) => c.id === selectedProductSubCatId)?.name || 'Product Variant Assemblies'}
                      cardSubtitle={categories.find((c) => c.id === selectedProductSubCatId)?.brief || 'Engineered Turnkey Product Variants & Specifications'}
                      cardTag="PRODUCT SUB-CATEGORY"
                      categories={categories}
                      materials={materials}
                      suppliers={suppliers}
                      outsourcedServices={outsourcedServices}
                      subcontractors={subcontractors}
                      projects={projects}
                      produceItems={produceItems}
                      onClose={() => setSelectedProductSubCatId(null)}
                      onUpdatePrice={(id, price, reason) => {
                        onUpdateProduceItem?.(id, { costPrice: price, retailPrice: Math.round(price * 1.35) });
                        onUpdateMaterialPrice?.(id, price, reason);
                      }}
                      onUpdateMaterialPrice={onUpdateMaterialPrice}
                      onUpdateMaterial={onUpdateMaterial}
                      onAddSupplier={onAddSupplier}
                      onAddProduceItem={onAddProduceItem}
                      onUpdateProduceItem={onUpdateProduceItem}
                    />
                  )}
                </>
              )}

              {/* View 2: Full-Screen Direct FXTT Grid View for All Revenue Stream Products */}
              {productViewMode === 'fxtt_grid' && (
                <FXTTCardItemsListView
                  isModal={true}
                  cardType="product_category"
                  cardId={selectedProductSubCatId || selectedProductCatId || 'all-products'}
                  cardTitle={
                    selectedProductSubCatId
                      ? categories.find((c) => c.id === selectedProductSubCatId)?.name || 'Product Sub-Categories'
                      : selectedProductCatId
                      ? categories.find((c) => c.id === selectedProductCatId)?.name || 'Supplied Products'
                      : 'All Revenue Streams Product Sub-Categories'
                  }
                  cardSubtitle="Complete Manufactured Product Variants, Assemblies & Technical Specifications"
                  cardTag="REVENUE PRODUCT PORTAL"
                  categories={categories}
                  materials={materials}
                  suppliers={suppliers}
                  outsourcedServices={outsourcedServices}
                  subcontractors={subcontractors}
                  projects={projects}
                  produceItems={produceItems}
                  onClose={() => setProductViewMode('hierarchy')}
                  onUpdatePrice={(id, price, reason) => {
                    onUpdateProduceItem?.(id, { costPrice: price, retailPrice: Math.round(price * 1.35) });
                    onUpdateMaterialPrice?.(id, price, reason);
                  }}
                  onUpdateMaterialPrice={onUpdateMaterialPrice}
                  onUpdateMaterial={onUpdateMaterial}
                  onAddSupplier={onAddSupplier}
                  onAddProduceItem={onAddProduceItem}
                  onUpdateProduceItem={onUpdateProduceItem}
                />
              )}

              {/* View 3: Master Product Variants Table */}
              {productViewMode === 'items_table' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs space-y-0">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center space-x-2">
                        <span>Manufactured Product Variants & Turnkey Deliverables</span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                          {produceItems.filter((p) => p.type === 'product').length} Product Variants
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Strictly produced product deliverables supplied to customers with unique item codes, tiered volume pricing, unit cost rates, and retail pricing.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFXTTCard({
                            cardType: 'product_category',
                            cardId: 'all-products',
                            cardTitle: 'Supplied Product Variants',
                            cardSubtitle: 'Turnkey Manufactured Deliverables & Sub-Categories',
                            cardTag: 'PRODUCT SUB-CATEGORY'
                          });
                        }}
                        className="px-2.5 py-1 bg-[#0077b6] hover:bg-[#005f94] text-white rounded-lg text-xs font-medium flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Table className="w-3.5 h-3.5 text-white" />
                        <span>Open Full Screen FXTT Grid</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100/80 text-[11px] uppercase tracking-wider text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Unique Item Code</th>
                          <th className="py-2.5 px-3 font-semibold">Product Variant Name</th>
                          <th className="py-2.5 px-3 font-semibold">Category</th>
                          <th className="py-2.5 px-3 font-semibold">Sub-Category</th>
                          <th className="py-2.5 px-3 font-semibold">Unit</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Unit Cost Rate</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Quoted Retail</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Lead Time</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {produceItems
                          .filter((p) => p.type === 'product')
                          .map((item) => {
                            const marginPct = item.retailPrice && item.costPrice
                              ? Math.round(((item.retailPrice - item.costPrice) / item.retailPrice) * 100)
                              : 25;

                            return (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-medium text-blue-700">
                                  {item.code}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900">
                                  {item.name}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">{item.category}</td>
                                <td className="py-2.5 px-3 text-slate-600 font-medium">{item.subCategory}</td>
                                <td className="py-2.5 px-3 text-slate-500 font-mono">{item.unit}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                  ${(Number(item.costPrice) || 0).toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                  ${(Number(item.retailPrice) || 0).toLocaleString()}
                                  <span className="ml-1 text-[10px] text-emerald-600 font-normal">
                                    (+{marginPct}%)
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center text-slate-600">
                                  {item.leadTimeDays || 45} days
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                                    {item.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveFXTTCard({
                                        cardType: 'product_category',
                                        cardId: item.id,
                                        cardTitle: item.subCategory || item.category,
                                        cardSubtitle: `${item.code} - ${item.name}`,
                                        cardTag: 'PRODUCT SUB-CATEGORY'
                                      });
                                    }}
                                    className="px-2 py-1 bg-slate-100 hover:bg-[#0077b6] hover:text-white rounded text-[11px] font-medium text-slate-700 transition-colors"
                                  >
                                    FXTT Grid
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUB-PORTAL: SERVICES (Service categories we render to the customer - not others) */}
          {revenueSubTab === 'services' && (
            <div className="space-y-4">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center space-x-2 text-xs text-slate-600">
                <button
                  onClick={() => setSelectedServiceCatId(null)}
                  className={`hover:text-[#003049] transition-colors ${!selectedServiceCatId ? 'font-normal text-[#003049]' : ''}`}
                >
                  All Customer Service Categories (Level 1)
                </button>

                {selectedServiceCatId && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-normal text-[#003049]">
                      {categories.find((c) => c.id === selectedServiceCatId)?.name} (Tariffs & Rates)
                    </span>
                  </>
                )}
              </div>

              {!selectedServiceCatId && (
                <div>
                  <div className="text-xs text-slate-500 mb-2">
                    Click any service category we render to the customer to view billable tariff rates (not outsourced supplier costs):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {categories
                      .filter((c) => c.group === 'service' && c.type === 'category')
                      .filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.brief.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((cat) => {
                        const style = getTileStyle(cat.id, cat.themeId);
                        return (
                          <ModernTileCard
                            key={cat.id}
                            id={cat.id}
                            tag="CUSTOMER SERVICE SCOPE"
                            title={cat.name}
                            brief={cat.brief}
                            actionLabel="VIEW TARIFF RATES"
                            actionVariant="link"
                            themeId={style.themeId}
                            customGradient={style.customGradient}
                            onChangeTheme={(tId, grad) => handleUpdateTileTheme(cat.id, tId, grad)}
                            onEdit={() =>
                              handleOpenEdit('category', cat.id, {
                                title: cat.name,
                                name: cat.name,
                                brief: cat.brief
                              })
                            }
                            onDelete={() => handleOpenDelete('Customer Service Scope', cat.id, cat.name, 'revenue-streams')}
                            onDuplicate={() => handleDuplicate('category', cat.id)}
                            onAction={() => setSelectedServiceCatId(cat.id)}
                            onViewListView={() => {
                              setActiveFXTTCard({
                                cardType: 'service_category',
                                cardId: cat.id,
                                cardTitle: cat.name,
                                cardSubtitle: cat.brief,
                                cardTag: 'CUSTOMER SERVICE SCOPE'
                              });
                            }}
                          />
                        );
                      })}
                  </div>
                </div>
              )}

              {selectedServiceCatId && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="text-xs text-slate-500">Customer service tariffs & billable scopes rendered to clients:</div>
                      <button
                        onClick={() => {
                          setCreateSubCategoryGroup('service');
                          setCreateSubCategoryParentId(selectedServiceCatId);
                          setIsCreateSubCategoryModalOpen(true);
                        }}
                        className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 font-normal"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Create Sub-Scope / Tariff</span>
                      </button>
                      <button
                        onClick={() => {
                          setAddItemPortal('services-hierarchy');
                          setIsAddItemModalOpen(true);
                        }}
                        className="text-xs text-[#003049] hover:underline flex items-center space-x-1 font-normal ml-2"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Service Tariff</span>
                      </button>
                    </div>
                    <button
                      onClick={() => setSelectedServiceCatId(null)}
                      className="text-xs text-[#003049] flex items-center space-x-1 hover:underline"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Back to Customer Service Scopes</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {categories
                      .filter((c) => c.group === 'service' && c.type === 'sub_category' && c.parentId === selectedServiceCatId)
                      .filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((subCat) => {
                        const style = getTileStyle(subCat.id, subCat.themeId);
                        return (
                          <ModernTileCard
                            key={subCat.id}
                            id={subCat.id}
                            tag="CUSTOMER SERVICE TARIFF"
                            title={subCat.name}
                            brief={subCat.brief}
                            actionLabel="AUDIT TARIFFS"
                            actionVariant="link"
                            themeId={style.themeId}
                            customGradient={style.customGradient}
                            onChangeTheme={(tId, grad) => handleUpdateTileTheme(subCat.id, tId, grad)}
                            onEdit={() =>
                              handleOpenEdit('sub_category', subCat.id, {
                                title: subCat.name,
                                name: subCat.name,
                                brief: subCat.brief
                              })
                            }
                            onDelete={() => handleOpenDelete('Customer Service Tariff', subCat.id, subCat.name, 'revenue-streams')}
                            onDuplicate={() => handleDuplicate('sub_category', subCat.id)}
                            onAction={() => {
                              setActiveFXTTCard({
                                cardType: 'service_category',
                                cardId: subCat.id,
                                cardTitle: subCat.name,
                                cardSubtitle: subCat.brief,
                                cardTag: 'CUSTOMER SERVICE TARIFF'
                              });
                            }}
                            onViewListView={() => {
                              setActiveFXTTCard({
                                cardType: 'service_category',
                                cardId: subCat.id,
                                cardTitle: subCat.name,
                                cardSubtitle: subCat.brief,
                                cardTag: 'CUSTOMER SERVICE TARIFF'
                              });
                            }}
                          />
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* TAB: CLIENT ENTERPRISE PROFILES */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {clientProfiles
            .filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.industry.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((client) => {
              const style = getTileStyle(client.id, client.themeId);
              return (
                <ModernTileCard
                  key={client.id}
                  id={client.id}
                  tag={client.status.toUpperCase()}
                  title={client.name}
                  brief={`${client.tagline} • Quoted: $${(client.totalQuotedValue / 1000).toFixed(0)}k`}
                  actionLabel="View Client Details"
                  actionVariant="button"
                  listViewLabel="View Projects"
                  themeId={style.themeId}
                  customGradient={style.customGradient}
                  onChangeTheme={(tId, grad) => handleUpdateTileTheme(client.id, tId, grad)}
                  onEdit={() =>
                    handleOpenEdit('client', client.id, {
                      title: client.name,
                      name: client.name,
                      tagline: client.tagline,
                      industry: client.industry,
                      location: client.location,
                      status: client.status,
                      totalQuotedValue: client.totalQuotedValue,
                      contactPerson: client.contactPerson,
                      email: client.email
                    })
                  }
                  onDelete={() => handleOpenDelete('Client Profile', client.id, client.name, 'clients')}
                  onDuplicate={() => handleDuplicate('client', client.id)}
                  onAction={() => {
                    const clientAssocProjects = projects.filter(
                      (p) =>
                        p.clientName &&
                        (p.clientName.toLowerCase().includes(client.name.toLowerCase()) ||
                          client.name.toLowerCase().includes(p.clientName.toLowerCase()))
                    );
                    setActiveDetailItem({
                      title: client.name,
                      tag: client.status,
                      themeId: style.themeId,
                      customGradient: style.customGradient,
                      description: client.tagline,
                      attributes: [
                        { label: 'Industry Sector', value: client.industry },
                        { label: 'Headquarters', value: client.location },
                        { label: 'Account Tier', value: client.status },
                        {
                          label: 'Active Projects',
                          value: `${clientAssocProjects.length || client.activeProjectsCount} Associated Contracts`
                        },
                        { label: 'Total Quoted Portfolio', value: `$${(Number(client.totalQuotedValue) || 0).toLocaleString()}` },
                        { label: 'Procurement Lead', value: client.contactPerson },
                        { label: 'Official Invoicing Email', value: client.email }
                      ],
                      primaryActionText: 'View Projects in FXTT Grid',
                      onOpenListView: () => {
                        setActiveFXTTCard({
                          cardType: 'client',
                          cardId: client.id,
                          cardTitle: client.name,
                          cardSubtitle: `${client.industry} • ${client.status}`,
                          cardTag: 'CLIENT ACCOUNT'
                        });
                      }
                    });
                  }}
                  onViewListView={() => {
                    setActiveFXTTCard({
                      cardType: 'client',
                      cardId: client.id,
                      cardTitle: client.name,
                      cardSubtitle: `${client.industry} • ${client.status}`,
                      cardTag: 'CLIENT ACCOUNT'
                    });
                  }}
                />
              );
            })}
        </div>
        {renderCustomTilesForTab('clients', 'Client Enterprise')}
      </div>
    )}

      {/* TAB: SUPPLIER PROFILES */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {suppliers
            .filter((s) => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.supplyScope.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((sup, idx) => {
              const defaultTheme = getRandomThemeIndex(idx + 3);
              const style = getTileStyle(sup.id, defaultTheme.id);
              return (
                <ModernTileCard
                  key={sup.id}
                  id={sup.id}
                  tag={`SUPPLIER • ${sup.category.toUpperCase()}`}
                  title={sup.name}
                  brief={`${sup.supplyScope} • ${sup.city}, ${sup.country} • Terms: ${sup.paymentTerms}`}
                  actionLabel="View Supplier Details"
                  actionVariant="button"
                  listViewLabel="All Materials & Supplies"
                  themeId={style.themeId}
                  customGradient={style.customGradient}
                  onChangeTheme={(tId, grad) => handleUpdateTileTheme(sup.id, tId, grad)}
                  onEdit={() =>
                    handleOpenEdit('supplier', sup.id, {
                      title: sup.name,
                      name: sup.name,
                      category: sup.category,
                      supplyScope: sup.supplyScope,
                      city: sup.city,
                      country: sup.country,
                      paymentTerms: sup.paymentTerms,
                      rating: sup.rating,
                      qualityScorePct: sup.qualityScorePct
                    })
                  }
                  onDelete={() => handleOpenDelete('Supplier Profile', sup.id, sup.name, 'suppliers')}
                  onDuplicate={() => handleDuplicate('supplier', sup.id)}
                  onAction={() => {
                    const supAssocMaterials = materials.filter(
                      (m) =>
                        m.supplierId === sup.id ||
                        m.supplierName.toLowerCase() === sup.name.toLowerCase() ||
                        m.vendorQuotes?.some(
                          (vq) => vq.vendorId === sup.id || vq.vendorName.toLowerCase() === sup.name.toLowerCase()
                        )
                    );
                    const supAssocServices = outsourcedServices.filter(
                      (o) => o.providerId === sup.id || o.providerName.toLowerCase() === sup.name.toLowerCase()
                    );
                    const supAssocSubs = subcontractors.filter(
                      (s) => s.subcontractorId === sup.id || s.subcontractorName.toLowerCase() === sup.name.toLowerCase()
                    );
                    const totalItemsCount = supAssocMaterials.length + supAssocServices.length + supAssocSubs.length;

                    setActiveDetailItem({
                      title: sup.name,
                      tag: `SUPPLIER • ${sup.category.toUpperCase()}`,
                      themeId: style.themeId,
                      customGradient: style.customGradient,
                      description: `Primary supply scope: ${sup.supplyScope}. Operational Hub: ${sup.city}, ${sup.country}. Commercial terms: ${sup.paymentTerms}. Performance rating: ${sup.rating} / 5.0 ⭐ with ${sup.qualityScorePct}% quality compliance.`,
                      attributes: [
                        { label: 'Category & Domain', value: sup.category },
                        { label: 'Supply Scope', value: sup.supplyScope },
                        { label: 'Hub Location', value: `${sup.city}, ${sup.country}` },
                        { label: 'Commercial Payment Terms', value: sup.paymentTerms },
                        { label: 'Performance Audit Rating', value: `${sup.rating} / 5.0 ⭐` },
                        { label: 'On-Time Delivery SLA', value: `${sup.onTimeDeliveryPct}%` },
                        { label: 'Quality Acceptance Rate', value: `${sup.qualityScorePct}%` },
                        { label: 'Compliance Score', value: `${sup.complianceScorePct}%` },
                        { label: 'Risk Profile', value: sup.riskLevel },
                        { label: 'Operational Status', value: sup.status },
                        { label: 'Approved Credit Limit', value: `$${(sup.creditLimit || 500000).toLocaleString()} USD` },
                        { label: 'Tax ID / Registration', value: sup.vendorTaxId || 'US-EIN-VERIFIED' },
                        { label: 'Certifications', value: sup.certifications?.join(', ') || 'ISO 9001:2015' },
                        { label: 'Procurement Lead / Contact', value: sup.contactPerson },
                        { label: 'Order Dispatch Email', value: sup.email },
                        { label: 'Direct Phone', value: sup.phone },
                        { label: 'Relevant Materials & Supplies', value: `${totalItemsCount} Verified Items in Catalog` }
                      ],
                      primaryActionText: 'View All Materials & Supplies in FXTT Grid',
                      onOpenListView: () => {
                        setActiveFXTTCard({
                          cardType: 'supplier',
                          cardId: sup.id,
                          cardTitle: sup.name,
                          cardSubtitle: `${sup.supplyScope} • ${sup.city}, ${sup.country}`,
                          cardTag: 'SUPPLIER PORTAL'
                        });
                      }
                    });
                  }}
                  onViewListView={() => {
                    setActiveFXTTCard({
                      cardType: 'supplier',
                      cardId: sup.id,
                      cardTitle: sup.name,
                      cardSubtitle: `${sup.supplyScope} • ${sup.city}, ${sup.country}`,
                      cardTag: 'SUPPLIER PORTAL'
                    });
                  }}
                />
              );
            })}
        </div>
        {renderCustomTilesForTab('suppliers', 'Material Supplier')}
      </div>
    )}

      {/* TAB: SERVICE PROVIDERS */}
      {activeTab === 'service-providers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {outsourcedProvidersList
            .filter((prov) => {
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              return (
                prov.name.toLowerCase().includes(q) ||
                prov.category.toLowerCase().includes(q) ||
                prov.city.toLowerCase().includes(q) ||
                prov.country.toLowerCase().includes(q)
              );
            })
            .map((prov, idx) => {
              const defaultTheme = getRandomThemeIndex(idx + 5);
              const style = getTileStyle(prov.id, defaultTheme.id);
              return (
                <ModernTileCard
                  key={prov.id}
                  id={prov.id}
                  tag="SERVICE PROVIDER"
                  title={prov.name}
                  brief={`${prov.services.length} Outsourced Services • ${prov.city}, ${prov.country} • SLA: ${prov.slaLevel}`}
                  actionLabel="View Provider Details"
                  actionVariant="button"
                  listViewLabel="All Outsourced Services"
                  themeId={style.themeId}
                  customGradient={style.customGradient}
                  onChangeTheme={(tId, grad) => handleUpdateTileTheme(prov.id, tId, grad)}
                  onEdit={() =>
                    handleOpenEdit('service-provider', prov.id, {
                      title: prov.name,
                      providerName: prov.name,
                      name: prov.name,
                      category: prov.category,
                      city: prov.city,
                      country: prov.country,
                      slaLevel: prov.slaLevel,
                      paymentTerms: prov.paymentTerms
                    })
                  }
                  onDelete={() => handleOpenDelete('Service Provider', prov.id, prov.name, 'service-providers')}
                  onDuplicate={() => handleDuplicate('service-provider', prov.id)}
                  onAction={() => {
                    setActiveDetailItem({
                      title: prov.name,
                      tag: 'SERVICE PROVIDER',
                      themeId: style.themeId,
                      customGradient: style.customGradient,
                      description: `${prov.name} — Accredited external service provider specializing in ${prov.category}. Operational dispatch from ${prov.city}, ${prov.country} with contractual guarantee ${prov.slaLevel}.`,
                      attributes: [
                        { label: 'Provider Name', value: prov.name },
                        { label: 'Category & Domain', value: prov.category },
                        { label: 'Operations Hub', value: `${prov.city}, ${prov.country}` },
                        { label: 'Contract SLA Level', value: prov.slaLevel },
                        { label: 'Commercial Payment Terms', value: prov.paymentTerms },
                        { label: 'Performance Rating', value: `${prov.rating} / 5.0 ⭐` },
                        { label: 'Quality & Audit Compliance', value: `${prov.qualityScorePct}%` },
                        { label: 'Relevant Outsourced Services', value: `${prov.services.length} Contracted Services for this Provider only` },
                        { label: 'Primary Contact Person', value: prov.contactPerson },
                        { label: 'Dispatch / SLA Email', value: prov.email },
                        { label: 'Direct Operations Phone', value: prov.phone }
                      ],
                      primaryActionText: 'View All Outsourced Services in FXTT Grid',
                      onOpenListView: () => {
                        setActiveFXTTCard({
                          cardType: 'service_provider',
                          cardId: prov.providerId,
                          cardTitle: prov.name,
                          cardSubtitle: `All Outsourced Services (${prov.services.length} items) • ${prov.city}, ${prov.country}`,
                          cardTag: 'SERVICE PROVIDER'
                        });
                      }
                    });
                  }}
                  onViewListView={() => {
                    setActiveFXTTCard({
                      cardType: 'service_provider',
                      cardId: prov.providerId,
                      cardTitle: prov.name,
                      cardSubtitle: `All Outsourced Services (${prov.services.length} items) • ${prov.city}, ${prov.country}`,
                      cardTag: 'SERVICE PROVIDER'
                    });
                  }}
                />
              );
            })}
        </div>
        {renderCustomTilesForTab('service-providers', 'Service Provider')}
      </div>
    )}

      {/* TAB: SUBCONTRACTOR PROFILES */}
      {activeTab === 'subcontractors' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {subcontractorsList
            .filter((sub) => {
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              return (
                sub.name.toLowerCase().includes(q) ||
                sub.serviceCategory.toLowerCase().includes(q) ||
                sub.serviceType.toLowerCase().includes(q) ||
                sub.city.toLowerCase().includes(q)
              );
            })
            .map((sub, idx) => {
              const defaultTheme = getRandomThemeIndex(idx + 7);
              const style = getTileStyle(sub.id, defaultTheme.id);
              return (
                <ModernTileCard
                  key={sub.id}
                  id={sub.id}
                  tag="SUBCONTRACTOR"
                  title={sub.name}
                  brief={`${sub.ratesCount} Subcontractor Services & Labour Charges • ${sub.city}, ${sub.country} • ${sub.skillLevel}`}
                  actionLabel="View Subcontractor Details"
                  actionVariant="button"
                  listViewLabel="All Subcontractor Services"
                  themeId={style.themeId}
                  customGradient={style.customGradient}
                  onChangeTheme={(tId, grad) => handleUpdateTileTheme(sub.id, tId, grad)}
                  onEdit={() =>
                    handleOpenEdit('subcontractor', sub.id, {
                      title: sub.name,
                      subcontractorName: sub.name,
                      serviceType: sub.serviceType,
                      serviceCategory: sub.serviceCategory,
                      skillLevel: sub.skillLevel,
                      city: sub.city,
                      country: sub.country,
                      paymentTerms: sub.paymentTerms
                    })
                  }
                  onDelete={() => handleOpenDelete('Subcontractor Profile', sub.id, sub.name, 'subcontractors')}
                  onDuplicate={() => handleDuplicate('subcontractor', sub.id)}
                  onAction={() => {
                    setActiveDetailItem({
                      title: sub.name,
                      tag: 'SUBCONTRACTOR PROFILE',
                      themeId: style.themeId,
                      customGradient: style.customGradient,
                      description: `${sub.name} — Specialized trade partner certified for ${sub.serviceCategory}. Operating crew status: ${sub.skillLevel}. Logistics dispatch out of ${sub.city}, ${sub.country}.`,
                      attributes: [
                        { label: 'Subcontractor Name', value: sub.name },
                        { label: 'Trade Category', value: sub.serviceCategory },
                        { label: 'Primary Service Type', value: sub.serviceType },
                        { label: 'Crew Certification Level', value: sub.skillLevel },
                        { label: 'Operations Base', value: `${sub.city}, ${sub.country}` },
                        { label: 'Commercial Payment Terms', value: sub.paymentTerms },
                        { label: 'Performance Audit Rating', value: `${sub.rating} / 5.0 ⭐` },
                        { label: 'Quality Acceptance Score', value: `${sub.qualityScorePct}%` },
                        { label: 'Relevant Subcontractor Services', value: `${sub.ratesCount} Trade Operations & Labour Charges (This Subcontractor Only)` },
                        { label: 'Operations Dispatch Lead', value: sub.contactPerson },
                        { label: 'Dispatch / SLA Email', value: sub.email },
                        { label: 'Direct Crew Phone', value: sub.phone }
                      ],
                      primaryActionText: 'View All Subcontractor Services in FXTT Grid',
                      onOpenListView: () => {
                        setActiveFXTTCard({
                          cardType: 'subcontractor',
                          cardId: sub.subcontractorId,
                          cardTitle: sub.name,
                          cardSubtitle: `All Subcontractor Services & Labour Charges (${sub.ratesCount} items) • ${sub.city}, ${sub.country}`,
                          cardTag: 'SUBCONTRACTOR SERVICES'
                        });
                      }
                    });
                  }}
                  onViewListView={() => {
                    setActiveFXTTCard({
                      cardType: 'subcontractor',
                      cardId: sub.subcontractorId,
                      cardTitle: sub.name,
                      cardSubtitle: `All Subcontractor Services & Labour Charges (${sub.ratesCount} items) • ${sub.city}, ${sub.country}`,
                      cardTag: 'SUBCONTRACTOR SERVICES'
                    });
                  }}
                />
              );
            })}
        </div>
        {renderCustomTilesForTab('subcontractors', 'Subcontractor Crew')}
      </div>
    )}

      {/* 5. MODAL: CREATE GENERIC NEW CARD / TILE */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <PlusCircle className="w-4 h-4 text-[#003049]" />
                <h3 className="text-sm font-normal text-slate-900">Create New Directory Card / Tile</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTileSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-normal">Target Portal Directory</label>
                <select
                  value={createType}
                  onChange={(e: any) => setCreateType(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                >
                  <option value="project">Project Contracts</option>
                  <option value="material-category">Material Categories</option>
                  <option value="product-category">Revenue Streams (Products Supplied)</option>
                  <option value="service-category">Revenue Streams (Services Rendered)</option>
                  <option value="client">Client Enterprise Profiles</option>
                  <option value="supplier">Material Suppliers</option>
                  <option value="service-provider">Outsourced Service Providers</option>
                  <option value="subcontractor">Subcontractor Profiles</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-normal">Card Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. High-Pressure Hydraulic Manifolds"
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-normal">Top Pill Badge Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. CRITICAL ASSEMBLY"
                    value={newCardTag}
                    onChange={(e) => setNewCardTag(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#003049]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-normal">Brief Words / Description</label>
                <input
                  type="text"
                  placeholder="e.g. 7075-T6 Aerospace billet, 450 bar rated"
                  value={newCardBrief}
                  onChange={(e) => setNewCardBrief(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#003049]"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-normal">Color Theme Preset or Custom Gradient</label>
                <ColorGradientPicker
                  selectedThemeId={newCardThemeId}
                  onSelectTheme={(tId, grad) => {
                    setNewCardThemeId(tId);
                    setNewCardCustomGradient(grad);
                  }}
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal transition-colors shadow-xs"
                >
                  Publish Tile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: DEDICATED CREATE CATEGORY MODAL */}
      <CreateCategoryModal
        isOpen={isCreateCategoryModalOpen}
        onClose={() => setIsCreateCategoryModalOpen(false)}
        defaultGroup={createCategoryGroup}
        onSave={handleSaveCategory}
      />

      {/* 7. MODAL: DEDICATED CREATE SUB-CATEGORY MODAL */}
      <CreateSubCategoryModal
        isOpen={isCreateSubCategoryModalOpen}
        onClose={() => setIsCreateSubCategoryModalOpen(false)}
        defaultGroup={createSubCategoryGroup}
        parentCategories={categories}
        defaultParentId={createSubCategoryParentId}
        onSave={handleSaveSubCategory}
      />

      {/* 8. MODAL: DEDICATED ADD ITEM MODAL */}
      <AddItemModal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        portal={addItemPortal}
        categories={categories}
        suppliers={suppliers}
        onSave={handleSaveItem}
      />

      {/* 9. MODAL: UNIVERSAL EDIT CARD MODAL */}
      {editModalData && (
        <EditItemModal
          isOpen={editModalData.isOpen}
          onClose={() => setEditModalData(null)}
          itemType={editModalData.itemType}
          id={editModalData.id}
          initialData={editModalData.initialData}
          onSave={handleSaveEdit}
        />
      )}

      {/* 10. MODAL: DELETE CONFIRMATION MODAL */}
      {deleteModalData && (
        <DeleteConfirmModal
          isOpen={deleteModalData.isOpen}
          onClose={() => setDeleteModalData(null)}
          title={deleteModalData.title}
          entityType={deleteModalData.entityType}
          onConfirm={deleteModalData.onConfirm}
        />
      )}

      {/* 10.5 DEDICATED BULK IMPORT MODAL (MASTER DATA SETS OR SUB-CATEGORY WISE) */}
      {bulkImportConfig && (
        <DataImportExportModal
          isOpen={bulkImportConfig.isOpen}
          onClose={() => setBulkImportConfig(null)}
          targetType={bulkImportConfig.targetType}
          categoryScope={bulkImportConfig.categoryScope}
          subCategoryScope={bulkImportConfig.subCategoryScope}
          materials={materials}
          produceItems={produceItems}
          suppliers={suppliers}
          subcontractors={subcontractors}
          outsourcedServices={outsourcedServices}
          onImportMaterials={(items) => {
            items.forEach((m) => {
              if (onAddMaterial) onAddMaterial(m as any);
              persistentDatabase.addMaterial(m as any);
            });
            showToast(`Successfully imported ${items.length} materials into database!`);
          }}
          onImportProduce={(items) => {
            items.forEach((p) => {
              if (onAddProduceItem) onAddProduceItem(p);
              persistentDatabase.addProduceItem(p as any);
            });
            showToast(`Successfully imported ${items.length} product/produce items into database!`);
          }}
          onImportSubcontractors={(subs) => {
            subs.forEach((s) => {
              if (onAddSubcontractor) onAddSubcontractor(s);
              persistentDatabase.addSubcontractor(s as any);
            });
            showToast(`Successfully imported ${subs.length} subcontractor trade rates into database!`);
          }}
          onImportOutsourced={(svcs) => {
            svcs.forEach((s) => {
              if (onAddOutsourcedService) onAddOutsourcedService(s);
              persistentDatabase.addOutsourcedService(s as any);
            });
            showToast(`Successfully imported ${svcs.length} outsourced service rates into database!`);
          }}
          onImportSuppliers={(sups) => {
            sups.forEach((s) => {
              if (onAddSupplier) onAddSupplier(s);
              persistentDatabase.addSupplier(s as any);
            });
            showToast(`Successfully imported ${sups.length} suppliers into database!`);
          }}
          onNotification={(msg) => showToast(msg)}
        />
      )}

      {/* 11. QUICK DETAIL ITEM POPUP */}
      {activeDetailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-normal uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {activeDetailItem.tag}
                </span>
                <h3 className="text-base font-normal text-slate-900">{activeDetailItem.title}</h3>
              </div>
              <button
                onClick={() => setActiveDetailItem(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div
                className="h-2 rounded-full"
                style={{
                  background:
                    activeDetailItem.customGradient ||
                    getThemeById(activeDetailItem.themeId)?.previewColor ||
                    '#003049'
                }}
              />
              <p className="text-xs text-slate-600 font-normal leading-relaxed">{activeDetailItem.description}</p>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2 text-xs">
                {activeDetailItem.attributes.map((attr, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-200/60 last:border-0">
                    <span className="text-slate-500">{attr.label}</span>
                    <span className="text-slate-900 font-normal">{attr.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              {activeDetailItem.onOpenListView ? (
                <button
                  type="button"
                  onClick={() => {
                    const cb = activeDetailItem.onOpenListView;
                    setActiveDetailItem(null);
                    cb?.();
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-normal transition-colors cursor-pointer shadow-xs"
                >
                  <Table className="w-3.5 h-3.5 text-white/90" />
                  <span>Open in FXTT List View</span>
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={() => setActiveDetailItem(null)}
                className="px-4 py-1.5 rounded-xl bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal transition-colors cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. FXTT CRM LIST VIEW MODAL */}
      {activeFXTTCard && (
        <FXTTCardItemsListView
          isModal={true}
          cardType={activeFXTTCard.cardType}
          cardId={activeFXTTCard.cardId}
          cardTitle={activeFXTTCard.cardTitle}
          cardSubtitle={activeFXTTCard.cardSubtitle}
          cardTag={activeFXTTCard.cardTag}
          categories={categories}
          materials={materials}
          suppliers={suppliers}
          outsourcedServices={outsourcedServices}
          subcontractors={subcontractors}
          projects={projects}
          produceItems={produceItems}
          onClose={() => setActiveFXTTCard(null)}
          onUpdatePrice={(id, price, reason) => {
            if (activeFXTTCard?.cardType === 'product_category' && onUpdateProduceItem) {
              onUpdateProduceItem(id, { costPrice: price, retailPrice: Math.round(price * 1.35) });
            }
            onUpdateMaterialPrice?.(id, price, reason);
          }}
          onUpdateMaterialPrice={(id, price, reason) => {
            onUpdateMaterialPrice?.(id, price, reason);
          }}
          onUpdateMaterial={onUpdateMaterial}
          onDeleteMaterial={onDeleteMaterial}
          onAddMaterial={onAddMaterial}
          onAddSupplier={onAddSupplier}
          onUpdateSupplier={onUpdateSupplier}
          onDeleteSupplier={onDeleteSupplier}
          onAddProduceItem={onAddProduceItem}
          onUpdateProduceItem={onUpdateProduceItem}
          onDeleteProduceItem={onDeleteProduceItem}
          onAddSubcontractor={onAddSubcontractor}
          onUpdateSubcontractor={onUpdateSubcontractor}
          onDeleteSubcontractor={onDeleteSubcontractor}
          onAddOutsourcedService={onAddOutsourcedService}
          onUpdateOutsourcedService={onUpdateOutsourcedService}
          onDeleteOutsourcedService={onDeleteOutsourcedService}
          onSelectProject={(p) => {
            onSelectProject(p);
            setActiveFXTTCard(null);
          }}
          onNavigateToCostAnalysis={(p) => {
            onNavigateToCostAnalysis(p);
            setActiveFXTTCard(null);
          }}
          onAddProject={onAddProject}
          onUpdateProject={onUpdateProject}
          onDeleteProject={onDeleteProject}
        />
      )}

      {/* 13. MODAL: OUTSOURCED RATE & RANGES EDIT MODAL */}
      {activeOutsourcedRateItem && (
        <OutsourcedRateEditModal
          service={activeOutsourcedRateItem}
          onClose={() => setActiveOutsourcedRateItem(null)}
          onSave={(updatedData, reason, auditor) => {
            const histEntry = {
              id: `hist-out-${Date.now()}`,
              date: new Date().toISOString().split('T')[0],
              oldRate: activeOutsourcedRateItem.rate,
              newRate: updatedData.rate,
              reason: reason || 'Contract tariff and volume schedule adjustment',
              updatedBy: auditor || 'Director of Logistics & Utilities'
            };
            onUpdateOutsourcedService?.(activeOutsourcedRateItem.id, {
              ...updatedData,
              lastUpdated: new Date().toISOString().split('T')[0],
              priceHistory: [histEntry, ...(activeOutsourcedRateItem.priceHistory || [])]
            });
            setActiveOutsourcedRateItem(null);
          }}
        />
      )}

      {/* 14. MODAL: OUTSOURCED AUDIT HISTORY CHANGE LOG MODAL */}
      {activeOutsourcedAuditItem && (
        <OutsourcedAuditHistoryModal
          service={activeOutsourcedAuditItem}
          onClose={() => setActiveOutsourcedAuditItem(null)}
        />
      )}

      {/* 15. MODAL: OUTSOURCED VOLUME RANGES & SIMULATOR MODAL */}
      {activeOutsourcedRangesItem && (
        <OutsourcedVolumeRangesModal
          service={activeOutsourcedRangesItem}
          onClose={() => setActiveOutsourcedRangesItem(null)}
        />
      )}
    </div>
  );
};

/* ========================================================================= */
/* DEDICATED MODALS FOR OUTSOURCED SERVICES SUB-PORTAL                       */
/* ========================================================================= */

interface OutsourcedRateEditModalProps {
  service: OutsourcedService;
  onClose: () => void;
  onSave: (
    data: {
      rate: number;
      retailPrice?: number;
      tierRates?: Array<{ minVolume: number; maxVolume?: number; rate: number; description: string }>;
    },
    reason: string,
    auditor: string
  ) => void;
}

const OutsourcedRateEditModal: React.FC<OutsourcedRateEditModalProps> = ({
  service,
  onClose,
  onSave
}) => {
  const [rate, setRate] = useState<number>(service.rate);
  const [retailPrice, setRetailPrice] = useState<number>(service.retailPrice || service.rate * 1.15);
  const [reason, setReason] = useState('');
  const [auditor, setAuditor] = useState('Director of Logistics & Utilities');
  const [tiers, setTiers] = useState(
    service.tierRates ? JSON.parse(JSON.stringify(service.tierRates)) : []
  );

  const handleUpdateTier = (idx: number, field: string, val: any) => {
    setTiers((prev: any[]) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleAddTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const minVol = lastTier ? (lastTier.maxVolume ? lastTier.maxVolume + 1 : lastTier.minVolume + 500) : 1;
    setTiers((prev: any[]) => [
      ...prev,
      {
        minVolume: minVol,
        rate: Number((rate * 0.9).toFixed(2)),
        description: `High-volume bracket (${minVol}+ units)`
      }
    ]);
  };

  const handleRemoveTier = (idx: number) => {
    setTiers((prev: any[]) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      {
        rate: Number(rate),
        retailPrice: Number(retailPrice),
        tierRates: tiers
      },
      reason.trim() || 'Index tariff benchmark and volume schedule adjustment',
      auditor.trim() || 'Director of Logistics & Utilities'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                RATE & RANGES REVISION
              </span>
              <span className="text-xs text-slate-500 font-mono">{service.id.toUpperCase()}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">{service.name}</h3>
            <p className="text-xs text-slate-500">
              Provider: <strong className="text-slate-700">{service.providerName}</strong> • Unit:{' '}
              <strong className="text-slate-700">{service.baseUnitType.replace(/_/g, ' ')}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contract Hired Rate ($ / unit) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 text-xs">$</span>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#003049] focus:outline-none font-bold text-[#003049]"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">What our organization pays to hire this service</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Commercial Benchmark ($)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 text-xs">$</span>
                <input
                  type="number"
                  step="0.001"
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#003049] focus:outline-none text-slate-800"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Typical third-party open market rate</p>
            </div>
          </div>

          {/* Volume Tier Ranges Editor */}
          <div className="border border-amber-200 bg-[#fdf0d5]/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900">
                <Scale className="w-3.5 h-3.5 text-amber-700" />
                <span>Volume Pricing Tier Ranges ({tiers.length} Brackets)</span>
              </div>
              <button
                type="button"
                onClick={handleAddTier}
                className="text-[11px] bg-white border border-[#ecd5a8] text-[#003049] px-2 py-0.5 rounded font-semibold hover:bg-amber-50 cursor-pointer shadow-2xs"
              >
                + Add Range Tier
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {tiers.map((t: any, idx: number) => (
                <div key={idx} className="bg-white rounded-lg border border-amber-200 p-2 text-xs flex items-center gap-2">
                  <div className="w-20">
                    <span className="text-[10px] text-slate-500 block">Min Volume</span>
                    <input
                      type="number"
                      value={t.minVolume}
                      onChange={(e) => handleUpdateTier(idx, 'minVolume', parseInt(e.target.value) || 0)}
                      className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-xs font-mono"
                    />
                  </div>
                  <div className="w-20">
                    <span className="text-[10px] text-slate-500 block">Max Volume</span>
                    <input
                      type="number"
                      placeholder="+"
                      value={t.maxVolume || ''}
                      onChange={(e) =>
                        handleUpdateTier(idx, 'maxVolume', e.target.value ? parseInt(e.target.value) : undefined)
                      }
                      className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-xs font-mono"
                    />
                  </div>
                  <div className="w-24">
                    <span className="text-[10px] text-slate-500 block">Tier Rate ($)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={t.rate}
                      onChange={(e) => handleUpdateTier(idx, 'rate', parseFloat(e.target.value) || 0)}
                      className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-xs font-bold text-[#003049]"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-500 block">Bracket Description</span>
                    <input
                      type="text"
                      value={t.description}
                      onChange={(e) => handleUpdateTier(idx, 'description', e.target.value)}
                      className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTier(idx)}
                    className="p-1 hover:bg-red-50 text-red-600 rounded cursor-pointer mt-3"
                    title="Remove Tier"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Logging Details */}
          <div className="border border-slate-200 bg-slate-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
              <History className="w-3.5 h-3.5 text-[#003049]" />
              <span>Audit Change Log Requirements</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Reason for Tariff Revision <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Fuel surcharge index recalculation, annual contracted volume renegotiation..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#003049] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Authorized Auditor / Officer Name
              </label>
              <input
                type="text"
                value={auditor}
                onChange={(e) => setAuditor(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#003049] focus:outline-none"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[#003049] hover:bg-[#002235] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Commit Revision & Log Change
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* OUTSOURCED AUDIT HISTORY CHANGE LOG MODAL                                 */
/* ========================================================================= */

interface OutsourcedAuditHistoryModalProps {
  service: OutsourcedService;
  onClose: () => void;
}

const OutsourcedAuditHistoryModal: React.FC<OutsourcedAuditHistoryModalProps> = ({
  service,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center space-x-1">
                <History className="w-3 h-3 text-amber-600" />
                <span>OFFICIAL TARIFF AUDIT LOG</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">{service.id.toUpperCase()}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">{service.name}</h3>
            <p className="text-xs text-slate-500">
              Provider: <strong className="text-slate-700">{service.providerName}</strong> • Category:{' '}
              <strong className="text-slate-700">{service.category}</strong> &gt;{' '}
              <span className="text-slate-600">{service.subCategory}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Tariff Overview Banner */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] uppercase text-slate-500 font-semibold block">Current Hired Rate</span>
            <span className="text-base font-bold text-[#003049]">
              ${service.rate < 1 ? service.rate.toFixed(3) : service.rate.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 ml-1">/ {service.baseUnitType.replace('per_', '')}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-500 font-semibold block">Commercial Benchmark</span>
            <span className="text-base font-semibold text-slate-700">
              {service.retailPrice ? `$${service.retailPrice < 1 ? service.retailPrice.toFixed(3) : service.retailPrice.toFixed(2)}` : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-500 font-semibold block">Total Revisions</span>
            <span className="text-base font-bold text-amber-700">{service.priceHistory?.length || 0}</span>
            <span className="text-[10px] text-slate-400 ml-1">audited events</span>
          </div>
        </div>

        {/* Chronological Change Logs Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Chronological Rate Revisions & Authorized Reasons
            </h4>
            <span className="text-[11px] text-slate-500">ISO 9001 / Internal Audit Compliant</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 font-semibold">Effective Date</th>
                  <th className="py-2 px-3 font-semibold">Rate Adjustment</th>
                  <th className="py-2 px-3 font-semibold">Audit Reason & Justification</th>
                  <th className="py-2 px-3 font-semibold">Audited By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {service.priceHistory && service.priceHistory.length > 0 ? (
                  service.priceHistory.map((h) => {
                    const diff = h.newRate - h.oldRate;
                    const pct = h.oldRate > 0 ? (diff / h.oldRate) * 100 : 0;
                    return (
                      <tr key={h.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-800 whitespace-nowrap">
                          {h.date}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900">
                            ${h.oldRate} → ${h.newRate}
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded inline-block mt-0.5 ${
                              diff > 0
                                ? 'bg-amber-100 text-amber-900'
                                : diff < 0
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {diff >= 0 ? '+' : ''}
                            {pct.toFixed(2)}% ({diff >= 0 ? '+$' : '-$'}{Math.abs(diff).toFixed(3)})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          <p className="text-xs leading-relaxed">{h.reason}</p>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {h.updatedBy || 'Director of Procurement'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                      No historical rate revisions recorded. Initial contract baseline rate active.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#003049] hover:bg-[#002235] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* OUTSOURCED VOLUME RANGES & SIMULATOR MODAL                                */
/* ========================================================================= */

interface OutsourcedVolumeRangesModalProps {
  service: OutsourcedService;
  onClose: () => void;
}

const OutsourcedVolumeRangesModal: React.FC<OutsourcedVolumeRangesModalProps> = ({
  service,
  onClose
}) => {
  const [simVolume, setSimVolume] = useState<number>(100);

  // Compute matched tier
  const tiers = service.tierRates || [];
  const matchedTier = tiers.find((t) => {
    if (t.maxVolume) {
      return simVolume >= t.minVolume && simVolume <= t.maxVolume;
    }
    return simVolume >= t.minVolume;
  }) || {
    rate: service.rate,
    description: 'Contract Standard Rate'
  };

  const totalCost = simVolume * matchedTier.rate;
  const baselineCost = simVolume * service.rate;
  const savings = baselineCost - totalCost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-[#fdf0d5] border border-[#ecd5a8] px-2 py-0.5 rounded flex items-center space-x-1">
                <Scale className="w-3 h-3 text-amber-700" />
                <span>CONTRACT VOLUME RANGES</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">{service.id.toUpperCase()}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">{service.name}</h3>
            <p className="text-xs text-slate-500">
              Provider: <strong className="text-slate-700">{service.providerName}</strong> • Unit:{' '}
              <strong className="text-slate-700">{service.baseUnitType.replace(/_/g, ' ')}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tier Range Matrix Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Contract Volume Tier Pricing Brackets
          </h4>
          <div className="overflow-hidden rounded-xl border border-slate-200 text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 font-semibold">Tier Range</th>
                  <th className="py-2 px-3 font-semibold">Contract Rate</th>
                  <th className="py-2 px-3 font-semibold">Description</th>
                  <th className="py-2 px-3 font-semibold text-right">Discount vs Base</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tiers.length > 0 ? (
                  tiers.map((t, idx) => {
                    const discount = service.rate > 0 ? ((service.rate - t.rate) / service.rate) * 100 : 0;
                    const isCurrentMatched =
                      (t.maxVolume ? simVolume >= t.minVolume && simVolume <= t.maxVolume : simVolume >= t.minVolume);

                    return (
                      <tr
                        key={idx}
                        className={isCurrentMatched ? 'bg-amber-50/80 font-medium' : 'hover:bg-slate-50'}
                      >
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                          {t.minVolume} {t.maxVolume ? `- ${t.maxVolume}` : '+'} units
                        </td>
                        <td className="py-2 px-3 font-bold text-[#003049] whitespace-nowrap">
                          ${t.rate} / {service.baseUnitType.replace('per_', '')}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{t.description}</td>
                        <td className="py-2 px-3 text-right font-semibold whitespace-nowrap">
                          {discount > 0 ? (
                            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                              -{discount.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Baseline</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-slate-400 italic">
                      Single flat rate schedule (${service.rate} / {service.baseUnitType})
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Interactive Volume Cost Simulator */}
        <div className="bg-[#fdf0d5]/40 border border-[#ecd5a8] rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Interactive Volume Cost Calculator
            </span>
            <span className="text-[11px] text-amber-800 font-medium">
              Calculates cost at volume tier
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Test Volume Quantity ({service.baseUnitType.replace(/_/g, ' ')})
            </label>
            <input
              type="number"
              min="1"
              value={simVolume}
              onChange={(e) => setSimVolume(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#003049] focus:outline-none font-mono font-bold text-slate-900"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs pt-1">
            <div className="bg-white p-2.5 rounded-lg border border-[#ecd5a8]">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Applied Rate</span>
              <span className="text-sm font-bold text-[#003049]">${matchedTier.rate}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-[#ecd5a8]">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Hired Cost</span>
              <span className="text-sm font-extrabold text-slate-900">
                ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-[#ecd5a8]">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Volume Savings</span>
              <span className="text-sm font-bold text-emerald-700">
                {savings > 0 ? `$${savings.toFixed(2)}` : '$0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#003049] hover:bg-[#002235] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Close Calculator
          </button>
        </div>
      </div>
    </div>
  );
};
