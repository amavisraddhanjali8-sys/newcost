import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Layers,
  FolderPlus,
  FilePlus,
  Check,
  AlertTriangle,
  Briefcase,
  DollarSign,
  Truck,
  Cpu,
  Building2,
  Users,
  ShieldCheck,
  Award,
  Clock,
  MapPin,
  Mail,
  Phone
} from 'lucide-react';
import { CategoryNode, ClientProfile } from '../data/categoriesAndProfiles';
import {
  MaterialItem,
  Supplier,
  OutsourcedService,
  SubcontractorRateItem,
  Project,
  ProduceItem
} from '../types';
import { ColorGradientPicker } from './ColorGradientPicker';
import { peekNextNumber, generateNextNumber } from '../services/autoNumberingService';
import { formatCurrency, formatLKR, SUPPORTED_CURRENCIES, getStoredCurrency } from '../utils/currency';

// ==========================================
// 1. CREATE CATEGORY MODAL (LEVEL 1)
// ==========================================
interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGroup: 'material' | 'product' | 'service' | 'subcontractor' | 'outsourced';
  onSave: (node: Partial<CategoryNode>) => void;
}

export const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  isOpen,
  onClose,
  defaultGroup,
  onSave
}) => {
  const [group, setGroup] = useState<'material' | 'product' | 'service' | 'subcontractor' | 'outsourced'>(defaultGroup);
  const [name, setName] = useState('');
  const [brief, setBrief] = useState('');
  const [themeId, setThemeId] = useState('pacific-sky');
  const [customGradient, setCustomGradient] = useState<string | undefined>();

  useEffect(() => {
    setGroup(defaultGroup);
    setName('');
    setBrief('');
  }, [defaultGroup, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      group,
      type: 'category',
      brief: brief.trim() || `${name} catalog category`,
      themeId,
      customGradient,
      itemCount: 0,
      metaBadge: group === 'subcontractor' ? 'HIRED SUBCONTRACTOR' : group === 'outsourced' ? 'OUTSOURCED' : 'CATALOG ROOT',
      actionText: group === 'subcontractor' ? 'EXPLORE TRADES & RATES' : 'EXPLORE SUB-CATEGORIES'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">New Category</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs text-slate-600 mb-1 font-normal">Group</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setGroup('material')}
                className={`py-1.5 px-2 text-xs rounded-xl border transition-all ${
                  group === 'material'
                    ? 'border-[#003049] bg-[#003049] text-white font-normal shadow-xs'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Materials
              </button>
              <button
                type="button"
                onClick={() => setGroup('subcontractor')}
                className={`py-1.5 px-2 text-xs rounded-xl border transition-all ${
                  group === 'subcontractor'
                    ? 'border-[#003049] bg-[#003049] text-white font-normal shadow-xs'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Subcontractor
              </button>
              <button
                type="button"
                onClick={() => setGroup('outsourced')}
                className={`py-1.5 px-2 text-xs rounded-xl border transition-all ${
                  group === 'outsourced'
                    ? 'border-[#003049] bg-[#003049] text-white font-normal shadow-xs'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Outsourced
              </button>
              <button
                type="button"
                onClick={() => setGroup('product')}
                className={`py-1.5 px-2 text-xs rounded-xl border transition-all ${
                  group === 'product'
                    ? 'border-[#003049] bg-[#003049] text-white font-normal shadow-xs'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Products
              </button>
              <button
                type="button"
                onClick={() => setGroup('service')}
                className={`py-1.5 px-2 text-xs rounded-xl border transition-all ${
                  group === 'service'
                    ? 'border-[#003049] bg-[#003049] text-white font-normal shadow-xs'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Services
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-700 mb-1 font-medium">
              Name *
            </label>
            <input
              type="text"
              required
              placeholder="Category Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-700 mb-1 font-medium">Theme</label>
            <ColorGradientPicker
              compact
              selectedThemeId={themeId}
              onSelectTheme={(tId, grad) => {
                setThemeId(tId);
                setCustomGradient(grad);
              }}
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-[#003049] hover:bg-[#002235] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 2. CREATE SUB-CATEGORY MODAL (LEVEL 2)
// ==========================================
interface CreateSubCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGroup: 'material' | 'product' | 'service' | 'subcontractor' | 'outsourced';
  parentCategories: CategoryNode[];
  defaultParentId?: string;
  onSave: (node: Partial<CategoryNode>) => void;
}

export const CreateSubCategoryModal: React.FC<CreateSubCategoryModalProps> = ({
  isOpen,
  onClose,
  defaultGroup,
  parentCategories,
  defaultParentId,
  onSave
}) => {
  const [group, setGroup] = useState<'material' | 'product' | 'service' | 'subcontractor' | 'outsourced'>(defaultGroup);
  const [parentId, setParentId] = useState<string>(defaultParentId || '');
  const [name, setName] = useState('');
  const [brief, setBrief] = useState('');
  const [themeId, setThemeId] = useState('napa-purple');
  const [customGradient, setCustomGradient] = useState<string | undefined>();

  useEffect(() => {
    setGroup(defaultGroup);
    setName('');
    setBrief('');
    if (defaultParentId) {
      setParentId(defaultParentId);
    } else {
      const firstParent = parentCategories.find((c) => c.group === defaultGroup && c.type === 'category');
      if (firstParent) setParentId(firstParent.id);
    }
  }, [defaultGroup, defaultParentId, isOpen, parentCategories]);

  if (!isOpen) return null;

  const validParents = parentCategories.filter((c) => c.group === group && c.type === 'category');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parentNode = parentCategories.find((c) => c.id === parentId);

    onSave({
      name: name.trim(),
      group,
      type: 'sub_category',
      parentId: parentId || (validParents[0]?.id || ''),
      parentName: parentNode ? parentNode.name : 'General Category',
      brief: brief.trim() || `${name} sub-division`,
      themeId,
      customGradient,
      itemCount: 0,
      metaBadge: group === 'subcontractor' ? 'HIRED TRADE' : group === 'outsourced' ? 'OUTSOURCED SCOPE' : 'SUB-CATEGORY',
      actionText: group === 'subcontractor' ? 'VIEW SERVICE ITEMS & RATES' : 'VIEW DEEP SPECS'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">New Subcategory</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs text-slate-600 mb-1 font-normal">Group</label>
            <div className="grid grid-cols-3 gap-2">
              {(['material', 'product', 'service'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setGroup(g);
                    const matching = parentCategories.filter((c) => c.group === g && c.type === 'category');
                    if (matching.length > 0) setParentId(matching[0].id);
                  }}
                  className={`py-1.5 px-2 text-xs rounded-xl border capitalize transition-all ${
                    group === g
                      ? 'border-[#003049] bg-[#003049] text-white font-normal shadow-xs'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {g}s
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-1 font-normal">Parent Category *</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              required
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
            >
              {validParents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-700 mb-1 font-medium">Name *</label>
            <input
              type="text"
              required
              placeholder="Sub-Category Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-700 mb-1 font-medium">Theme</label>
            <ColorGradientPicker
              compact
              selectedThemeId={themeId}
              onSelectTheme={(tId, grad) => {
                setThemeId(tId);
                setCustomGradient(grad);
              }}
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-[#003049] hover:bg-[#002235] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 3. ADD ITEM MODAL (ACCORDING TO PORTAL)
// ==========================================
interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  portal: string;
  categories: CategoryNode[];
  suppliers: Supplier[];
  onSave: (entityType: string, itemData: any) => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  portal,
  categories,
  suppliers,
  onSave
}) => {
  const normalizePortal = (p: string) => {
    if (!p) return 'material';
    if (p === 'materials-hierarchy' || p === 'materials') return 'material';
    if (p === 'suppliers' || p === 'supplier') return 'supplier';
    if (p === 'subcontractors' || p === 'subcontractor' || p === 'subcontractor-categories') return 'subcontractor';
    if (p === 'outsourced-categories' || p === 'outsourced') return 'outsourced';
    if (p === 'products-hierarchy' || p === 'product' || p === 'produce') return 'produce';
    if (p === 'projects' || p === 'project') return 'project';
    if (p === 'clients' || p === 'client') return 'client';
    return p;
  };

  const [selectedType, setSelectedType] = useState(() => normalizePortal(portal));

  // Common Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [price, setPrice] = useState<number>(15000);
  const [costPrice, setCostPrice] = useState<number>(11000);
  const [stock, setStock] = useState<number>(25);

  // Supplier Specific Form States
  const [supplierScope, setSupplierScope] = useState<'materials' | 'final_product' | 'full_contract' | 'hybrid'>('materials');
  const [supplierContact, setSupplierContact] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('+94 11 234 5678');
  const [supplierCity, setSupplierCity] = useState('Colombo');
  const [supplierCountry, setSupplierCountry] = useState('Sri Lanka');
  const [supplierAddress, setSupplierAddress] = useState('Industrial Zone, Peliyagoda');
  const [supplierPaymentTerms, setSupplierPaymentTerms] = useState('Net 30');
  const [supplierRating, setSupplierRating] = useState<number>(4.8);
  const [supplierQualityScore, setSupplierQualityScore] = useState<number>(98);
  const [supplierCreditLimit, setSupplierCreditLimit] = useState<number>(2500000); // LKR
  const [supplierCertifications, setSupplierCertifications] = useState('ISO 9001:2015, CE Certified');
  const [supplierNotes, setSupplierNotes] = useState('');

  // Subcontractor Specific Form States
  const [subcontractorTrade, setSubcontractorTrade] = useState('Precision CNC 5-Axis Milling & Turning');
  const [subcontractorSkillLevel, setSubcontractorSkillLevel] = useState('Certified Master Journeyman');
  const [subcontractorRateModel, setSubcontractorRateModel] = useState<
    'hourly_labour' | 'daily_rate' | 'bulk_volume' | 'retail_rate' | 'full_contract_lump_sum'
  >('hourly_labour');
  const [subcontractorBaseRate, setSubcontractorBaseRate] = useState<number>(4500); // LKR / hr
  const [subcontractorRetailRate, setSubcontractorRetailRate] = useState<number>(6800); // LKR / hr
  const [subcontractorUnit, setSubcontractorUnit] = useState('hr');
  const [subcontractorShiftMultiplier, setSubcontractorShiftMultiplier] = useState<number>(1.25);
  const [subcontractorLocation, setSubcontractorLocation] = useState('Colombo, Western Province');
  const [subcontractorWeeklyCapacity, setSubcontractorWeeklyCapacity] = useState<number>(160);
  const [subcontractorCrewSize, setSubcontractorCrewSize] = useState<number>(4);
  const [subcontractorNotes, setSubcontractorNotes] = useState('');

  // Outsourced & Misc States
  const [supplierName, setSupplierName] = useState('');
  const [clientName, setClientName] = useState('');
  const [industry, setIndustry] = useState('Industrial Automation');
  const [location, setLocation] = useState('Colombo, Sri Lanka');
  const [slaLevel, setSlaLevel] = useState('Premium 99.9%');
  const [currency, setCurrency] = useState<string>(() => getStoredCurrency());
  const currSymbol = SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol || '$';

  // Auto-Numbering Synchronization
  useEffect(() => {
    const normalized = normalizePortal(portal);
    setSelectedType(normalized);
    setCurrency(getStoredCurrency());
  }, [portal, isOpen]);

  useEffect(() => {
    // Determine auto-number entity key
    let entityKey = selectedType;
    if (selectedType === 'material') entityKey = 'materials';
    else if (selectedType === 'supplier') entityKey = 'suppliers';
    else if (selectedType === 'subcontractor') entityKey = 'subcontractors';
    else if (selectedType === 'project') entityKey = 'projects';

    const autoCode = peekNextNumber(entityKey);
    setCode(autoCode);

    // Contextual defaults
    if (selectedType === 'supplier') {
      setName('');
      setCategory('Raw Stock Materials & Alloys');
      setSubCategory('Aerospace & Engineering Metals');
    } else if (selectedType === 'subcontractor') {
      setName('');
      setCategory('Specialist Industrial Labor');
      setSubCategory('Precision Tooling & CNC Services');
    } else if (selectedType === 'material') {
      setName('');
      const catList = categories.filter((c) => c.type === 'category');
      if (catList.length > 0) setCategory(catList[0].name);
      if (suppliers.length > 0) setSupplierName(suppliers[0].name);
    }
  }, [selectedType, isOpen, categories, suppliers]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let entityKey = selectedType;
    if (selectedType === 'material') entityKey = 'materials';
    else if (selectedType === 'supplier') entityKey = 'suppliers';
    else if (selectedType === 'subcontractor') entityKey = 'subcontractors';
    else if (selectedType === 'project') entityKey = 'projects';

    if (selectedType === 'supplier') {
      // DEDICATED APPROVED SUPPLIER REGISTRATION
      onSave('supplier', {
        id: code.trim(),
        name: name.trim(),
        category: category || 'Raw Stock Materials',
        supplyScope: supplierScope,
        contactPerson: supplierContact || 'Procurement Contact',
        email: supplierEmail || `procurement@${name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'supplier'}.lk`,
        phone: supplierPhone || '+94 11 234 5678',
        city: supplierCity || 'Colombo',
        country: supplierCountry || 'Sri Lanka',
        paymentTerms: supplierPaymentTerms,
        rating: Number(supplierRating) || 4.8,
        qualityScorePct: Number(supplierQualityScore) || 98,
        creditLimit: Number(supplierCreditLimit) || 2500000,
        certifications: supplierCertifications.split(',').map((s) => s.trim()).filter(Boolean),
        currency,
        status: 'Active',
        contractHistory: [],
        notes: supplierNotes || `Registered vendor for ${category || 'industrial supplies'} in ${currency}.`
      });
      generateNextNumber('suppliers', true);
    } else if (selectedType === 'subcontractor') {
      // DEDICATED SUBCONTRACTOR & LABOR SPECIALIST REGISTRATION
      const baseNum = Number(subcontractorBaseRate) || 4500;
      const retailNum = Number(subcontractorRetailRate) || 6800;
      onSave('subcontractor', {
        id: `sub-${Date.now()}`,
        code: code.trim(),
        subcontractorName: name.trim(),
        nicheServiceName: (subcontractorTrade || name).trim(),
        serviceType: (subcontractorTrade || name).trim(),
        serviceCategory: category || 'Specialist Industrial Labor',
        serviceSubCategory: subCategory || 'General Hired Scope',
        rateModel: subcontractorRateModel,
        baseRate: baseNum,
        retailRate: retailNum,
        currency,
        unit: subcontractorUnit || 'hr',
        skillLevel: subcontractorSkillLevel || 'Certified Senior Specialist',
        location: subcontractorLocation || 'Operations Base',
        rateRange: `${currSymbol} ${Math.round(baseNum * 0.9).toLocaleString()} – ${currSymbol} ${Math.round(baseNum).toLocaleString()} / ${subcontractorUnit || 'hr'}`,
        bulkPricingRanges: [
          { minVolume: 1, maxVolume: 50, unitRate: baseNum, discountPct: 0 },
          { minVolume: 51, maxVolume: 200, unitRate: Math.round(baseNum * 0.9), discountPct: 10 },
          { minVolume: 201, unitRate: Math.round(baseNum * 0.82), discountPct: 18 }
        ],
        fullContractEstimate: baseNum * (subcontractorWeeklyCapacity || 160)
      });
      generateNextNumber('subcontractors', true);
    } else if (selectedType === 'material') {
      onSave('material', {
        code: code.trim(),
        name: name.trim(),
        category: category || 'Raw Materials',
        subCategory: subCategory || 'General',
        unit,
        unitPrice: Number(price),
        currency,
        inStock: Number(stock),
        supplierName: supplierName || (suppliers[0]?.name ?? 'Approved Supplier'),
        status: 'Active',
        leadTimeDays: 7
      });
      generateNextNumber('materials', true);
    } else if (selectedType === 'produce') {
      onSave('produce', {
        code: code.trim(),
        name: name.trim(),
        category: category || 'Standard Assemblies',
        subCategory: subCategory || 'General',
        unit,
        currency,
        costPrice: Number(costPrice),
        retailPrice: Number(price),
        leadTimeDays: 14,
        status: 'Active'
      });
      generateNextNumber('produce', true);
    } else if (selectedType === 'outsourced') {
      onSave('outsourced', {
        name: name.trim(),
        providerName: supplierName || 'Specialized Service Partner',
        category: category || 'Specialized Finishing & Heat Treatment',
        baseUnitType: unit || 'per_hour',
        currency,
        rate: Number(costPrice || price * 0.8),
        retailPrice: Number(price),
        slaLevel: slaLevel || 'Standard Guaranteed'
      });
      generateNextNumber('outsourced', true);
    } else if (selectedType === 'project') {
      onSave('project', {
        code: code.trim(),
        name: name.trim(),
        clientName: clientName || 'Valued Client Enterprise',
        productCategory: category || 'Industrial Equipment',
        quotedPrice: Number(price),
        currency,
        targetMarginPct: 28,
        status: 'Proposal'
      });
      generateNextNumber('projects', true);
    } else if (selectedType === 'client') {
      onSave('client', {
        name: name.trim(),
        tagline: `${industry} Enterprise Partner`,
        industry: industry || 'Technology & Manufacturing',
        location: location || 'Colombo, Sri Lanka',
        status: 'Active Partner',
        totalQuotedValue: Number(price),
        contactPerson: 'Lead Commercial Buyer',
        email: `procurement@${name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client'}.lk`
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        {/* Simple Top Row - Header removed as requested */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">
            {selectedType === 'supplier'
              ? 'Add Supplier'
              : selectedType === 'subcontractor'
              ? 'Add Subcontractor'
              : selectedType === 'material'
              ? 'Add Material'
              : selectedType === 'outsourced'
              ? 'Add Service'
              : selectedType === 'produce'
              ? 'Add Product'
              : 'Add Item'}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Target Portal Selector & Currency Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#003049] focus:bg-white"
              >
                <option value="supplier">Supplier</option>
                <option value="subcontractor">Subcontractor</option>
                <option value="material">Material</option>
                <option value="outsourced">Service</option>
                <option value="produce">Product</option>
                <option value="project">Project</option>
                <option value="client">Client</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#003049] focus:bg-white"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 1. SUPPLIER FORM */}
          {selectedType === 'supplier' && (
            <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">

              {/* Supplier Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Company / Supplier Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lanka Precision Metals (Pvt) Ltd"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Vendor Code (Auto)
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-sky-50/70 border border-sky-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-sky-950 focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>

              {/* Supply Scope & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">Supply Scope</label>
                  <select
                    value={supplierScope}
                    onChange={(e) => setSupplierScope(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-sky-600"
                  >
                    <option value="materials">Raw Materials & Alloys Only</option>
                    <option value="final_product">Final Manufactured Assemblies</option>
                    <option value="full_contract">Turnkey Full Contract</option>
                    <option value="hybrid">Hybrid Materials & Specialized Processing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Commodity Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Structural Alloys & Fasteners"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>

              {/* Contact Person, Email, Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sunil Perera"
                    value={supplierContact}
                    onChange={(e) => setSupplierContact(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Business Email
                  </label>
                  <input
                    type="email"
                    placeholder="orders@supplier.lk"
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Business Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+94 11 234 5678"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>

              {/* Location: City, Country, Address */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={supplierCity}
                    onChange={(e) => setSupplierCity(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">Country</label>
                  <input
                    type="text"
                    value={supplierCountry}
                    onChange={(e) => setSupplierCountry(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={supplierPaymentTerms}
                    onChange={(e) => setSupplierPaymentTerms(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-sky-600"
                  >
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Immediate">Immediate / Advance</option>
                    <option value="LC Escrow">LC / Commercial Escrow</option>
                  </select>
                </div>
              </div>

              {/* Financials & Quality: Credit Limit (LKR), Rating, Certifications */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Credit Limit (LKR / Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    value={supplierCreditLimit}
                    onChange={(e) => setSupplierCreditLimit(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Quality Score (%)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={supplierQualityScore}
                    onChange={(e) => setSupplierQualityScore(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Quality Rating (1-5)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={supplierRating}
                    onChange={(e) => setSupplierRating(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-700 font-medium mb-1">
                  Certifications & Standards
                </label>
                <input
                  type="text"
                  placeholder="e.g. ISO 9001:2015, SLS Certified, CE Certified"
                  value={supplierCertifications}
                  onChange={(e) => setSupplierCertifications(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-sky-600"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. SUBCONTRACTOR FORM */}
          {selectedType === 'subcontractor' && (
            <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {/* Contractor Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Subcontractor name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
              </div>

              {/* Trade / Specialty & Skill Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Trade / Service Specialty *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Precision CNC 5-Axis Milling"
                    value={subcontractorTrade}
                    onChange={(e) => setSubcontractorTrade(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Certified Skill Level
                  </label>
                  <select
                    value={subcontractorSkillLevel}
                    onChange={(e) => setSubcontractorSkillLevel(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                  >
                    <option value="Certified Master Journeyman">Certified Master Journeyman (Level 4)</option>
                    <option value="Senior Certified Specialist">Senior Certified Specialist (Level 3)</option>
                    <option value="Class A Heavy Operator">Class A Heavy Operator / Technician</option>
                    <option value="Associate Trade Craftsman">Associate Trade Craftsman (Level 2)</option>
                  </select>
                </div>
              </div>

              {/* Rate Model & Rates in LKR */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Rate Model
                  </label>
                  <select
                    value={subcontractorRateModel}
                    onChange={(e) => setSubcontractorRateModel(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                  >
                    <option value="hourly_labour">Hourly Billable (hr)</option>
                    <option value="daily_rate">Daily Shift Rate (day)</option>
                    <option value="bulk_volume">Tiered Volume Schedule</option>
                    <option value="retail_rate">Commercial Retail Schedule</option>
                    <option value="full_contract_lump_sum">Full Contract Lump Sum</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Internal Base Cost ({currSymbol} / {subcontractorUnit}) *
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={subcontractorBaseRate}
                    onChange={(e) => setSubcontractorBaseRate(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Retail Client Billable ({currSymbol} / {subcontractorUnit}) *
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={subcontractorRetailRate}
                    onChange={(e) => setSubcontractorRetailRate(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              {/* Unit, Multiplier, Crew, Location */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">Unit</label>
                  <input
                    type="text"
                    value={subcontractorUnit}
                    onChange={(e) => setSubcontractorUnit(e.target.value)}
                    placeholder="hr, day, unit"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Night Multiplier
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    value={subcontractorShiftMultiplier}
                    onChange={(e) => setSubcontractorShiftMultiplier(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">Crew Size</label>
                  <input
                    type="number"
                    min="1"
                    value={subcontractorCrewSize}
                    onChange={(e) => setSubcontractorCrewSize(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Capacity (Hrs/Wk)
                  </label>
                  <input
                    type="number"
                    min="10"
                    value={subcontractorWeeklyCapacity}
                    onChange={(e) => setSubcontractorWeeklyCapacity(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-700 font-medium mb-1">
                  Operating Base / Region
                </label>
                <input
                  type="text"
                  value={subcontractorLocation}
                  onChange={(e) => setSubcontractorLocation(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                />
              </div>
            </div>
          )}

          {/* 3. MATERIAL FORM */}
          {selectedType === 'material' && (
            <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {/* Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Material name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
              </div>

              {/* Category & Sub-Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Titanium & Superalloys"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">Sub-Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Aerospace Rods & Bars"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Price, Cost, Stock in LKR */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Retail Price ({currSymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Cost Price ({currSymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="pcs, kg, m"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Stock & Supplier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">In Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Approved Preferred Supplier
                  </label>
                  <select
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.city || 'Sri Lanka'})
                      </option>
                    ))}
                    {suppliers.length === 0 && (
                      <option value="Lanka Precision Metals">Lanka Precision Metals</option>
                    )}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. OTHER ENTITIES (OUTSOURCED, PRODUCE, PROJECT, CLIENT) */}
          {/* ========================================================================= */}
          {selectedType !== 'supplier' && selectedType !== 'subcontractor' && selectedType !== 'material' && (
            <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-700 font-medium mb-1">Item / Record Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">Code (Auto)</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">Sub-Category</label>
                  <input
                    type="text"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Value / Quoted Price ({currSymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Cost Price ({currSymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">Unit / Location</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 4. UNIVERSAL EDIT CARD MODAL
// ==========================================
interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: string;
  id: string;
  initialData: Record<string, any>;
  onSave: (id: string, updatedData: Record<string, any>) => void;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  isOpen,
  onClose,
  itemType,
  id,
  initialData,
  onSave
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    setFormData({ ...initialData });
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(id, formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">
            Edit {formData.name || formData.title || itemType}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {itemType === 'project' ? (
            <div className="space-y-3">
              {/* Project Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-600 mb-1 font-normal">Project Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name || formData.title || ''}
                    onChange={(e) => {
                      handleChange('name', e.target.value);
                      handleChange('title', e.target.value);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-normal">Project Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code || ''}
                    onChange={(e) => handleChange('code', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#003049]"
                  />
                </div>
              </div>

              {/* Client Name & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-normal">Client Organization</label>
                  <input
                    type="text"
                    value={formData.clientName || ''}
                    onChange={(e) => handleChange('clientName', e.target.value)}
                    placeholder="e.g. Boeing Tier-1 Aero Structures"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-normal">Project Status</label>
                  <select
                    value={formData.status || 'Proposal'}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                  >
                    <option value="Proposal">Proposal</option>
                    <option value="Quoted">Quoted</option>
                    <option value="Budget Approved">Budget Approved</option>
                    <option value="In Execution">In Execution</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Contract Signed & Locked">Contract Signed & Locked</option>
                    <option value="Review">Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Target Product / Deliverable */}
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-normal">Target Product / Machine System</label>
                <input
                  type="text"
                  value={formData.targetProduct || ''}
                  onChange={(e) => handleChange('targetProduct', e.target.value)}
                  placeholder="e.g. Hydraulic Multi-Axis Precision Forming Station"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                />
              </div>

              {/* Financials: Quoted Price, Target Margin %, Overhead %, Contingency % */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1 font-normal">Quoted Price ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.quotedPrice ?? 0}
                    onChange={(e) => handleChange('quotedPrice', Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1 font-normal">Target Margin (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.targetMarginPct ?? 35}
                    onChange={(e) => handleChange('targetMarginPct', Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1 font-normal">Overhead (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.overheadPct ?? 8.5}
                    onChange={(e) => handleChange('overheadPct', Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1 font-normal">Contingency (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.contingencyPct ?? 5.0}
                    onChange={(e) => handleChange('contingencyPct', Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
              </div>

              {/* Start Date & Delivery Deadline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-normal">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate || ''}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-normal">Delivery Deadline</label>
                  <input
                    type="date"
                    value={formData.deliveryDeadline || ''}
                    onChange={(e) => handleChange('deliveryDeadline', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
              </div>

              {/* Tile Color / Gradient Selector in Edit Modal */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block text-xs font-normal text-slate-700 mb-2">Tile Color &amp; Gradient Theme</label>
                <ColorGradientPicker
                  compact
                  selectedThemeId={formData.themeId || 'pacific-sky'}
                  onSelectTheme={(newTheme, newCustom) => {
                    handleChange('themeId', newTheme);
                    handleChange('customGradient', newCustom);
                  }}
                />
              </div>

              {/* Scope Notes */}
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-normal">Project Scope Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                />
              </div>
            </div>
          ) : (
            <>
              {/* Main Title / Name */}
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-normal">Card / Entity Name</label>
                <input
                  type="text"
                  required
                  value={formData.title || formData.name || formData.subcontractorName || formData.providerName || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (formData.title !== undefined) handleChange('title', val);
                    if (formData.name !== undefined) handleChange('name', val);
                    if (formData.subcontractorName !== undefined) handleChange('subcontractorName', val);
                    if (formData.providerName !== undefined) handleChange('providerName', val);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                />
              </div>

              {/* Brief Words / Subtitle */}
              {(formData.brief !== undefined || formData.tagline !== undefined) && (
                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-normal">Brief Words / Description</label>
                  <input
                    type="text"
                    value={formData.brief || formData.tagline || ''}
                    onChange={(e) => {
                      if (formData.brief !== undefined) handleChange('brief', e.target.value);
                      if (formData.tagline !== undefined) handleChange('tagline', e.target.value);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
              )}

              {/* Category / Scope */}
              {(formData.category || formData.serviceType || formData.supplyScope) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1 font-normal">Category / Classification</label>
                    <input
                      type="text"
                      value={formData.category || formData.serviceType || ''}
                      onChange={(e) => {
                        if (formData.category !== undefined) handleChange('category', e.target.value);
                        if (formData.serviceType !== undefined) handleChange('serviceType', e.target.value);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1 font-normal">Sub-Scope / Sub-Category</label>
                    <input
                      type="text"
                      value={formData.subCategory || formData.supplyScope || formData.location || ''}
                      onChange={(e) => {
                        if (formData.subCategory !== undefined) handleChange('subCategory', e.target.value);
                        if (formData.supplyScope !== undefined) handleChange('supplyScope', e.target.value);
                        if (formData.location !== undefined) handleChange('location', e.target.value);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    />
                  </div>
                </div>
              )}

              {/* Pricing / Values / Rates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(formData.quotedPrice !== undefined || formData.unitPrice !== undefined || formData.retailPrice !== undefined || formData.totalQuotedValue !== undefined || formData.rate !== undefined || formData.baseRate !== undefined) && (
                  <div>
                    <label className="block text-xs text-slate-600 mb-1 font-normal">
                      {formData.quotedPrice !== undefined
                        ? 'Quoted Price ($)'
                        : formData.totalQuotedValue !== undefined
                        ? 'Total Quoted Value ($)'
                        : formData.baseRate !== undefined
                        ? 'Base Hourly Rate ($)'
                        : 'Unit / Retail Rate ($)'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={
                        formData.quotedPrice ??
                        formData.unitPrice ??
                        formData.retailPrice ??
                        formData.totalQuotedValue ??
                        formData.rate ??
                        formData.baseRate ??
                        0
                      }
                      onChange={(e) => {
                        const num = Number(e.target.value);
                        if (formData.quotedPrice !== undefined) handleChange('quotedPrice', num);
                        if (formData.unitPrice !== undefined) handleChange('unitPrice', num);
                        if (formData.retailPrice !== undefined) handleChange('retailPrice', num);
                        if (formData.totalQuotedValue !== undefined) handleChange('totalQuotedValue', num);
                        if (formData.rate !== undefined) handleChange('rate', num);
                        if (formData.baseRate !== undefined) handleChange('baseRate', num);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    />
                  </div>
                )}

                {(formData.costPrice !== undefined || formData.inStock !== undefined || formData.targetMarginPct !== undefined || formData.rating !== undefined || formData.skillLevel !== undefined) && (
                  <div>
                    <label className="block text-xs text-slate-600 mb-1 font-normal">
                      {formData.targetMarginPct !== undefined
                        ? 'Target Margin (%)'
                        : formData.inStock !== undefined
                        ? 'In Stock Qty'
                        : formData.rating !== undefined
                        ? 'Rating (out of 5.0)'
                        : formData.costPrice !== undefined
                        ? 'Unit Cost ($)'
                        : 'Certification / Skill Level'}
                    </label>
                    <input
                      type={formData.skillLevel !== undefined ? 'text' : 'number'}
                      step="any"
                      value={
                        formData.targetMarginPct ??
                        formData.inStock ??
                        formData.rating ??
                        formData.costPrice ??
                        formData.skillLevel ??
                        ''
                      }
                      onChange={(e) => {
                        const val = formData.skillLevel !== undefined ? e.target.value : Number(e.target.value);
                        if (formData.targetMarginPct !== undefined) handleChange('targetMarginPct', val);
                        if (formData.inStock !== undefined) handleChange('inStock', val);
                        if (formData.rating !== undefined) handleChange('rating', val);
                        if (formData.costPrice !== undefined) handleChange('costPrice', val);
                        if (formData.skillLevel !== undefined) handleChange('skillLevel', val);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 5. DELETE CONFIRMATION MODAL
// ==========================================
interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entityType: string;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  title,
  entityType,
  onConfirm
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Delete {entityType}?</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 py-3">
          Delete <strong className="text-slate-900">{title}</strong>?
        </p>

        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
