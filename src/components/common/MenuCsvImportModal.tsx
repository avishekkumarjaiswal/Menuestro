import React, { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Category, MenuItem } from '../../types';
import {
  createCategory,
  createMenuItem,
  updateMenuItem,
  getAllMenuItems,
} from '../../services/firestoreService';
import {
  UploadCloud,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  RefreshCw,
  Plus,
  Check,
} from 'lucide-react';
import { TagBadge } from '../ui/TagBadge';
import { getPresetImageForDishName } from '../../services/imagePresets';

export interface ParsedCsvItem {
  id: string;
  categoryName: string;
  name: string;
  price: number;
  description: string;
  isAvailable: boolean;
  tags: string[];
  imageUrl: string;
  isValid: boolean;
  validationError?: string;
  selected: boolean;
  isExistingMatch?: boolean;
}

interface MenuCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  existingCategories: Category[];
  onImportComplete: () => void;
  adminUser?: { id: string; email: string; name: string };
  currencySymbol?: string;
}

/**
 * Robust CSV line tokenizer respecting quotes and commas
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else if (char === ';' && !inQuotes && result.length === 0 && line.includes(';')) {
      // Fallback for semicolon delimited CSV
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Helper to generate normalized tag signature for distinguishing items by tags
 */
export function normalizeTagsKey(tags?: string[]): string {
  if (!tags || tags.length === 0) return '';
  return tags
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('|');
}

/**
 * Parses raw CSV text into structured items and automatically deduplicates within the CSV
 */
function parseMenuCsv(rawText: string): { items: ParsedCsvItem[]; errors: string[] } {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { items: [], errors: ['CSV file must contain at least a header row and one item row.'] };
  }

  // Parse header
  const rawHeaders = parseCsvLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, '')
  );

  // Column index resolvers
  let catIdx = rawHeaders.findIndex((h) => ['category', 'categoryname', 'section', 'group'].includes(h));
  let nameIdx = rawHeaders.findIndex((h) => ['itemname', 'item', 'dish', 'dishname', 'name', 'title'].includes(h));
  let priceIdx = rawHeaders.findIndex((h) => ['price', 'rate', 'cost', 'amount'].includes(h));
  let descIdx = rawHeaders.findIndex((h) => ['description', 'desc', 'details', 'ingredients'].includes(h));
  let availIdx = rawHeaders.findIndex((h) => ['isavailable', 'available', 'instock', 'status', 'active'].includes(h));
  let tagsIdx = rawHeaders.findIndex((h) => ['tags', 'dietary', 'tag', 'type', 'labels'].includes(h));
  let imgIdx = rawHeaders.findIndex((h) => ['imageurl', 'image', 'img', 'photo', 'picture', 'photourl'].includes(h));

  // Fallback to default column positions if headers don't match standard names
  if (nameIdx === -1 && rawHeaders.length >= 2) nameIdx = 1;
  if (catIdx === -1 && rawHeaders.length >= 1) catIdx = 0;
  if (priceIdx === -1 && rawHeaders.length >= 3) priceIdx = 2;

  const items: ParsedCsvItem[] = [];
  const errors: string[] = [];
  const seenExact = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = parseCsvLine(line);

    // Skip empty lines
    if (cols.every((c) => !c || c.trim() === '')) continue;

    const rawCategory = (catIdx !== -1 && cols[catIdx]) ? cols[catIdx] : 'General';
    const rawName = (nameIdx !== -1 && cols[nameIdx]) ? cols[nameIdx] : '';
    const rawPriceStr = (priceIdx !== -1 && cols[priceIdx]) ? cols[priceIdx].replace(/[^0-9.]/g, '') : '0';
    const rawDesc = (descIdx !== -1 && cols[descIdx]) ? cols[descIdx] : '';
    const rawAvail = (availIdx !== -1 && cols[availIdx]) ? cols[availIdx].toLowerCase() : 'true';
    const rawTags = (tagsIdx !== -1 && cols[tagsIdx]) ? cols[tagsIdx] : '';
    const rawImg = (imgIdx !== -1 && cols[imgIdx]) ? cols[imgIdx] : '';

    const price = parseFloat(rawPriceStr) || 0;
    const isAvailable = !['false', '0', 'no', 'unavailable', 'off', 'inactive'].includes(rawAvail);

    // Split tags by comma, pipe, or semicolon
    const tags = rawTags
      ? rawTags.split(/[,|;]/).map((t) => t.trim()).filter((t) => t.length > 0)
      : [];

    let isValid = true;
    let validationError: string | undefined;

    if (!rawName.trim()) {
      isValid = false;
      validationError = 'Missing Dish/Item Name';
    }

    const cleanCat = rawCategory.trim() || 'General';
    const cleanName = rawName.trim();
    const cleanDesc = rawDesc.trim();
    const tagsKey = normalizeTagsKey(tags);

    // Skip 100% exact duplicate identical row
    const exactSignature = `${cleanCat.toLowerCase()}___${cleanName.toLowerCase()}___${tagsKey}___${cleanDesc.toLowerCase()}___${price}`;
    if (seenExact.has(exactSignature)) {
      continue;
    }
    seenExact.add(exactSignature);

    const autoMatchedImg = rawImg.trim() || getPresetImageForDishName(cleanName) || '';

    items.push({
      id: `csv-row-${i}`,
      categoryName: cleanCat,
      name: cleanName,
      price: price >= 0 ? price : 0,
      description: cleanDesc,
      isAvailable,
      tags,
      imageUrl: autoMatchedImg,
      isValid,
      validationError,
      selected: isValid,
    });
  }

  return { items, errors };
}

