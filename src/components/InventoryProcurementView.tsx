import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Barcode,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Building2,
  Package,
  X,
  Camera,
  Check,
  Layers,
  ArrowRight,
  RotateCcw,
  Keyboard,
  ScanLine,
  FileText,
  ShieldCheck,
  Printer,
  Plus,
  Trash2,
  Edit2,
  SlidersHorizontal,
  CheckSquare,
  Square,
  Minus,
  ListPlus,
  HelpCircle
} from 'lucide-react';
import { MaterialItem, Project, InventoryItem, Supplier, InventoryTransaction } from '../types';
import { INITIAL_MATERIALS } from '../data/initialData';
import { generateBarcodeBits } from '../utils/barcodeGenerator';
import { CameraBarcodeScanner } from './CameraBarcodeScanner';
import { generateNextNumber, peekNextNumber } from '../services/autoNumberingService';
import { formatLKR } from '../utils/currency';
import { persistentDatabase } from '../services/persistentDatabase';
import { addBarcodeScanListener, playHardwareScanBeep } from '../services/globalBarcodeScanner';

// Barcode Visual SVG Renderer
export const BarcodeVisual: React.FC<{ code: string; className?: string }> = ({ code, className = '' }) => {
  const bits = useMemo(() => generateBarcodeBits(code || 'ITEM'), [code]);
  const barWidth = 2;
  const height = 38;
  const totalWidth = bits.length * barWidth;

  return (
    <div className={`inline-flex flex-col items-center bg-white px-2.5 py-1 border border-slate-300 rounded shadow-2xs ${className}`}>
      <svg width={totalWidth} height={height} className="block">
        {bits.split('').map((bit, idx) =>
          bit === '1' ? (
            <rect key={idx} x={idx * barWidth} y={0} width={barWidth} height={height} fill="#0f172a" />
          ) : null
        )}
      </svg>
      <span className="font-mono text-[10px] font-bold text-slate-800 tracking-wider mt-0.5">
        *{code.toUpperCase()}*
      </span>
    </div>
  );
};

export interface InventoryProcurementViewProps {
  materials?: MaterialItem[];
  inventory?: InventoryItem[];
  projects?: Project[];
  suppliers?: Supplier[];
  onAddInventoryItem?: (item: Partial<InventoryItem>) => void;
  onUpdateInventoryStock?: (id: string, onHand: number) => void;
  onRecordTransaction?: (transaction: InventoryTransaction) => void;
}

export type ScanValidationStatus = 'VALID' | 'WARNING_LOW_STOCK' | 'WARNING_ZERO_STOCK' | 'UNRECOGNIZED';

// Staged Scanned Item in Pending Review Tray
export interface PendingReviewItem {
  id: string;
  barcode: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  type: 'IN' | 'OUT';
  quantity: number;
  price: number;
  discountPct: number;
  projectId: string;
  batchLot: string;
  requisitionNumber: string;
  notes?: string;
  selected: boolean;
  scanCount: number;
  scanTimestamp: number;
  validationStatus: ScanValidationStatus;
  validationMessage: string;
  currentAvailableStock: number;
}

// Manual Bulk Modal Row
interface BulkRowItem {
  id: string;
  materialId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  price: number;
  discountPct: number;
  projectId: string;
  batchLot: string;
}

