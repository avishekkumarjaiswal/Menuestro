import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { Category, MenuItem } from '../../types';
import {
  subscribeCategories,
  createCategory,
  getAllMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
} from '../../services/firestoreService';
import { ItemDrawer } from './ItemDrawer';
import { CategoryManagerModal } from './CategoryManagerModal';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { SearchInput } from '../ui/Input';
import { Tabs } from '../ui/Badge';
import { Toggle } from '../ui/Toggle';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { TableRowSkeleton } from '../ui/Skeleton';
import {
  Plus,
  ArrowUpDown,
  ChevronDown,
  Edit2,
  Trash2,
  UtensilsCrossed,
  Check,
  AlertTriangle,
  Layers,
  UploadCloud,
} from 'lucide-react';
import { MenuCsvImportModal } from '../common/MenuCsvImportModal';

export const MenuManagementView: React.FC = () => {
  const { business } = useAuth();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'availability'>('default');
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<MenuItem | null>(null);

  // Category Manager modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // CSV Import modal state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Close sort menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch / Subscribe Categories & Items
  useEffect(() => {
    let isMounted = true;
    let unsubCategories: (() => void) | undefined;

    const initCategoriesAndItems = async () => {
      const bizId = business?.id;
      if (!bizId) {
        setCategories([]);
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        unsubCategories = subscribeCategories(bizId, async (fetchedCategories) => {
          if (!isMounted) return;

          setCategories(fetchedCategories);

          const fetchedItems = await getAllMenuItems(bizId, fetchedCategories);
          if (isMounted) {
            setItems(fetchedItems);
            setLoading(false);
          }
        });
      } catch (err) {
        console.error('Error fetching categories/items:', err);
        if (isMounted) {
          showToast('Failed to load menu data', 'error');
          setLoading(false);
        }
      }
    };

    initCategoriesAndItems();

    return () => {
      isMounted = false;
      if (unsubCategories) unsubCategories();
    };
  }, [business?.id, showToast]);

  const currencySymbol = business?.currencySymbol || business?.currency || '₹';

  const formatPrice = (price: number) => {
    const hasDecimals = price % 1 !== 0;
    return `${currencySymbol}${
      hasDecimals
        ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : price.toLocaleString('en-US')
    }`;
  };

  // Toggle item availability
  const handleToggleAvailability = async (item: MenuItem) => {
    const updatedStatus = !item.isAvailable;
    const bizId = business?.id || 'demo-biz';

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isAvailable: updatedStatus } : i))
    );

    try {
      await updateMenuItem(bizId, item.categoryId, item.id, {
        isAvailable: updatedStatus,
        updatedAt: new Date().toISOString(),
      });
      showToast(
        updatedStatus ? `${item.name} is now Available` : `${item.name} is now Hidden`,
        'success'
      );
    } catch (err) {
      console.error(err);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isAvailable: !updatedStatus } : i))
      );
      showToast('Failed to update availability', 'error');
    }
  };

  // Save Item (Create or Update)
  const handleSaveItem = async (itemData: Omit<MenuItem, 'id' | 'businessId'>) => {
    const bizId = business?.id || 'demo-biz';

    if (itemToEdit) {
      await updateMenuItem(bizId, itemToEdit.categoryId, itemToEdit.id, itemData);
      setItems((prev) =>
        prev.map((i) => (i.id === itemToEdit.id ? { ...i, ...itemData } : i))
      );
    } else {
      const newId = await createMenuItem(bizId, itemData.categoryId, itemData);
      const newItem: MenuItem = {
        ...itemData,
        id: newId || `item-${Date.now()}`,
        businessId: bizId,
      };
      setItems((prev) => [newItem, ...prev]);
    }
  };

  // Confirm delete item
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const bizId = business?.id || 'demo-biz';

    try {
      setIsDeleting(true);
      await deleteMenuItem(bizId, itemToDelete.categoryId, itemToDelete.id);
      setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
      showToast(`${itemToDelete.name} deleted`);
      setItemToDelete(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete item', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Category Tabs calculation
  const tabItems = useMemo(() => {
    const allTab = {
      id: 'all',
      label: 'All Items',
      count: items.length,
    };

    const dynamicTabs = categories.map((cat) => ({
      id: cat.id,
      label: cat.name,
      count: items.filter((i) => i.categoryId === cat.id).length,
    }));

    return [allTab, ...dynamicTabs];
  }, [categories, items]);

  // Filtered & Sorted Items
  const filteredAndSortedItems = useMemo(() => {
    let result = items.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.categoryId === selectedCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description &&
          item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });

    switch (sortBy) {
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'availability':
        result.sort((a, b) => (b.isAvailable ? 1 : 0) - (a.isAvailable ? 1 : 0));
        break;
      default:
        result.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }

    return result;
  }, [items, selectedCategory, searchQuery, sortBy]);

  const getSortLabel = () => {
    switch (sortBy) {
      case 'name-asc':
        return 'Name: A to Z';
      case 'name-desc':
        return 'Name: Z to A';
      case 'price-asc':
        return 'Price: Low to High';
      case 'price-desc':
        return 'Price: High to Low';
      case 'availability':
        return 'Available First';
      default:
        return 'Default Order';
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto select-none font-sans">
      {/* 1. Standard Page Header */}
      <PageHeader
        title="Menu Management"
        description="Add, edit or hide menu items. Changes reflect instantly on customer devices."
        action={
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              leftIcon={<UploadCloud className="w-4 h-4 text-slate-600" />}
              onClick={() => setIsCsvModalOpen(true)}
            >
              Import CSV
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Layers className="w-4 h-4 text-[#078A55]" />}
              onClick={() => setIsCategoryModalOpen(true)}
            >
              Categories
            </Button>
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setItemToEdit(null);
                setIsDrawerOpen(true);
              }}
            >
              Add Item
            </Button>
          </div>
        }
      />

      {/* 2. Category Tabs */}
      <Tabs
        tabs={tabItems}
        activeTab={selectedCategory}
        onChange={setSelectedCategory}
      />

      {/* 3. Search Bar and Sort Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:max-w-md">
          <SearchInput
            placeholder="Search items by name or ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
          />
        </div>

        {/* Sort Filter Dropdown */}
        <div className="relative w-full sm:w-auto shrink-0" ref={sortMenuRef}>
          <button
            type="button"
            onClick={() => setIsSortOpen(!isSortOpen)}
            className="w-full sm:w-auto h-[44px] inline-flex items-center justify-between sm:justify-start gap-2 text-sm font-semibold text-[#344054] hover:text-[#101828] bg-white hover:bg-[#F7F9FC] px-4 rounded-[10px] border border-[#D0D5DD] shadow-xs transition-all cursor-pointer"
          >
            <ArrowUpDown className="w-4 h-4 text-[#667085]" />
            <span>{getSortLabel()}</span>
            <ChevronDown className={`w-4 h-4 text-[#667085] transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
          </button>

          {isSortOpen && (
            <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-[12px] shadow-[0_4px_12px_rgba(16,24,40,0.08)] border border-[#E4E7EC] py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
              {[
                { id: 'default', label: 'Default Order' },
                { id: 'name-asc', label: 'Name: A to Z' },
                { id: 'name-desc', label: 'Name: Z to A' },
                { id: 'price-asc', label: 'Price: Low to High' },
                { id: 'price-desc', label: 'Price: High to Low' },
                { id: 'availability', label: 'Available First' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setSortBy(opt.id as any);
                    setIsSortOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                    sortBy === opt.id
                      ? 'bg-[#EAF8F1] text-[#078A55]'
                      : 'text-[#344054] hover:bg-[#F7F9FC]'
                  }`}
                >
                  <span>{opt.label}</span>
                  {sortBy === opt.id && <Check className="w-3.5 h-3.5 text-[#078A55]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Menu Items Table Container */}
      <div className="bg-white border border-[#E4E7EC] rounded-[16px] shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[#EEF1F5]">
            <TableRowSkeleton />
            <TableRowSkeleton />
            <TableRowSkeleton />
            <TableRowSkeleton />
          </div>
        ) : filteredAndSortedItems.length === 0 ? (
          <EmptyState
            icon={<UtensilsCrossed className="w-6 h-6 text-[#078A55]" />}
            title={searchQuery ? 'No matching menu items found' : 'Your menu is empty'}
            description={
              searchQuery
                ? 'Try adjusting your search terms or filter criteria.'
                : 'Add your first dish to start building your digital menu.'
            }
            actionText={searchQuery ? 'Clear Search' : '+ Add Item'}
            onAction={() => {
              if (searchQuery) setSearchQuery('');
              else {
                setItemToEdit(null);
                setIsDrawerOpen(true);
              }
            }}
          />
        ) : (
          <>
            {/* Mobile View: Responsive Cards (< md) */}
            <div className="md:hidden divide-y divide-[#EEF1F5]">
              {filteredAndSortedItems.map((item) => {
                const cat = categories.find((c) => c.id === item.categoryId);
                return (
                  <div
                    key={item.id}
                    className={`p-4 space-y-3 transition-colors ${
                      !item.isAvailable ? 'opacity-65 bg-slate-50/60' : 'bg-white'
                    }`}
                  >
                    {/* Top: Image + Details */}
                    <div className="flex items-start gap-3">
                      <img
                        src={
                          item.imageUrl ||
                          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=160&auto=format&fit=crop&q=80'
                        }
                        alt={item.name}
                        className="w-16 h-16 rounded-[10px] object-cover border border-[#E4E7EC] shrink-0 bg-[#F7F9FC]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=160&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1.5">
                          <h4 className="text-sm font-semibold text-[#101828] leading-tight truncate">
                            {item.name}
                          </h4>
                          {cat && (
                            <span className="text-[10px] font-semibold text-[#344054] bg-[#EEF1F5] px-2 py-0.5 rounded-full shrink-0">
                              {cat.name}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-[#667085] mt-1 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom Bar: Price, Availability Toggle, Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#F2F4F7]">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-[#101828]">
                          {formatPrice(item.price)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Toggle
                            checked={item.isAvailable}
                            onChange={() => handleToggleAvailability(item)}
                            size="sm"
                          />
                          <span className="text-[11px] text-[#667085] font-medium">
                            {item.isAvailable ? 'Available' : 'Hidden'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setItemToEdit(item);
                            setIsDrawerOpen(true);
                          }}
                          className="h-8 px-2.5 rounded-[6px] text-xs font-semibold text-[#344054] hover:text-[#101828] hover:bg-[#EEF1F5] transition-colors cursor-pointer inline-flex items-center gap-1 border border-[#E4E7EC]"
                          aria-label={`Edit ${item.name}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setItemToDelete(item)}
                          className="h-8 w-8 rounded-[6px] text-xs font-semibold text-[#667085] hover:text-[#DC2626] hover:bg-rose-50 transition-colors cursor-pointer inline-flex items-center justify-center"
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop / Tablet Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F7F9FC] border-b border-[#E4E7EC] text-xs font-semibold text-[#667085] uppercase tracking-wider">
                    <th className="py-3.5 px-6">Item</th>
                    <th className="py-3.5 px-6 hidden sm:table-cell">Category</th>
                    <th className="py-3.5 px-6">Price</th>
                    <th className="py-3.5 px-6">Availability</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF1F5] text-sm">
                  {filteredAndSortedItems.map((item) => {
                    const cat = categories.find((c) => c.id === item.categoryId);
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-[#F7F9FC]/80 transition-colors ${
                          !item.isAvailable ? 'opacity-60 bg-slate-50/50' : ''
                        }`}
                      >
                        {/* Item Details */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3.5">
                            <img
                              src={
                                item.imageUrl ||
                                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120&auto=format&fit=crop&q=80'
                              }
                              alt={item.name}
                              className="w-12 h-12 rounded-[8px] object-cover border border-[#E4E7EC] shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120&auto=format&fit=crop&q=80';
                              }}
                            />
                            <div className="max-w-xs sm:max-w-md">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#101828]">
                                  {item.name}
                                </span>
                                {!item.isAvailable && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FFF7DB] text-[#D97706] border border-[#FDE68A]">
                                    Hidden
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs text-[#667085] mt-0.5 truncate">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-4 px-6 hidden sm:table-cell">
                          <span className="text-xs font-semibold text-[#344054] bg-[#EEF1F5] px-2.5 py-1 rounded-full border border-[#E4E7EC]">
                            {cat?.name || 'Main Course'}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-4 px-6 font-bold text-[#101828] whitespace-nowrap">
                          {formatPrice(item.price)}
                        </td>

                        {/* Availability Toggle */}
                        <td className="py-4 px-6">
                          <Toggle
                            checked={item.isAvailable}
                            onChange={() => handleToggleAvailability(item)}
                            size="sm"
                          />
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setItemToEdit(item);
                                setIsDrawerOpen(true);
                              }}
                              className="p-2 rounded-[8px] text-[#667085] hover:text-[#101828] hover:bg-[#EEF1F5] transition-colors cursor-pointer"
                              aria-label={`Edit ${item.name}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setItemToDelete(item)}
                              className="p-2 rounded-[8px] text-[#667085] hover:text-[#DC2626] hover:bg-rose-50 transition-colors cursor-pointer"
                              aria-label={`Delete ${item.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Drawer Modal */}
      <ItemDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSave={handleSaveItem}
        itemToEdit={itemToEdit}
        categories={categories}
        selectedCategoryId={selectedCategory}
        currency={currencySymbol}
        onCategoryCreated={(newCat) => {
          setCategories((prev) => {
            if (prev.some((c) => c.id === newCat.id)) return prev;
            return [...prev, newCat];
          });
        }}
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        businessId={business?.id || 'thegreenplate'}
        itemCounts={items.reduce((acc, item) => {
          acc[item.categoryId] = (acc[item.categoryId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)}
      />

      {/* Delete Item Confirmation Modal */}
      <Modal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title="Delete Menu Item"
        maxWidth="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setItemToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
            >
              Delete Item
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-rose-50 text-[#DC2626] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-[#101828] font-medium">
              Are you sure you want to delete{' '}
              <span className="font-bold">"{itemToDelete?.name}"</span>?
            </p>
            <p className="text-xs text-[#667085] mt-1.5">
              This dish will be permanently removed from your active digital menu.
            </p>
          </div>
        </div>
      </Modal>

      {/* CSV Import Modal */}
      <MenuCsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        businessId={business?.id || ''}
        existingCategories={categories}
        currencySymbol={business?.currency || '₹'}
        onImportComplete={() => {
          showToast('Menu items and categories imported successfully!', 'success');
        }}
      />
    </div>
  );
};