const SAMPLE_CSV_CONTENT = `Category,Item Name,Price,Description,Is Available,Tags,Image URL
Starters,Crispy Paneer Bites,240,Golden fried paneer cubes seasoned with mint and chat spices,true,Veg|Bestseller,https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500
Starters,Chicken Tikka,320,Tender roasted chicken marinated in yogurt and aromatic spices,true,Non-Veg|Chef Special,https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500
Main Course,Butter Chicken,420,Rich creamy tomato gravy with tender boneless chicken,true,Non-Veg|Popular,
Main Course,Dal Makhani,290,Slow-cooked black lentils simmered with butter and fresh cream,true,Veg,
Breads & Rice,Butter Naan,60,Crispy and soft clay-oven baked flatbread brushed with butter,true,Veg,
Breads & Rice,Jeera Rice,180,Fragrant basmati rice tempered with cumin seeds and ghee,true,Veg,
Beverages,Mango Lassi,120,Refreshing sweet yogurt smoothie blended with ripe mangoes,true,Veg|Chilled,
Beverages,Masala Chai,80,Freshly brewed traditional spiced Indian tea with ginger and cardamom,true,Veg,
Desserts,Gulab Jamun,150,Warm golden milk dumplings soaked in rose cardamom syrup,true,Veg,`;