export const InventoryProcurementView: React.FC<InventoryProcurementViewProps> = ({
  materials: propMaterials,
  inventory = [],
  projects = [],
  suppliers = [],
  onRecordTransaction,
  onUpdateInventoryStock
}) => {
  // Materials state
  const [materials, setMaterials] = useState<MaterialItem[]>(
    propMaterials && propMaterials.length > 0 ? propMaterials : INITIAL_MATERIALS
  );

  useEffect(() => {
    if (propMaterials && propMaterials.length > 0) {
      setMaterials(propMaterials);
    }
  }, [propMaterials]);

  // Traceability Slip Modal
  const [traceabilityModalTx, setTraceabilityModalTx] = useState<InventoryTransaction | null>(null);

  // Transaction Type: 'IN' or 'OUT'
  const [transactionType, setTransactionType] = useState<'IN' | 'OUT'>('IN');

  // Project Selection
  const [selectedProjectId, setSelectedProjectId] = useState<string>('none');
  const [projectSearchQuery, setProjectSearchQuery] = useState<string>('');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState<boolean>(false);
  const projectDropdownRef = useRef<HTMLDivElement | null>(null);

  // Material Selection & Scanner Mode
  const [scanInputMode, setScanInputMode] = useState<'MANUAL' | 'CAMERA'>('MANUAL');
  const [materialSearchQuery, setMaterialSearchQuery] = useState<string>('');
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);
  const [isMaterialDropdownOpen, setIsMaterialDropdownOpen] = useState<boolean>(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const materialDropdownRef = useRef<HTMLDivElement | null>(null);

  // Auto-Add scanned barcodes to Pending Review Tray toggle
  const [autoAddToPendingTray, setAutoAddToPendingTray] = useState<boolean>(true);

  // Dedicated 'Pending Review' Tray before committing to inventory ledger
  const [pendingReviewItems, setPendingReviewItems] = useState<PendingReviewItem[]>([]);

  // Individual item being edited in dedicated review modal
  const [editingPendingItem, setEditingPendingItem] = useState<PendingReviewItem | null>(null);

  // Selected Recorded Transaction IDs for batch operations (select/reject)
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());

  // Form Details for single manual record
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [discountPct, setDiscountPct] = useState<number>(0);

  // Notification Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Transaction History
  const [recentTransactions, setRecentTransactions] = useState<InventoryTransaction[]>(() => {
    return persistentDatabase.getTransactions([
      {
        id: 'tx-init-1',
        transactionNumber: 'TX-IN-00101',
        type: 'IN',
        date: new Date().toISOString().slice(0, 10),
        timestamp: '11:42 AM',
        projectId: 'prj-1',
        projectCode: 'PRJ-AERO-01',
        projectName: 'Commercial Airliner Wing Assembly',
        materialId: 'mat-01',
        materialCode: 'MAT-ALU-6061-T6',
        materialName: 'Aerospace Structural Aluminum 6061-T6 Plate (12mm)',
        barcode: 'MAT-ALU-6061-T6',
        inventorySku: 'SKU-ALU-01',
        batchLotNumber: 'LOT-2026-0089',
        supplierId: 'sup-01',
        supplierName: 'Vanguard Aerospace Materials Ltd',
        requisitionNumber: 'REQ-2026-0101',
        currency: 'LKR',
        quantity: 25,
        unit: 'sheet',
        price: 420,
        discount: 8,
        discountAmount: 840,
        totalAmount: 9660,
        previousAvailableQuantity: 120,
        newAvailableQuantity: 145
      },
      {
        id: 'tx-init-2',
        transactionNumber: 'TX-OUT-00102',
        type: 'OUT',
        date: new Date().toISOString().slice(0, 10),
        timestamp: '10:15 AM',
        projectId: 'none',
        projectCode: 'GENERAL',
        projectName: 'No Project / General Inventory',
        materialId: 'mat-02',
        materialCode: 'MAT-SS-316L',
        materialName: 'Stainless Steel 316L Precision Ground Round Bar (50mm)',
        barcode: 'MAT-SS-316L',
        inventorySku: 'SKU-SS-02',
        batchLotNumber: 'LOT-2026-0090',
        supplierId: 'sup-02',
        supplierName: 'Apex Precision Metals',
        requisitionNumber: 'REQ-2026-0102',
        currency: 'LKR',
        quantity: 5,
        unit: 'm',
        price: 270.75,
        discount: 0,
        discountAmount: 0,
        totalAmount: 1353.75,
        previousAvailableQuantity: 20,
        newAvailableQuantity: 15
      }
    ]);
  });

  // Keep static database synced
  useEffect(() => {
    if (recentTransactions && recentTransactions.length > 0) {
      persistentDatabase.saveTransactions(recentTransactions);
    }
  }, [recentTransactions]);

  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  // Manual Bulk Transactions Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [bulkRows, setBulkRows] = useState<BulkRowItem[]>([]);

  // Edit Transaction State
  const [editingTx, setEditingTx] = useState<InventoryTransaction | null>(null);

  // Delete/Reject Transaction State
  const [deletingTx, setDeletingTx] = useState<InventoryTransaction | null>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
      if (materialDropdownRef.current && !materialDropdownRef.current.contains(event.target as Node)) {
        setIsMaterialDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered Projects for selection
  const filteredProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return projects;
    const q = projectSearchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.code?.toLowerCase().includes(q) ||
        p.name?.toLowerCase().includes(q) ||
        p.clientName?.toLowerCase().includes(q)
    );
  }, [projects, projectSearchQuery]);

  const selectedProject = useMemo(() => {
    if (selectedProjectId === 'none') return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Filtered Materials for autocomplete
  const filteredMaterials = useMemo(() => {
    if (!materialSearchQuery.trim()) return materials.slice(0, 15);
    const q = materialSearchQuery.toLowerCase();
    return materials.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        (m.barcode && m.barcode.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q))
    );
  }, [materials, materialSearchQuery]);

  // Select material from list
  const handleSelectMaterial = (material: MaterialItem) => {
    setSelectedMaterial(material);
    setMaterialSearchQuery(`${material.code} - ${material.name}`);
    setIsMaterialDropdownOpen(false);
    setPrice(material.retailPrice || 0);
    setDiscountPct(0);
    setQuantity(1);
  };

  /**
   * =========================================================================
   * DEDICATED VALIDATION LAYER FOR BARCODE SCAN LISTENER
   * Validates format, catalog existence, stock sufficiency, and feasibility
   * =========================================================================
   */
  const validateScannedBarcode = (
    rawCode: string,
    targetType: 'IN' | 'OUT',
    targetQuantity: number = 1
  ): {
    isValid: boolean;
    code: string;
    material: MaterialItem | null;
    status: ScanValidationStatus;
    message: string;
    availableStock: number;
    unit: string;
    price: number;
  } => {
    const code = rawCode.trim();
    if (!code || code.length < 2) {
      return {
        isValid: false,
        code,
        material: null,
        status: 'UNRECOGNIZED',
        message: 'Invalid barcode format (too short)',
        availableStock: 0,
        unit: 'pcs',
        price: 0
      };
    }

    // 1. Catalog Match
    let found = materials.find(
      (m) =>
        m.barcode?.toLowerCase() === code.toLowerCase() ||
        m.code.toLowerCase() === code.toLowerCase() ||
        m.id.toLowerCase() === code.toLowerCase() ||
        code.toLowerCase().includes(m.code.toLowerCase())
    );

    if (!found && inventory) {
      const invItem = inventory.find(
        (i) =>
          i.barcode?.toLowerCase() === code.toLowerCase() ||
          i.sku?.toLowerCase() === code.toLowerCase()
      );
      if (invItem) {
        found = materials.find((m) => m.id === invItem.materialId || m.name === invItem.materialName);
      }
    }

    if (!found) {
      return {
        isValid: false,
        code,
        material: null,
        status: 'UNRECOGNIZED',
        message: `Barcode "${code}" not found in catalog. Review required.`,
        availableStock: 0,
        unit: 'pcs',
        price: 0
      };
    }

    // 2. Stock & Business Rule Validation
    const availableStock = found.inStock || 0;
    const unit = found.unit || 'pcs';
    const price = found.retailPrice || 0;

    if (targetType === 'OUT') {
      if (availableStock <= 0) {
        return {
          isValid: false,
          code,
          material: found,
          status: 'WARNING_ZERO_STOCK',
          message: `Zero Stock Alert: 0 ${unit} available. Dispatch will create negative stock.`,
          availableStock,
          unit,
          price
        };
      }
      if (targetQuantity > availableStock) {
        return {
          isValid: false,
          code,
          material: found,
          status: 'WARNING_LOW_STOCK',
          message: `Low Stock: Requested ${targetQuantity} ${unit} exceeds current ${availableStock} ${unit}.`,
          availableStock,
          unit,
          price
        };
      }
    }

    return {
      isValid: true,
      code,
      material: found,
      status: 'VALID',
      message: `Verified: ${found.code} (${availableStock} ${unit} in stock)`,
      availableStock,
      unit,
      price
    };
  };

  /**
   * Main scan listener entry point with validation layer
   * Stages items into the 'Pending Review Tray' before committing to ledger
   */
  const handleValidatedScanInput = (scannedCode: string, source: 'HARDWARE' | 'CAMERA' | 'MANUAL') => {
    const clean = scannedCode.trim();
    if (!clean) return;

    // Run dedicated validation
    const validation = validateScannedBarcode(clean, transactionType, 1);

    if (validation.material) {
      handleSelectMaterial(validation.material);
    }

    if (!autoAddToPendingTray) {
      setScanFeedback(validation.message);
      setTimeout(() => setScanFeedback(null), 3000);
      return;
    }

    // Stage into the Pending Review Tray
    setPendingReviewItems((prev) => {
      // Check if already in pending review tray with matching type
      const existingIdx = prev.findIndex(
        (item) =>
          (validation.material
            ? item.materialId === validation.material.id
            : item.barcode.toLowerCase() === clean.toLowerCase()) && item.type === transactionType
      );

      if (existingIdx !== -1) {
        const next = [...prev];
        const existing = next[existingIdx];
        const newQty = existing.quantity + 1;

        // Re-validate with new combined quantity
        const reval = validateScannedBarcode(clean, existing.type, newQty);

        next[existingIdx] = {
          ...existing,
          quantity: newQty,
          scanCount: (existing.scanCount || 1) + 1,
          selected: true,
          validationStatus: reval.status,
          validationMessage: reval.message
        };
        return next;
      }

      const newItem: PendingReviewItem = {
        id: `pending-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        barcode: clean,
        materialId: validation.material ? validation.material.id : `unrecognized-${clean}`,
        materialCode: validation.material ? validation.material.code : clean,
        materialName: validation.material ? validation.material.name : `Uncatalogued Barcode: ${clean}`,
        unit: validation.unit,
        type: transactionType,
        quantity: 1,
        price: validation.price,
        discountPct: 0,
        projectId: selectedProjectId,
        batchLot: `LOT-${Date.now().toString().slice(-4)}`,
        requisitionNumber: `REQ-${Date.now().toString().slice(-4)}`,
        notes: '',
        selected: true,
        scanCount: 1,
        scanTimestamp: Date.now(),
        validationStatus: validation.status,
        validationMessage: validation.message,
        currentAvailableStock: validation.availableStock
      };

      return [newItem, ...prev];
    });

    playHardwareScanBeep(validation.status === 'VALID');
    setScanFeedback(
      validation.status === 'VALID'
        ? `Validated & Added to Pending Tray: ${validation.material?.code || clean}`
        : `Added to Tray with Alert: ${validation.message}`
    );
    setTimeout(() => setScanFeedback(null), 3500);
  };

  // Hardware scanner listener subscription
  useEffect(() => {
    const unsubscribe = addBarcodeScanListener((detail) => {
      setScanInputMode('MANUAL');
      setMaterialSearchQuery(detail.code);
      handleValidatedScanInput(detail.code, 'HARDWARE');
    });
    return unsubscribe;
  }, [materials, inventory, transactionType, selectedProjectId, autoAddToPendingTray]);

  /**
   * =========================================================================
   * PENDING REVIEW TRAY ACTIONS (SELECT, REJECT, EDIT, COMMIT)
   * =========================================================================
   */

  // Toggle selection for an item in pending tray
  const handleToggleSelectPending = (id: string) => {
    setPendingReviewItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  // Select / Deselect all in pending tray
  const handleSelectAllPending = (select: boolean) => {
    setPendingReviewItems((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  // Inline update field for an item in pending tray
  const handleUpdatePendingItem = (id: string, updates: Partial<PendingReviewItem>) => {
    setPendingReviewItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...updates };

        // If quantity, type, or material changed, re-run stock validation
        if (updates.quantity !== undefined || updates.type !== undefined || updates.materialId !== undefined) {
          const mat = materials.find((m) => m.id === next.materialId);
          if (mat) {
            next.currentAvailableStock = mat.inStock || 0;
            const reval = validateScannedBarcode(mat.code, next.type, next.quantity);
            next.validationStatus = reval.status;
            next.validationMessage = reval.message;
          }
        }
        return next;
      })
    );
  };

  // Reject a single item individually (removes from tray, leaves ledger untouched)
  const handleRejectPendingItem = (id: string) => {
    const target = pendingReviewItems.find((i) => i.id === id);
    setPendingReviewItems((prev) => prev.filter((item) => item.id !== id));
    setNotification({
      type: 'success',
      message: `Rejected ${target?.materialCode || 'item'} from Pending Review Tray.`
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Reject all selected items from pending tray
  const handleRejectSelectedPending = () => {
    const remaining = pendingReviewItems.filter((item) => !item.selected);
    const rejectedCount = pendingReviewItems.length - remaining.length;
    setPendingReviewItems(remaining);
    setNotification({
      type: 'success',
      message: `Rejected ${rejectedCount} selected item(s) from Pending Review Tray.`
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Clear / Reject entire pending tray
  const handleClearPendingTray = () => {
    setPendingReviewItems([]);
    setNotification({
      type: 'success',
      message: 'Pending Review Tray cleared.'
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Save changes from individual Edit Modal
  const handleSaveEditingPendingItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPendingItem) return;

    const mat = materials.find((m) => m.id === editingPendingItem.materialId);
    const reval = validateScannedBarcode(
      mat ? mat.code : editingPendingItem.barcode,
      editingPendingItem.type,
      editingPendingItem.quantity
    );

    const updatedItem: PendingReviewItem = {
      ...editingPendingItem,
      materialCode: mat ? mat.code : editingPendingItem.materialCode,
      materialName: mat ? mat.name : editingPendingItem.materialName,
      unit: mat ? mat.unit || editingPendingItem.unit : editingPendingItem.unit,
      currentAvailableStock: mat ? mat.inStock : editingPendingItem.currentAvailableStock,
      validationStatus: reval.status,
      validationMessage: reval.message
    };

    setPendingReviewItems((prev) =>
      prev.map((i) => (i.id === updatedItem.id ? updatedItem : i))
    );

    setEditingPendingItem(null);
    setNotification({
      type: 'success',
      message: `Updated details for ${updatedItem.materialCode}.`
    });
    setTimeout(() => setNotification(null), 3000);
  };

  /**
   * Commit Pending Items to the Inventory Ledger
   * This is where state mutations and ledger commits actually take place
   */
  const handleCommitPendingToLedger = (onlySelected: boolean = false) => {
    const itemsToCommit = onlySelected
      ? pendingReviewItems.filter((item) => item.selected)
      : pendingReviewItems;

    if (itemsToCommit.length === 0) return;

    // Check for critical block warnings (zero stock on OUT)
    const zeroStockItem = itemsToCommit.find(
      (item) => item.type === 'OUT' && item.currentAvailableStock <= 0
    );
    if (zeroStockItem) {
      setNotification({
        type: 'error',
        message: `Cannot commit: ${zeroStockItem.materialCode} has 0 available stock. Reject or change to IN.`
      });
      return;
    }

    const newTransactions: InventoryTransaction[] = [];
    const stockDeltas: Record<string, number> = {};

    for (const item of itemsToCommit) {
      let mat = materials.find((m) => m.id === item.materialId || m.code === item.materialCode);

      // If item was uncatalogued, dynamically create or link it
      if (!mat) {
        const generatedId = `mat-scan-${Date.now()}`;
        mat = {
          id: generatedId,
          code: item.materialCode,
          name: item.materialName,
          category: 'Scanned Materials',
          unit: item.unit || 'pcs',
          costPrice: item.price,
          retailPrice: item.price,
          inStock: 0,
          minStock: 5,
          supplier: 'Direct Supplier',
          barcode: item.barcode
        };
        // Will be merged into materials below
      }

      const rowQty = Math.max(0.01, item.quantity || 1);
      const rowPrice = Math.max(0, item.price || 0);
      const rowDisc = Math.max(0, Math.min(100, item.discountPct || 0));
      const sub = rowQty * rowPrice;
      const discAmt = (sub * rowDisc) / 100;
      const total = Math.max(0, sub - discAmt);

      const currentStock = stockDeltas[mat.id] !== undefined ? stockDeltas[mat.id] : mat.inStock;
      const calculatedNewStock = item.type === 'IN' ? currentStock + rowQty : currentStock - rowQty;
      stockDeltas[mat.id] = calculatedNewStock;

      const txNumber = generateNextNumber(item.type === 'IN' ? 'inventory_in' : 'inventory_out');
      const proj = projects.find((p) => p.id === item.projectId);

      const tx: InventoryTransaction = {
        id: `tx-scanned-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        transactionNumber: txNumber,
        type: item.type,
        date: new Date().toISOString().slice(0, 10),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        projectId: item.projectId === 'none' ? undefined : item.projectId,
        projectCode: proj ? proj.code : 'GENERAL',
        projectName: proj ? proj.name : 'General Inventory',
        materialId: mat.id,
        materialCode: mat.code,
        materialName: mat.name,
        barcode: item.barcode || mat.code,
        inventorySku: `SKU-${mat.code}`,
        batchLotNumber: item.batchLot || `LOT-${Date.now().toString().slice(-4)}`,
        supplierId: mat.supplierId || 'sup-01',
        supplierName: mat.supplier || 'Approved Supplier',
        requisitionNumber: item.requisitionNumber || `REQ-${Date.now().toString().slice(-4)}`,
        currency: 'LKR',
        quantity: rowQty,
        unit: item.unit || 'pcs',
        price: rowPrice,
        discount: rowDisc,
        discountAmount: discAmt,
        totalAmount: total,
        previousAvailableQuantity: currentStock,
        newAvailableQuantity: calculatedNewStock
      };

      newTransactions.push(tx);
      if (onRecordTransaction) onRecordTransaction(tx);
    }

    // Apply stock changes
    setMaterials((prev) =>
      prev.map((m) => {
        if (stockDeltas[m.id] !== undefined) {
          if (onUpdateInventoryStock) onUpdateInventoryStock(m.id, stockDeltas[m.id]);
          return { ...m, inStock: stockDeltas[m.id] };
        }
        return m;
      })
    );

    // Prepend to ledger history
    setRecentTransactions((prev) => [...newTransactions, ...prev]);

    // Remove committed items from pending review tray
    const committedIds = new Set(itemsToCommit.map((i) => i.id));
    setPendingReviewItems((prev) => prev.filter((i) => !committedIds.has(i.id)));

    setNotification({
      type: 'success',
      message: `Committed ${newTransactions.length} item(s) to inventory ledger.`
    });
    setTimeout(() => setNotification(null), 4000);
  };

  /**
   * =========================================================================
   * SINGLE FORM TRANSACTION HANDLER
   * =========================================================================
   */
  const currentAvailable = selectedMaterial ? selectedMaterial.inStock : 0;
  const unit = selectedMaterial ? selectedMaterial.unit || 'pcs' : 'pcs';

  const subtotal = (quantity || 0) * (price || 0);
  const discountAmount = (subtotal * (discountPct || 0)) / 100;
  const totalAmount = Math.max(0, subtotal - discountAmount);

  const newAvailable =
    transactionType === 'IN'
      ? currentAvailable + (quantity || 0)
      : currentAvailable - (quantity || 0);

  const isStockInsufficient = transactionType === 'OUT' && (quantity || 0) > currentAvailable;

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMaterial) {
      setNotification({ type: 'error', message: 'Select a material first.' });
      return;
    }

    if (!quantity || quantity <= 0) {
      setNotification({ type: 'error', message: 'Quantity must be greater than zero.' });
      return;
    }

    if (transactionType === 'OUT' && quantity > currentAvailable) {
      setNotification({
        type: 'error',
        message: `Insufficient stock (${currentAvailable} ${unit}). Cannot dispatch ${quantity} ${unit}.`
      });
      return;
    }

    const calculatedNewStock = transactionType === 'IN' ? currentAvailable + quantity : currentAvailable - quantity;
    const transactionNumber = generateNextNumber(transactionType === 'IN' ? 'inventory_in' : 'inventory_out');
    const batchLotNumber = generateNextNumber('batch_lot');

    const matchingInventoryItem = inventory?.find(i => i.materialId === selectedMaterial.id || i.sku === selectedMaterial.code);
    const linkedSku = matchingInventoryItem ? matchingInventoryItem.sku : `SKU-${selectedMaterial.code}`;
    const linkedSupplier = suppliers?.find(s => s.id === selectedMaterial.supplierId || s.name === selectedMaterial.supplier);

    const newTx: InventoryTransaction = {
      id: `tx-${Date.now()}`,
      transactionNumber,
      type: transactionType,
      date: new Date().toISOString().slice(0, 10),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      projectId: selectedProjectId === 'none' ? undefined : selectedProjectId,
      projectCode: selectedProject ? selectedProject.code : 'GENERAL',
      projectName: selectedProject ? selectedProject.name : 'General Inventory',
      materialId: selectedMaterial.id,
      materialCode: selectedMaterial.code,
      materialName: selectedMaterial.name,
      barcode: selectedMaterial.code,
      inventoryItemId: matchingInventoryItem?.id,
      inventorySku: linkedSku,
      batchLotNumber,
      supplierId: linkedSupplier?.id || selectedMaterial.supplierId || 'sup-01',
      supplierName: linkedSupplier?.name || selectedMaterial.supplier || 'Approved Supplier',
      requisitionNumber: `REQ-${Date.now().toString().slice(-4)}`,
      currency: 'LKR',
      quantity,
      unit,
      price,
      discount: discountPct,
      discountAmount,
      totalAmount,
      previousAvailableQuantity: currentAvailable,
      newAvailableQuantity: calculatedNewStock
    };

    setMaterials((prev) =>
      prev.map((m) =>
        m.id === selectedMaterial.id ? { ...m, inStock: calculatedNewStock } : m
      )
    );

    setSelectedMaterial((prev) => (prev ? { ...prev, inStock: calculatedNewStock } : null));
    setRecentTransactions((prev) => [newTx, ...prev]);

    if (onRecordTransaction) onRecordTransaction(newTx);
    if (onUpdateInventoryStock) onUpdateInventoryStock(selectedMaterial.id, calculatedNewStock);

    setQuantity(1);
    setNotification({
      type: 'success',
      message: `Recorded ${transactionType} [${transactionNumber}]: ${quantity} ${unit} of ${selectedMaterial.code}. Total: Rs. ${formatLKR(totalAmount, false)}.`
    });

    setTimeout(() => setNotification(null), 4000);
  };

  /**
   * =========================================================================
   * MANUAL BULK MODAL HANDLERS
   * =========================================================================
   */
  const handleOpenBulkModal = () => {
    const firstMat = materials[0];
    const initialRows: BulkRowItem[] = [
      {
        id: `bulk-row-1`,
        materialId: firstMat?.id || '',
        type: 'IN',
        quantity: 10,
        price: firstMat?.retailPrice || 100,
        discountPct: 0,
        projectId: 'none',
        batchLot: `LOT-${Date.now().toString().slice(-4)}`
      },
      {
        id: `bulk-row-2`,
        materialId: materials[1]?.id || firstMat?.id || '',
        type: 'IN',
        quantity: 5,
        price: materials[1]?.retailPrice || 150,
        discountPct: 0,
        projectId: 'none',
        batchLot: `LOT-${(Date.now() + 1).toString().slice(-4)}`
      }
    ];
    setBulkRows(initialRows);
    setIsBulkModalOpen(true);
  };

  const handleAddBulkRow = () => {
    const firstMat = materials[0];
    const newRow: BulkRowItem = {
      id: `bulk-row-${Date.now()}`,
      materialId: firstMat?.id || '',
      type: 'IN',
      quantity: 1,
      price: firstMat?.retailPrice || 100,
      discountPct: 0,
      projectId: 'none',
      batchLot: `LOT-${Date.now().toString().slice(-4)}`
    };
    setBulkRows((prev) => [...prev, newRow]);
  };

  const handleRemoveBulkRow = (rowId: string) => {
    setBulkRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleUpdateBulkRow = (rowId: string, updates: Partial<BulkRowItem>) => {
    setBulkRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const next = { ...r, ...updates };
        if (updates.materialId && updates.materialId !== r.materialId) {
          const mat = materials.find((m) => m.id === updates.materialId);
          if (mat) {
            next.price = mat.retailPrice || 0;
          }
        }
        return next;
      })
    );
  };

  const handleSaveBulkTransactions = () => {
    if (bulkRows.length === 0) {
      setIsBulkModalOpen(false);
      return;
    }

    const newTransactions: InventoryTransaction[] = [];
    const stockDeltas: Record<string, number> = {};

    for (const row of bulkRows) {
      const mat = materials.find((m) => m.id === row.materialId);
      if (!mat) continue;

      const rowQty = Math.max(0.01, row.quantity || 1);
      const rowPrice = Math.max(0, row.price || 0);
      const rowDisc = Math.max(0, Math.min(100, row.discountPct || 0));
      const sub = rowQty * rowPrice;
      const discAmt = (sub * rowDisc) / 100;
      const total = Math.max(0, sub - discAmt);

      const currentStock = stockDeltas[mat.id] !== undefined ? stockDeltas[mat.id] : mat.inStock;
      const calculatedNewStock = row.type === 'IN' ? currentStock + rowQty : currentStock - rowQty;
      stockDeltas[mat.id] = calculatedNewStock;

      const txNumber = generateNextNumber(row.type === 'IN' ? 'inventory_in' : 'inventory_out');
      const proj = projects.find((p) => p.id === row.projectId);

      const tx: InventoryTransaction = {
        id: `tx-bulk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        transactionNumber: txNumber,
        type: row.type,
        date: new Date().toISOString().slice(0, 10),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        projectId: row.projectId === 'none' ? undefined : row.projectId,
        projectCode: proj ? proj.code : 'GENERAL',
        projectName: proj ? proj.name : 'General Inventory',
        materialId: mat.id,
        materialCode: mat.code,
        materialName: mat.name,
        barcode: mat.code,
        inventorySku: `SKU-${mat.code}`,
        batchLotNumber: row.batchLot || `LOT-${Date.now().toString().slice(-4)}`,
        supplierId: mat.supplierId || 'sup-01',
        supplierName: mat.supplier || 'Approved Supplier',
        requisitionNumber: `REQ-${Date.now().toString().slice(-4)}`,
        currency: 'LKR',
        quantity: rowQty,
        unit: mat.unit || 'pcs',
        price: rowPrice,
        discount: rowDisc,
        discountAmount: discAmt,
        totalAmount: total,
        previousAvailableQuantity: currentStock,
        newAvailableQuantity: calculatedNewStock
      };

      newTransactions.push(tx);
      if (onRecordTransaction) onRecordTransaction(tx);
    }

    setMaterials((prev) =>
      prev.map((m) => {
        if (stockDeltas[m.id] !== undefined) {
          if (onUpdateInventoryStock) onUpdateInventoryStock(m.id, stockDeltas[m.id]);
          return { ...m, inStock: stockDeltas[m.id] };
        }
        return m;
      })
    );

    setRecentTransactions((prev) => [...newTransactions, ...prev]);

    setIsBulkModalOpen(false);
    setNotification({
      type: 'success',
      message: `Saved ${newTransactions.length} bulk transactions.`
    });
    setTimeout(() => setNotification(null), 4000);
  };

  /**
   * =========================================================================
   * RECORDED TRANSACTIONS ACTIONS (EDIT, DELETE, BATCH REJECT)
   * =========================================================================
   */
  const handleSaveEditedTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    const oldTx = recentTransactions.find((t) => t.id === editingTx.id);
    if (!oldTx) return;

    const qtyDiff = editingTx.quantity - oldTx.quantity;
    const sub = editingTx.quantity * editingTx.price;
    const discAmt = (sub * (editingTx.discount || 0)) / 100;
    const total = Math.max(0, sub - discAmt);

    const mat = materials.find((m) => m.id === editingTx.materialId);
    if (mat) {
      let updatedStock = mat.inStock;
      if (editingTx.type === 'IN') {
        updatedStock += qtyDiff;
      } else {
        updatedStock -= qtyDiff;
      }

      setMaterials((prev) =>
        prev.map((m) => (m.id === mat.id ? { ...m, inStock: updatedStock } : m))
      );
      if (onUpdateInventoryStock) onUpdateInventoryStock(mat.id, updatedStock);
    }

    const updatedTx: InventoryTransaction = {
      ...editingTx,
      discountAmount: discAmt,
      totalAmount: total
    };

    setRecentTransactions((prev) =>
      prev.map((t) => (t.id === updatedTx.id ? updatedTx : t))
    );

    setEditingTx(null);
    setNotification({
      type: 'success',
      message: `Updated transaction ${updatedTx.transactionNumber || updatedTx.id}.`
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleConfirmDeleteTransaction = () => {
    if (!deletingTx) return;

    const mat = materials.find((m) => m.id === deletingTx.materialId);
    if (mat) {
      let revertedStock = mat.inStock;
      if (deletingTx.type === 'IN') {
        revertedStock -= deletingTx.quantity;
      } else {
        revertedStock += deletingTx.quantity;
      }

      setMaterials((prev) =>
        prev.map((m) => (m.id === mat.id ? { ...m, inStock: revertedStock } : m))
      );
      if (onUpdateInventoryStock) onUpdateInventoryStock(mat.id, revertedStock);
    }

    setRecentTransactions((prev) => prev.filter((t) => t.id !== deletingTx.id));
    setSelectedHistoryIds((prev) => {
      const next = new Set(prev);
      next.delete(deletingTx.id);
      return next;
    });

    setNotification({
      type: 'success',
      message: `Rejected and removed transaction ${deletingTx.transactionNumber || deletingTx.id}. Stock restored.`
    });

    setDeletingTx(null);
    setTimeout(() => setNotification(null), 3000);
  };

  // Batch reject selected recorded transactions
  const handleBatchRejectHistory = () => {
    if (selectedHistoryIds.size === 0) return;

    const txsToReject = recentTransactions.filter((t) => selectedHistoryIds.has(t.id));
    const stockReversals: Record<string, number> = {};

    for (const tx of txsToReject) {
      const mat = materials.find((m) => m.id === tx.materialId);
      if (!mat) continue;

      const current = stockReversals[mat.id] !== undefined ? stockReversals[mat.id] : mat.inStock;
      const reverted = tx.type === 'IN' ? current - tx.quantity : current + tx.quantity;
      stockReversals[mat.id] = reverted;
    }

    setMaterials((prev) =>
      prev.map((m) => {
        if (stockReversals[m.id] !== undefined) {
          if (onUpdateInventoryStock) onUpdateInventoryStock(m.id, stockReversals[m.id]);
          return { ...m, inStock: stockReversals[m.id] };
        }
        return m;
      })
    );

    setRecentTransactions((prev) => prev.filter((t) => !selectedHistoryIds.has(t.id)));
    setNotification({
      type: 'success',
      message: `Batch rejected ${selectedHistoryIds.size} transactions. Stock reverted.`
    });
    setSelectedHistoryIds(new Set());
    setTimeout(() => setNotification(null), 4000);
  };

  const handleToggleSelectHistory = (id: string) => {
    setSelectedHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllHistory = (select: boolean) => {
    if (select) {
      setSelectedHistoryIds(new Set(filteredHistory.map((t) => t.id)));
    } else {
      setSelectedHistoryIds(new Set());
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    if (historyFilter === 'ALL') return recentTransactions;
    return recentTransactions.filter((tx) => tx.type === historyFilter);
  }, [recentTransactions, historyFilter]);

  const allHistorySelected =
    filteredHistory.length > 0 && filteredHistory.every((t) => selectedHistoryIds.has(t.id));

  // Pending Tray summary calculations
  const pendingSelectedCount = pendingReviewItems.filter((i) => i.selected).length;
  const pendingWarningsCount = pendingReviewItems.filter(
    (i) => i.validationStatus !== 'VALID'
  ).length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* NOTIFICATION TOAST */}
      {notification && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer ml-3"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TOP CONTROLS BAR: WHITE BOX */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          {/* Transaction Type: IN / OUT */}
          <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setTransactionType('IN')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                transactionType === 'IN'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Receiving (IN)</span>
            </button>
            <button
              type="button"
              onClick={() => setTransactionType('OUT')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                transactionType === 'OUT'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Dispatch (OUT)</span>
            </button>
          </div>

          {/* Toggle Auto-Add to Pending Tray */}
          <label className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoAddToPendingTray}
              onChange={(e) => setAutoAddToPendingTray(e.target.checked)}
              className="rounded border-slate-300 text-slate-900 focus:ring-0"
            />
            <span className="font-medium">Auto-Stage into Pending Review</span>
          </label>
        </div>

        {/* Bulk Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleOpenBulkModal}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <ListPlus className="w-3.5 h-3.5" />
            <span>Manual Bulk Rows</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          DEDICATED PENDING REVIEW TRAY (UNCOMMITTED SCANS BEFORE LEDGER COMMIT)
          Allows user to reject or edit details for each scanned item individually
          ========================================================================= */}
      {pendingReviewItems.length > 0 && (
        <div className="bg-white border-2 border-indigo-500/50 rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-200">
          <div className="p-3 bg-indigo-50/70 border-b border-indigo-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                <ScanLine className="w-4 h-4 text-indigo-600" />
                Pending Review Tray
              </span>
              <span className="bg-indigo-200 text-indigo-900 text-[11px] font-bold px-2 py-0.5 rounded-full">
                {pendingReviewItems.length} uncommitted scan{pendingReviewItems.length > 1 ? 's' : ''}
              </span>
              {pendingWarningsCount > 0 && (
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  {pendingWarningsCount} alert{pendingWarningsCount > 1 ? 's' : ''}
                </span>
              )}
              <span className="text-slate-500 text-[11px] hidden sm:inline">
                (Held before ledger commit • Edit or reject items individually)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleSelectAllPending(!pendingReviewItems.every((i) => i.selected))}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-medium cursor-pointer"
              >
                {pendingReviewItems.every((i) => i.selected) ? 'Deselect All' : 'Select All'}
              </button>
              <button
                type="button"
                onClick={handleRejectSelectedPending}
                disabled={pendingSelectedCount === 0}
                className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 rounded font-medium disabled:opacity-40 cursor-pointer"
              >
                Reject Selected ({pendingSelectedCount})
              </button>
              <button
                type="button"
                onClick={handleClearPendingTray}
                className="px-2 py-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Clear Tray
              </button>
              {pendingSelectedCount > 0 && pendingSelectedCount < pendingReviewItems.length && (
                <button
                  type="button"
                  onClick={() => handleCommitPendingToLedger(true)}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold cursor-pointer shadow-xs"
                >
                  Commit Selected ({pendingSelectedCount})
                </button>
              )}
              <button
                type="button"
                onClick={() => handleCommitPendingToLedger(false)}
                className="px-3.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold cursor-pointer shadow-xs"
              >
                Commit All to Ledger ({pendingReviewItems.length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-800">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={pendingReviewItems.length > 0 && pendingReviewItems.every((i) => i.selected)}
                      onChange={(e) => handleSelectAllPending(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-2 px-3">Validation Status</th>
                  <th className="py-2 px-3">Scanned Item</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3 text-center">Qty</th>
                  <th className="py-2 px-3 text-right">Unit Price (LKR)</th>
                  <th className="py-2 px-3 text-right">Total (LKR)</th>
                  <th className="py-2 px-3">Project</th>
                  <th className="py-2 px-3">Batch/Lot</th>
                  <th className="py-2 px-3 text-center">Individual Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingReviewItems.map((item) => {
                  const sub = item.quantity * item.price;
                  const disc = (sub * (item.discountPct || 0)) / 100;
                  const tot = Math.max(0, sub - disc);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        item.selected ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => handleToggleSelectPending(item.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Validation Status Badge */}
                      <td className="py-2.5 px-3">
                        {item.validationStatus === 'VALID' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Check className="w-3 h-3" />
                            Validated
                          </span>
                        )}
                        {item.validationStatus === 'WARNING_LOW_STOCK' && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                            title={item.validationMessage}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            Low Stock ({item.currentAvailableStock})
                          </span>
                        )}
                        {item.validationStatus === 'WARNING_ZERO_STOCK' && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300"
                            title={item.validationMessage}
                          >
                            <AlertCircle className="w-3 h-3" />
                            Zero Stock
                          </span>
                        )}
                        {item.validationStatus === 'UNRECOGNIZED' && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300"
                            title={item.validationMessage}
                          >
                            <HelpCircle className="w-3 h-3" />
                            Uncatalogued
                          </span>
                        )}
                        <div className="text-[10px] text-slate-400 truncate max-w-44 mt-0.5">
                          {item.validationMessage}
                        </div>
                      </td>

                      {/* Scanned Barcode & Material */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {item.materialCode}
                          </span>
                          {item.scanCount > 1 && (
                            <span className="bg-indigo-100 text-indigo-800 font-mono text-[10px] font-bold px-1.5 py-0.2 rounded">
                              ×{item.scanCount}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-600 text-[11px] truncate max-w-56 mt-0.5">
                          {item.materialName}
                        </div>
                      </td>

                      {/* Type: IN / OUT */}
                      <td className="py-2.5 px-3">
                        <select
                          value={item.type}
                          onChange={(e) =>
                            handleUpdatePendingItem(item.id, { type: e.target.value as 'IN' | 'OUT' })
                          }
                          className={`py-0.5 px-1.5 rounded text-[11px] font-bold border cursor-pointer ${
                            item.type === 'IN'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          <option value="IN">IN</option>
                          <option value="OUT">OUT</option>
                        </select>
                      </td>

                      {/* Quantity Stepper */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdatePendingItem(item.id, {
                                quantity: Math.max(1, item.quantity - 1)
                              })
                            }
                            className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdatePendingItem(item.id, {
                                quantity: Math.max(0.01, parseFloat(e.target.value) || 1)
                              })
                            }
                            className="w-14 text-center font-bold text-slate-900 border border-slate-300 rounded py-0.5"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdatePendingItem(item.id, {
                                quantity: item.quantity + 1
                              })
                            }
                            className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            +
                          </button>
                          <span className="text-[10px] text-slate-400 font-mono ml-1">{item.unit}</span>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(e) =>
                            handleUpdatePendingItem(item.id, {
                              price: parseFloat(e.target.value) || 0
                            })
                          }
                          className="w-20 text-right font-mono border border-slate-300 rounded py-0.5 px-1"
                        />
                      </td>

                      {/* Net Total */}
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono whitespace-nowrap">
                        Rs. {formatLKR(tot, false)}
                      </td>

                      {/* Project Dropdown */}
                      <td className="py-2.5 px-3">
                        <select
                          value={item.projectId}
                          onChange={(e) => handleUpdatePendingItem(item.id, { projectId: e.target.value })}
                          className="py-0.5 px-1 bg-white border border-slate-300 rounded text-[11px] text-slate-800 max-w-28 truncate"
                        >
                          <option value="none">General Inventory</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.code}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Batch / Lot */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.batchLot}
                          onChange={(e) => handleUpdatePendingItem(item.id, { batchLot: e.target.value })}
                          className="w-24 text-[11px] font-mono border border-slate-300 rounded py-0.5 px-1 bg-white"
                        />
                      </td>

                      {/* Individual Actions: Edit Details & Reject */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1">
                          {/* Edit Details */}
                          <button
                            type="button"
                            onClick={() => setEditingPendingItem({ ...item })}
                            className="px-2 py-1 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded font-semibold text-[11px] flex items-center space-x-1 cursor-pointer"
                            title="Edit Item Details"
                          >
                            <Edit2 className="w-3 h-3 text-slate-500" />
                            <span>Edit</span>
                          </button>

                          {/* Reject item from tray */}
                          <button
                            type="button"
                            onClick={() => handleRejectPendingItem(item.id)}
                            className="px-2 py-1 text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded font-semibold text-[11px] flex items-center space-x-1 cursor-pointer"
                            title="Reject and Discard Item"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Reject</span>
                          </button>

                          {/* Commit single item to ledger */}
                          <button
                            type="button"
                            onClick={() => handleCommitPendingToLedger(false)}
                            className="p-1 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded cursor-pointer"
                            title="Commit to Ledger"
                          >
                            <Check className="w-3.5 h-3.5" />
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

      {/* =========================================================================
          INDIVIDUAL EDIT PENDING ITEM MODAL
          ========================================================================= */}
      {editingPendingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Edit Pending Item Details
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Barcode: {editingPendingItem.barcode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingPendingItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Validation State Alert Box */}
            <div
              className={`p-3 rounded-lg border text-xs flex items-center space-x-2 ${
                editingPendingItem.validationStatus === 'VALID'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              {editingPendingItem.validationStatus === 'VALID' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <div>
                <span className="font-bold block">Validation Assessment</span>
                <span>{editingPendingItem.validationMessage}</span>
              </div>
            </div>

            <form onSubmit={handleSaveEditingPendingItem} className="space-y-3 text-xs">
              {/* Material Selection */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Catalog Material</label>
                <select
                  value={editingPendingItem.materialId}
                  onChange={(e) => {
                    const m = materials.find((mat) => mat.id === e.target.value);
                    if (m) {
                      setEditingPendingItem({
                        ...editingPendingItem,
                        materialId: m.id,
                        materialCode: m.code,
                        materialName: m.name,
                        unit: m.unit || 'pcs',
                        price: m.retailPrice || editingPendingItem.price,
                        currentAvailableStock: m.inStock
                      });
                    }
                  }}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name} (Stock: {m.inStock} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Transaction Type */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Transaction Type</label>
                  <select
                    value={editingPendingItem.type}
                    onChange={(e) =>
                      setEditingPendingItem({
                        ...editingPendingItem,
                        type: e.target.value as 'IN' | 'OUT'
                      })
                    }
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="IN">Receiving (IN)</option>
                    <option value="OUT">Dispatch (OUT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Quantity ({editingPendingItem.unit})</label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={editingPendingItem.quantity}
                    onChange={(e) =>
                      setEditingPendingItem({
                        ...editingPendingItem,
                        quantity: parseFloat(e.target.value) || 1
                      })
                    }
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Price and Discount */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Unit Price (LKR)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingPendingItem.price}
                    onChange={(e) =>
                      setEditingPendingItem({
                        ...editingPendingItem,
                        price: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingPendingItem.discountPct}
                    onChange={(e) =>
                      setEditingPendingItem({
                        ...editingPendingItem,
                        discountPct: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Project and Batch/Lot */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Target Project</label>
                  <select
                    value={editingPendingItem.projectId}
                    onChange={(e) =>
                      setEditingPendingItem({ ...editingPendingItem, projectId: e.target.value })
                    }
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="none">General Inventory</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Batch / Lot #</label>
                  <input
                    type="text"
                    value={editingPendingItem.batchLot}
                    onChange={(e) =>
                      setEditingPendingItem({ ...editingPendingItem, batchLot: e.target.value })
                    }
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Review Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="Optional review notes..."
                  value={editingPendingItem.notes || ''}
                  onChange={(e) =>
                    setEditingPendingItem({ ...editingPendingItem, notes: e.target.value })
                  }
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              {/* Live Net Total Preview */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between font-mono">
                <span className="text-slate-600 font-sans text-xs">Net Amount:</span>
                <span className="font-bold text-slate-900 text-sm">
                  Rs. {formatLKR(
                    (editingPendingItem.quantity * editingPendingItem.price) *
                      (1 - (editingPendingItem.discountPct || 0) / 100),
                    false
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    handleRejectPendingItem(editingPendingItem.id);
                    setEditingPendingItem(null);
                  }}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-semibold cursor-pointer"
                >
                  Reject Item
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingPendingItem(null)}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold cursor-pointer shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          SINGLE TRANSACTION FORM - WHITE BOXES
          ========================================================================= */}
      <form onSubmit={handleSaveTransaction} className="space-y-4">
        {/* WHITE BOX 1: PROJECT */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm" ref={projectDropdownRef}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Target Project (Optional)
            </span>
            {selectedProjectId !== 'none' && (
              <button
                type="button"
                onClick={() => setSelectedProjectId('none')}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>General Inventory</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedProjectId('none');
                setIsProjectDropdownOpen(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                selectedProjectId === 'none'
                  ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              General Inventory
            </button>

            {projects.slice(0, 4).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedProjectId(p.id);
                  setIsProjectDropdownOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                  selectedProjectId === p.id
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {p.code}
              </button>
            ))}

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
              >
                Browse All Projects...
              </button>

              {isProjectDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-xl z-20 p-2 space-y-2">
                  <input
                    type="text"
                    value={projectSearchQuery}
                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                    placeholder="Search project..."
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800"
                    autoFocus
                  />
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredProjects.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedProjectId(p.id);
                          setIsProjectDropdownOpen(false);
                        }}
                        className="px-2.5 py-1.5 rounded text-xs hover:bg-slate-100 cursor-pointer text-slate-800"
                      >
                        <span className="font-bold">{p.code}</span> - {p.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* WHITE BOX 2: MATERIAL & BARCODE SCANNER */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3" ref={materialDropdownRef}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. Material & Barcode
            </span>

            {/* Toggle between Manual Search and Camera */}
            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setScanInputMode('MANUAL')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
                  scanInputMode === 'MANUAL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Search / Code</span>
              </button>
              <button
                type="button"
                onClick={() => setScanInputMode('CAMERA')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
                  scanInputMode === 'CAMERA'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                <span>Camera Scanner</span>
              </button>
            </div>
          </div>

          {/* Camera Scanner Embed */}
          {scanInputMode === 'CAMERA' && (
            <div className="pt-1">
              <CameraBarcodeScanner
                materials={materials}
                autoStart={true}
                onBarcodeDetected={(code) => handleValidatedScanInput(code, 'CAMERA')}
              />
            </div>
          )}

          {/* Manual Search Input */}
          {scanInputMode === 'MANUAL' && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={materialSearchQuery}
                  onChange={(e) => {
                    setMaterialSearchQuery(e.target.value);
                    setIsMaterialDropdownOpen(true);
                  }}
                  onFocus={() => setIsMaterialDropdownOpen(true)}
                  placeholder="Type code, material name, or scan barcode..."
                  className="w-full pl-9 pr-20 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                />
                <button
                  type="button"
                  onClick={() => handleValidatedScanInput(materialSearchQuery, 'MANUAL')}
                  className="absolute right-1.5 top-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer"
                >
                  Lookup
                </button>

                {isMaterialDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {filteredMaterials.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => handleSelectMaterial(m)}
                        className="p-2.5 text-xs hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1 py-0.5 rounded border border-slate-200 mr-2">
                            {m.code}
                          </span>
                          <span className="font-semibold text-slate-800">{m.name}</span>
                        </div>
                        <span className="text-slate-500 font-mono text-[11px]">
                          Stock: {m.inStock} {m.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Barcode Test Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] font-semibold text-slate-500">Quick Test:</span>
                {materials.slice(0, 5).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleValidatedScanInput(m.code, 'MANUAL')}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-mono rounded cursor-pointer border border-slate-200"
                  >
                    {m.code}
                  </button>
                ))}
              </div>
            </div>
          )}

          {scanFeedback && (
            <div className="p-2 bg-slate-100 border border-slate-200 text-slate-800 text-xs rounded-lg flex items-center justify-between">
              <span>{scanFeedback}</span>
              <button
                type="button"
                onClick={() => setScanFeedback(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
          )}

          {/* Selected Material Card */}
          {selectedMaterial && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-300 mr-2">
                  {selectedMaterial.code}
                </span>
                <span className="font-bold text-slate-900">{selectedMaterial.name}</span>
                <span className="text-slate-500 ml-2">({selectedMaterial.category || 'General'})</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-slate-600">
                  Current Stock: <strong className="text-slate-900">{selectedMaterial.inStock} {selectedMaterial.unit}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMaterial(null)}
                  className="text-slate-400 hover:text-slate-700 underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* WHITE BOX 3: QUANTITY & PRICING */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
            3. Quantity & Pricing
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 text-xs font-semibold mb-1">
                Quantity ({unit})
              </label>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center cursor-pointer border border-slate-200"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseFloat(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 text-center bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-xs"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center cursor-pointer border border-slate-200"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 text-xs font-semibold mb-1">
                Unit Price (LKR)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-600 text-xs font-semibold mb-1">
                Discount (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPct}
                onChange={(e) => setDiscountPct(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
              />
            </div>
          </div>
        </div>

        {/* WHITE BOX 4: TRANSACTION SUMMARY & SUBMIT */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-6">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Subtotal</span>
              <span className="font-mono font-bold text-slate-900">Rs. {formatLKR(subtotal, false)}</span>
            </div>
            {discountAmount > 0 && (
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Discount ({discountPct}%)</span>
                <span className="font-mono font-bold text-emerald-600">-Rs. {formatLKR(discountAmount, false)}</span>
              </div>
            )}
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Amount</span>
              <span className="font-mono font-extrabold text-base text-slate-900">
                Rs. {formatLKR(totalAmount, false)}
              </span>
            </div>
            {selectedMaterial && (
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Stock Impact</span>
                <span className="font-bold text-slate-900">
                  {currentAvailable} → {newAvailable} {unit}
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!selectedMaterial || isStockInsufficient || quantity <= 0}
            className={`px-5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs ${
              !selectedMaterial || isStockInsufficient || quantity <= 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : transactionType === 'IN'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            {transactionType === 'IN' ? (
              <ArrowDownLeft className="w-4 h-4" />
            ) : (
              <ArrowUpRight className="w-4 h-4" />
            )}
            <span>Record {transactionType} Transaction</span>
          </button>
        </div>
      </form>

      {/* =========================================================================
          4. RECORDED TRANSACTIONS HISTORY - WHITE BOX
          All transactions can be edited and deleted individually or batch rejected
          ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Transactions History
            </span>
            <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
              {recentTransactions.length}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Batch Reject Action when items are selected */}
            {selectedHistoryIds.size > 0 && (
              <button
                type="button"
                onClick={handleBatchRejectHistory}
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 rounded text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Reject Selected ({selectedHistoryIds.size})</span>
              </button>
            )}

            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setHistoryFilter('ALL')}
                className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                  historyFilter === 'ALL'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('IN')}
                className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                  historyFilter === 'IN'
                    ? 'bg-white text-emerald-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                IN
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('OUT')}
                className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                  historyFilter === 'OUT'
                    ? 'bg-white text-rose-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                OUT
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-2.5 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={allHistorySelected}
                    onChange={(e) => handleSelectAllHistory(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3">Ref #</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Project</th>
                <th className="py-2.5 px-3">Material</th>
                <th className="py-2.5 px-3">Batch/Lot</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Total (LKR)</th>
                <th className="py-2.5 px-3 text-right">Stock</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.map((tx) => (
                <tr
                  key={tx.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    selectedHistoryIds.has(tx.id) ? 'bg-slate-50' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedHistoryIds.has(tx.id)}
                      onChange={() => handleToggleSelectHistory(tx.id)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-0 cursor-pointer"
                    />
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                    {tx.transactionNumber || tx.id}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        tx.type === 'IN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {tx.type === 'IN' ? (
                        <ArrowDownLeft className="w-3 h-3" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3" />
                      )}
                      <span>{tx.type}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                    <div>{tx.date}</div>
                    <div className="text-[10px] text-slate-400">{tx.timestamp}</div>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">
                    {tx.projectCode || 'GENERAL'}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-slate-900 mr-1.5">{tx.materialCode}</span>
                    <span className="text-slate-600 text-[11px] truncate">{tx.materialName}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                    {tx.batchLotNumber || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    {tx.quantity} {tx.unit}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    Rs. {formatLKR(tx.totalAmount, false)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-600">
                    {tx.previousAvailableQuantity} → <strong className="text-slate-900">{tx.newAvailableQuantity}</strong>
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="inline-flex items-center space-x-1">
                      {/* Slip Button */}
                      <button
                        type="button"
                        onClick={() => setTraceabilityModalTx(tx)}
                        className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
                        title="Print / View Traceability Slip"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => setEditingTx({ ...tx })}
                        className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
                        title="Edit Transaction"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete / Reject Button */}
                      <button
                        type="button"
                        onClick={() => setDeletingTx(tx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                        title="Reject / Delete Transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MANUAL BULK MODAL
          ========================================================================= */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Bulk Transactions Entry</h3>
                <span className="text-xs text-slate-500">
                  Add multiple inventory items and commit them to the ledger simultaneously.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 uppercase text-[10px] text-slate-600 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Material</th>
                    <th className="p-2.5 w-24">Qty</th>
                    <th className="p-2.5 w-28">Price (LKR)</th>
                    <th className="p-2.5 w-20">Disc %</th>
                    <th className="p-2.5">Project</th>
                    <th className="p-2.5 w-24">Batch/Lot</th>
                    <th className="p-2.5 text-center w-10">✕</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bulkRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="p-2">
                        <select
                          value={row.type}
                          onChange={(e) =>
                            handleUpdateBulkRow(row.id, { type: e.target.value as 'IN' | 'OUT' })
                          }
                          className="py-1 px-1.5 border border-slate-300 rounded font-bold text-xs"
                        >
                          <option value="IN">IN</option>
                          <option value="OUT">OUT</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <select
                          value={row.materialId}
                          onChange={(e) => handleUpdateBulkRow(row.id, { materialId: e.target.value })}
                          className="w-full py-1 px-2 border border-slate-300 rounded text-xs"
                        >
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.code} - {m.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={row.quantity}
                          onChange={(e) =>
                            handleUpdateBulkRow(row.id, {
                              quantity: parseFloat(e.target.value) || 1
                            })
                          }
                          className="w-full py-1 px-2 border border-slate-300 rounded text-center font-bold text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.price}
                          onChange={(e) =>
                            handleUpdateBulkRow(row.id, {
                              price: parseFloat(e.target.value) || 0
                            })
                          }
                          className="w-full py-1 px-2 border border-slate-300 rounded font-mono text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={row.discountPct}
                          onChange={(e) =>
                            handleUpdateBulkRow(row.id, {
                              discountPct: parseFloat(e.target.value) || 0
                            })
                          }
                          className="w-full py-1 px-1.5 border border-slate-300 rounded text-center text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={row.projectId}
                          onChange={(e) => handleUpdateBulkRow(row.id, { projectId: e.target.value })}
                          className="w-full py-1 px-1.5 border border-slate-300 rounded text-xs"
                        >
                          <option value="none">General</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.code}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.batchLot}
                          onChange={(e) => handleUpdateBulkRow(row.id, { batchLot: e.target.value })}
                          className="w-full py-1 px-1.5 border border-slate-300 rounded font-mono text-[11px]"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveBulkRow(row.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleAddBulkRow}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBulkTransactions}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm"
                >
                  Save All Rows ({bulkRows.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          EDIT RECORDED TRANSACTION MODAL
          ========================================================================= */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Edit Recorded Transaction</h3>
                <span className="text-xs text-slate-500 font-mono">
                  {editingTx.transactionNumber || editingTx.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedTransaction} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Material</label>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold">
                  {editingTx.materialCode} - {editingTx.materialName}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Type</label>
                  <select
                    value={editingTx.type}
                    onChange={(e) => setEditingTx({ ...editingTx, type: e.target.value as 'IN' | 'OUT' })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="IN">IN</option>
                    <option value="OUT">OUT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Quantity ({editingTx.unit})</label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={editingTx.quantity}
                    onChange={(e) => setEditingTx({ ...editingTx, quantity: parseFloat(e.target.value) || 1 })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Unit Price (LKR)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingTx.price}
                    onChange={(e) => setEditingTx({ ...editingTx, price: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingTx.discount}
                    onChange={(e) => setEditingTx({ ...editingTx, discount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Project</label>
                  <select
                    value={editingTx.projectId || 'none'}
                    onChange={(e) => setEditingTx({ ...editingTx, projectId: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="none">General Inventory</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Batch / Lot #</label>
                  <input
                    type="text"
                    value={editingTx.batchLotNumber || ''}
                    onChange={(e) => setEditingTx({ ...editingTx, batchLotNumber: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600">Calculated Total:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  Rs. {formatLKR((editingTx.quantity * editingTx.price) * (1 - (editingTx.discount || 0) / 100), false)}
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold cursor-pointer shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          DELETE / REJECT TRANSACTION CONFIRMATION
          ========================================================================= */}
      {deletingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center space-x-2.5 text-rose-600">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-sm text-slate-900">Reject Transaction?</h4>
            </div>

            <p className="text-slate-600">
              Are you sure you want to reject transaction{' '}
              <strong className="text-slate-900 font-mono">{deletingTx.transactionNumber || deletingTx.id}</strong>?
              This will restore <strong className="text-slate-900">{deletingTx.quantity} {deletingTx.unit}</strong> to inventory stock.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingTx(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTransaction}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold cursor-pointer shadow-sm"
              >
                Reject & Revert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TRACEABILITY SLIP MODAL
          ========================================================================= */}
      {traceabilityModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {traceabilityModalTx.type === 'IN' ? 'Goods Received Note (GRN)' : 'Material Issue Note (MIN)'}
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Ref: {traceabilityModalTx.transactionNumber || traceabilityModalTx.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTraceabilityModalTx(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 gap-3">
              <BarcodeVisual code={traceabilityModalTx.transactionNumber || traceabilityModalTx.materialCode} />
              <div className="text-xs text-right">
                <span className="text-slate-500 block">Date & Time</span>
                <span className="font-bold text-slate-900">{traceabilityModalTx.date} {traceabilityModalTx.timestamp}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Material</span>
                <span className="font-bold text-slate-900">{traceabilityModalTx.materialName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Code / SKU</span>
                <span className="font-mono font-bold text-slate-900">{traceabilityModalTx.materialCode}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Project</span>
                <span className="font-semibold text-slate-900">{traceabilityModalTx.projectCode}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Batch / Lot</span>
                <span className="font-mono font-bold text-slate-900">{traceabilityModalTx.batchLotNumber || 'LOT-AUTO'}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Quantity</span>
                <span className="font-bold text-slate-900 text-sm">
                  {traceabilityModalTx.quantity} {traceabilityModalTx.unit}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Net Total (LKR)</span>
                <span className="font-bold text-slate-900 text-sm font-mono">
                  Rs. {formatLKR(traceabilityModalTx.totalAmount, false)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={() => setTraceabilityModalTx(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