export const MenuCsvImportModal: React.FC<MenuCsvImportModalProps> = ({
  isOpen,
  onClose,
  businessId,
  existingCategories,
  onImportComplete,
  adminUser,
  currencySymbol = '₹',
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'completed'>('upload');
  const [parsedItems, setParsedItems] = useState<ParsedCsvItem[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [rawPastedText, setRawPastedText] = useState<string>('');
  const [showPasteArea, setShowPasteArea] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Existing database items for smart upsert matching
  const [existingItemsMap, setExistingItemsMap] = useState<Map<string, MenuItem>>(new Map());

  // Import execution progress
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    currentAction: string;
    createdCategoriesCount: number;
    createdItemsCount: number;
    updatedItemsCount: number;
  }>({
    current: 0,
    total: 0,
    currentAction: '',
    createdCategoriesCount: 0,
    createdItemsCount: 0,
    updatedItemsCount: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal closes/opens & load existing menu items for matching
  React.useEffect(() => {
    if (isOpen && businessId) {
      setStep('upload');
      setParsedItems([]);
      setParseErrors([]);
      setFileName('');
      setRawPastedText('');
      setShowPasteArea(false);
      setCategoryFilter('all');

      // Preload existing items to identify what will be updated vs created
      getAllMenuItems(businessId, existingCategories).then((items) => {
        const map = new Map<string, MenuItem>();
        items.forEach((item) => {
          const tagsKey = normalizeTagsKey(item.tags);
          map.set(`${item.categoryId}___${item.name.toLowerCase().trim()}___${tagsKey}`, item);
          map.set(`${item.name.toLowerCase().trim()}___${tagsKey}`, item);
        });
        setExistingItemsMap(map);
      }).catch(console.warn);
    }
  }, [isOpen, businessId, existingCategories]);

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'menu_import_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProcessFile = (file: File) => {
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        processRawText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const processRawText = (text: string) => {
    const { items, errors } = parseMenuCsv(text);
    if (errors.length > 0 && items.length === 0) {
      setParseErrors(errors);
      return;
    }

    if (items.length === 0) {
      setParseErrors(['No valid menu items found in the file. Please check the sample format.']);
      return;
    }

    // Check which items are updates vs new creations
    const mappedItems = items.map((item) => {
      const tagsKey = normalizeTagsKey(item.tags);
      const isMatch =
        existingItemsMap.has(`${item.categoryName.toLowerCase().trim()}___${item.name.toLowerCase().trim()}___${tagsKey}`) ||
        existingItemsMap.has(`${item.name.toLowerCase().trim()}___${tagsKey}`);
      return {
        ...item,
        isExistingMatch: isMatch,
      };
    });

    setParsedItems(mappedItems);
    setParseErrors(errors);
    setStep('preview');
  };

  const toggleItemSelection = (id: string) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const toggleSelectAll = (select: boolean) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.isValid ? { ...item, selected: select } : item))
    );
  };

  // Grouping stats
  const selectedItems = parsedItems.filter((item) => item.selected && item.isValid);
  const uniqueCategories = Array.from(new Set(selectedItems.map((item) => item.categoryName)));

  const categoriesToCreate = uniqueCategories.filter(
    (catName) => !existingCategories.some((ec) => ec.name.toLowerCase() === catName.toLowerCase())
  );

  const existingCategoryMatches = uniqueCategories.filter((catName) =>
    existingCategories.some((ec) => ec.name.toLowerCase() === catName.toLowerCase())
  );

  const matchedUpdatesCount = selectedItems.filter((item) => item.isExistingMatch).length;
  const brandNewCount = selectedItems.length - matchedUpdatesCount;

  // Execute Batch Upsert (Never duplicate — update existing dishes, create new dishes)
  const handleExecuteImport = async () => {
    if (selectedItems.length === 0 || !businessId) return;

    const totalSteps = selectedItems.length + categoriesToCreate.length;
    setStep('importing');
    setImportProgress({
      current: 0,
      total: totalSteps,
      currentAction: 'Preparing import and analyzing existing dishes...',
      createdCategoriesCount: 0,
      createdItemsCount: 0,
      updatedItemsCount: 0,
    });

    // Initial micro-pause to let modal switch to 'importing' view
    await new Promise((r) => setTimeout(r, 60));

    try {
      // 1. Build category map: categoryName (lower) -> categoryId
      const categoryMap = new Map<string, string>();

      // Populate existing categories
      existingCategories.forEach((cat) => {
        categoryMap.set(cat.name.toLowerCase().trim(), cat.id);
      });

      let completedSteps = 0;
      let categoriesCreated = 0;
      let itemsCreated = 0;
      let itemsUpdated = 0;

      // 2. Create missing categories
      let nextSortOrder = existingCategories.length + 1;
      for (const catName of categoriesToCreate) {
        setImportProgress({
          current: completedSteps,
          total: totalSteps,
          currentAction: `Creating category "${catName}"...`,
          createdCategoriesCount: categoriesCreated,
          createdItemsCount: itemsCreated,
          updatedItemsCount: itemsUpdated,
        });

        const cleanName = catName.trim();
        const catId = await createCategory(
          businessId,
          {
            name: cleanName,
            sortOrder: nextSortOrder++,
            isActive: true,
          },
          undefined,
          adminUser
        );

        categoryMap.set(cleanName.toLowerCase(), catId);
        categoriesCreated++;
        completedSteps++;

        // Micro-yield to allow UI update
        await new Promise((r) => setTimeout(r, 20));
      }

      // 3. Fetch latest items to guarantee zero duplicate creation during upsert
      setImportProgress({
        current: completedSteps,
        total: totalSteps,
        currentAction: 'Checking database items for smart deduplication...',
        createdCategoriesCount: categoriesCreated,
        createdItemsCount: itemsCreated,
        updatedItemsCount: itemsUpdated,
      });

      const currentDbItems = await getAllMenuItems(businessId, existingCategories);
      const dbItemMap = new Map<string, MenuItem>();
      currentDbItems.forEach((item) => {
        const tagsKey = normalizeTagsKey(item.tags);
        dbItemMap.set(`${item.categoryId}___${item.name.toLowerCase().trim()}___${tagsKey}`, item);
        dbItemMap.set(`${item.name.toLowerCase().trim()}___${tagsKey}`, item);
      });

      // 4. Upsert menu items: Update existing matches, create new items
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        const targetCatId = categoryMap.get(item.categoryName.toLowerCase().trim());

        if (!targetCatId) {
          console.warn(`Category mapping not found for ${item.categoryName}`);
          completedSteps++;
          continue;
        }

        const cleanName = item.name.toLowerCase().trim();
        const tagsKey = normalizeTagsKey(item.tags);
        const existingMatch =
          dbItemMap.get(`${targetCatId}___${cleanName}___${tagsKey}`) ||
          dbItemMap.get(`${cleanName}___${tagsKey}`);

        if (existingMatch) {
          // NO DUPLICATES — UPDATE EXISTING DISH WITH NEW PRICE & DETAILS
          setImportProgress({
            current: completedSteps + 1,
            total: totalSteps,
            currentAction: `Updating "${item.name}" (Price: ${currencySymbol}${item.price})...`,
            createdCategoriesCount: categoriesCreated,
            createdItemsCount: itemsCreated,
            updatedItemsCount: itemsUpdated + 1,
          });

          await updateMenuItem(
            businessId,
            existingMatch.categoryId,
            existingMatch.id,
            {
              name: item.name,
              price: item.price,
              description: item.description || existingMatch.description || '',
              isAvailable: item.isAvailable,
              tags: item.tags.length > 0 ? (item.tags as any) : existingMatch.tags || [],
              imageUrl: item.imageUrl || existingMatch.imageUrl || '',
            },
            adminUser
          );

          itemsUpdated++;
        } else {
          // CREATE NEW DISH
          setImportProgress({
            current: completedSteps + 1,
            total: totalSteps,
            currentAction: `Creating "${item.name}" (${currencySymbol}${item.price})...`,
            createdCategoriesCount: categoriesCreated,
            createdItemsCount: itemsCreated + 1,
            updatedItemsCount: itemsUpdated,
          });

          const createdId = await createMenuItem(
            businessId,
            targetCatId,
            {
              name: item.name,
              description: item.description || '',
              price: item.price,
              imageUrl: item.imageUrl || '',
              isAvailable: item.isAvailable,
              sortOrder: i + 1,
              tags: item.tags as any,
            },
            undefined,
            adminUser
          );

          // Register in lookup map to prevent subsequent duplicates within the batch
          if (createdId) {
            const registeredItem: MenuItem = {
              id: createdId,
              businessId,
              categoryId: targetCatId,
              name: item.name,
              description: item.description || '',
              price: item.price,
              imageUrl: item.imageUrl || '',
              isAvailable: item.isAvailable,
              sortOrder: i + 1,
              tags: item.tags as any,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            const regTagsKey = normalizeTagsKey(item.tags);
            dbItemMap.set(`${targetCatId}___${cleanName}___${regTagsKey}`, registeredItem);
            dbItemMap.set(`${cleanName}___${regTagsKey}`, registeredItem);
          }

          itemsCreated++;
        }

        completedSteps++;
        // Micro-yield to allow browser paint loop to animate the progress bar smoothly
        await new Promise((r) => setTimeout(r, 20));
      }

      setImportProgress({
        current: totalSteps,
        total: totalSteps,
        currentAction: 'Finalizing menu catalog...',
        createdCategoriesCount: categoriesCreated,
        createdItemsCount: itemsCreated,
        updatedItemsCount: itemsUpdated,
      });

      await new Promise((r) => setTimeout(r, 100));
      setStep('completed');
    } catch (err) {
      console.error('CSV import failed:', err);
      setParseErrors([`Import encountered an error: ${(err as Error).message}`]);
      setStep('preview');
    }
  };

  const filteredPreviewItems = parsedItems.filter((item) => {
    if (categoryFilter === 'all') return true;
    return item.categoryName.toLowerCase() === categoryFilter.toLowerCase();
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={step === 'importing' ? () => {} : onClose}
      title="Import Menu & Dishes from CSV"
      description={
        step === 'upload'
          ? 'Upload a spreadsheet or CSV file to bulk update or add menu items without duplicates.'
          : step === 'preview'
          ? 'Review dishes before importing. Existing items will have their prices & details updated.'
          : step === 'importing'
          ? 'Updating menu items and syncing database...'
          : 'Menu sync completed successfully.'
      }
      maxWidth="2xl"
    >
      <div className="space-y-4 font-sans text-xs">
        {/* ========================================================= */}
        {/* STEP 1: FILE UPLOAD & TEMPLATE DOWNLOAD                   */}
        {/* ========================================================= */}
        {step === 'upload' && (
          <div className="space-y-4">
            {/* Download Template Banner */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Need the exact CSV format?</h4>
                  <p className="text-[11px] text-slate-500">
                    Download our ready-to-use sample template. Existing dishes will be updated without duplicates.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold rounded-lg flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Sample CSV</span>
              </button>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#078A55] bg-slate-50/60 hover:bg-emerald-50/30 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-[#078A55] flex items-center justify-center shadow-xs">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Click to select CSV or drag & drop here
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Safe import: Automatically updates prices/details for matching dishes with 0 duplicates.
                </p>
              </div>
            </div>

            {/* Parse Errors */}
            {parseErrors.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Unable to process file:</p>
                  {parseErrors.map((err, i) => (
                    <p key={i} className="text-[11px] text-rose-700">
                      {err}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Textarea Paste Option */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowPasteArea(!showPasteArea)}
                className="text-xs font-semibold text-[#078A55] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{showPasteArea ? 'Hide CSV Paste Box' : 'Or paste raw CSV text directly →'}</span>
              </button>

              {showPasteArea && (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={rawPastedText}
                    onChange={(e) => setRawPastedText(e.target.value)}
                    placeholder={SAMPLE_CSV_CONTENT}
                    rows={6}
                    className="w-full p-3 font-mono text-[11px] bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#078A55]/20 focus:border-[#078A55]"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!rawPastedText.trim()}
                      onClick={() => processRawText(rawPastedText)}
                      className="px-3 py-1.5 bg-[#078A55] hover:bg-[#067347] disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Parse CSV Text
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: PREVIEW & VALIDATION                              */}
        {/* ========================================================= */}
        {step === 'preview' && (
          <div className="space-y-3.5">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl">
                <span className="text-[11px] text-slate-500 font-medium block">Total In Batch</span>
                <span className="text-base font-bold text-slate-900 block mt-0.5">
                  {selectedItems.length} selected
                </span>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                <span className="text-[11px] text-blue-800 font-medium block">Will Update Existing</span>
                <span className="text-base font-bold text-blue-950 block mt-0.5 flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                  <span>{matchedUpdatesCount} dishes</span>
                </span>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <span className="text-[11px] text-emerald-800 font-medium block">Will Create New</span>
                <span className="text-base font-bold text-emerald-950 block mt-0.5 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{brandNewCount} dishes</span>
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl">
                <span className="text-[11px] text-slate-500 font-medium block">Categories to Add</span>
                <span className="text-base font-bold text-slate-900 block mt-0.5">
                  {categoriesToCreate.length} new
                </span>
              </div>
            </div>

            {/* Smart Duplication Prevention Callout */}
            <div className="p-2.5 bg-emerald-50/60 border border-emerald-200/80 rounded-lg flex items-center gap-2 text-emerald-900">
              <Sparkles className="w-3.5 h-3.5 text-[#078A55] shrink-0" />
              <p className="text-[11px]">
                <b>Duplicate protection active:</b> Any dish matching an existing name will update its price and description without duplicating.
              </p>
            </div>

            {/* Category Filter & Select All Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Filter:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1 focus:outline-hidden focus:border-[#078A55]"
                >
                  <option value="all">All Categories ({parsedItems.length})</option>
                  {uniqueCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleSelectAll(true)}
                  className="text-[11px] font-semibold text-[#078A55] hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => toggleSelectAll(false)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Items Preview Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-200 text-[11px] font-semibold">
                  <tr>
                    <th className="p-2.5 w-8 text-center">✓</th>
                    <th className="p-2.5">Dish Name</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">New Price</th>
                    <th className="p-2.5">Action Plan</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredPreviewItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => item.isValid && toggleItemSelection(item.id)}
                      className={`cursor-pointer transition-colors ${
                        !item.isValid
                          ? 'bg-rose-50/40 text-slate-400'
                          : item.selected
                          ? 'hover:bg-slate-50'
                          : 'opacity-50 hover:opacity-80'
                      }`}
                    >
                      <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={item.selected}
                          disabled={!item.isValid}
                          onChange={() => toggleItemSelection(item.id)}
                          className="rounded border-slate-300 text-[#078A55] focus:ring-[#078A55]"
                        />
                      </td>
                      <td className="p-2.5">
                        <div className="font-semibold text-slate-900">{item.name || '(Empty Name)'}</div>
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 my-1">
                            {item.tags.map((tag, idx) => (
                              <TagBadge key={idx} tag={tag} size="xs" />
                            ))}
                          </div>
                        )}
                        {item.description && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[220px]">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5">
                        <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                          {item.categoryName}
                        </span>
                      </td>
                      <td className="p-2.5 font-semibold text-slate-900">
                        {currencySymbol}
                        {item.price}
                      </td>
                      <td className="p-2.5">
                        {item.isExistingMatch ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <RefreshCw className="w-2.5 h-2.5" /> Updates Price/Info
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Plus className="w-2.5 h-2.5" /> Creates New Dish
                          </span>
                        )}
                      </td>
                      <td className="p-2.5">
                        {item.isValid ? (
                          <span className="text-emerald-700 font-medium text-[10px] inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> Ready
                          </span>
                        ) : (
                          <span className="text-rose-600 font-medium text-[10px] inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {item.validationError}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
              >
                ← Back to Upload
              </button>

              <button
                type="button"
                disabled={selectedItems.length === 0}
                onClick={handleExecuteImport}
                className="px-4 py-2 bg-[#078A55] hover:bg-[#067347] disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sync {selectedItems.length} Dishes Now</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: IMPORTING IN PROGRESS                             */}
        {/* ========================================================= */}
        {step === 'importing' && (
          <div className="py-6 px-2 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 text-[#078A55] shadow-xs border border-emerald-100">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Syncing Menu Items ({Math.round((importProgress.current / Math.max(1, importProgress.total)) * 100)}%)
              </h3>
              <p className="text-xs text-slate-500 font-mono animate-pulse">
                {importProgress.currentAction}
              </p>
            </div>

            {/* High-visibility Progress bar */}
            <div className="max-w-lg mx-auto space-y-2">
              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200 shadow-inner">
                <div
                  className="bg-gradient-to-r from-emerald-600 to-[#078A55] h-full rounded-full transition-all duration-300 shadow-sm"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        3,
                        Math.round((importProgress.current / Math.max(1, importProgress.total)) * 100)
                      )
                    )}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 font-mono px-0.5">
                <span>
                  {importProgress.current} of {importProgress.total} processed
                </span>
                <span className="text-[#078A55]">
                  {Math.round((importProgress.current / Math.max(1, importProgress.total)) * 100)}% Complete
                </span>
              </div>
            </div>

            {/* Live Stats Counters */}
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-2">
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 block">
                  Updated
                </span>
                <span className="text-lg font-bold text-blue-900 mt-0.5 block">
                  {importProgress.updatedItemsCount}
                </span>
                <span className="text-[10px] text-blue-600">Existing dishes</span>
              </div>

              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">
                  Created
                </span>
                <span className="text-lg font-bold text-emerald-900 mt-0.5 block">
                  {importProgress.createdItemsCount}
                </span>
                <span className="text-[10px] text-emerald-600">New dishes</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 block">
                  Categories
                </span>
                <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                  {importProgress.createdCategoriesCount}
                </span>
                <span className="text-[10px] text-slate-500">New categories</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 4: IMPORT COMPLETED                                  */}
        {/* ========================================================= */}
        {step === 'completed' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-[#078A55] flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Menu Successfully Synced!</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Updated <b>{importProgress.updatedItemsCount} existing dishes</b> with new prices/details, and created <b>{importProgress.createdItemsCount} new dishes</b>. Zero duplicate dishes were created.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onImportComplete();
                  onClose();
                }}
                className="px-5 py-2 bg-[#078A55] hover:bg-[#067347] text-white font-bold rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
              >
                View Updated Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
