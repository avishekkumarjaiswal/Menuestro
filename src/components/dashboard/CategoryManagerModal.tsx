import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Layers, AlertCircle } from 'lucide-react';
import { Category } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../common/Toast';
import { createCategory, updateCategory, deleteCategory } from '../../services/firestoreService';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  businessId: string;
  itemCounts?: Record<string, number>;
  onCategoriesChanged?: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  businessId,
  itemCounts = {},
  onCategoriesChanged,
}) => {
  const { showToast } = useToast();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add new category
  const handleAddCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      showToast('Please enter a category name', 'error');
      return;
    }

    try {
      setIsAdding(true);
      const catId = `cat-${Date.now()}`;
      await createCategory(
        businessId,
        {
          name: trimmed,
          description: '',
          sortOrder: categories.length + 1,
          isActive: true,
        },
        catId
      );
      setNewCategoryName('');
      showToast(`Category "${trimmed}" added!`, 'success');
      if (onCategoriesChanged) onCategoriesChanged();
    } catch (err) {
      console.error(err);
      showToast('Failed to add category', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  // Start editing category
  const startEditing = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  // Save edited category
  const handleSaveEdit = async (catId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      showToast('Category name cannot be empty', 'error');
      return;
    }

    try {
      setSavingEdit(true);
      await updateCategory(businessId, catId, {
        name: trimmed,
      });
      setEditingId(null);
      setEditingName('');
      showToast('Category updated', 'success');
      if (onCategoriesChanged) onCategoriesChanged();
    } catch (err) {
      console.error(err);
      showToast('Failed to update category', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Empty categories count
  const emptyCategories = categories.filter((c) => (itemCounts[c.id] || 0) === 0);

  // Clean all empty/unused categories at once
  const handleCleanEmptyCategories = async () => {
    if (emptyCategories.length === 0) return;
    try {
      setDeletingId('all-empty');
      for (const cat of emptyCategories) {
        await deleteCategory(businessId, cat.id);
      }
      showToast(`Removed ${emptyCategories.length} empty categories`, 'success');
      if (onCategoriesChanged) onCategoriesChanged();
    } catch (err) {
      console.error(err);
      showToast('Failed to remove empty categories', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Delete category (instant for empty categories without blocking alert)
  const handleDeleteCategory = async (cat: Category) => {
    const count = itemCounts[cat.id] || 0;
    if (count > 0) {
      const confirmMessage = `Deleting "${cat.name}" will also delete ${count} item(s) inside it. Are you sure?`;
      if (typeof window !== 'undefined' && window.confirm && !window.confirm(confirmMessage)) return;
    }

    try {
      setDeletingId(cat.id);
      await deleteCategory(businessId, cat.id);
      showToast(`Category "${cat.name}" removed`, 'success');
      if (onCategoriesChanged) onCategoriesChanged();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete category', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Categories"
      description="Create, rename, or delete menu categories for your restaurant"
      maxWidth="md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Add Category Form */}
        <form onSubmit={handleAddCategory} className="flex items-center gap-2">
          <Input
            placeholder="e.g. Starters, Main Course, Mocktails..."
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="flex-1"
          />
          <Button
            type="submit"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            isLoading={isAdding}
            disabled={!newCategoryName.trim() || isAdding}
          >
            Add
          </Button>
        </form>

        {/* Existing Categories List */}
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#667085]">
              Current Categories ({categories.length})
            </label>
            {emptyCategories.length > 0 && (
              <button
                type="button"
                onClick={handleCleanEmptyCategories}
                disabled={deletingId === 'all-empty'}
                className="text-[11px] font-semibold text-[#D92D20] hover:text-[#B42318] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                Remove {emptyCategories.length} unused {emptyCategories.length === 1 ? 'category' : 'categories'}
              </button>
            )}
          </div>

          {categories.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-[#D0D5DD] rounded-[10px] text-xs text-[#667085]">
              No categories found. Add your first category above!
            </div>
          ) : (
            categories.map((cat) => {
              const count = itemCounts[cat.id] || 0;
              const isCurrentEditing = editingId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 bg-white border border-[#E4E7EC] hover:border-[#D0D5DD] rounded-[10px] shadow-2xs transition-all gap-2"
                >
                  {isCurrentEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        autoFocus
                        className="flex-1 h-9 px-2.5 text-sm bg-white border border-[#078A55] rounded-[6px] focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(cat.id)}
                        disabled={savingEdit}
                        className="w-8 h-8 rounded-[6px] bg-[#078A55] text-white flex items-center justify-center hover:bg-[#067A4B] cursor-pointer"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="w-8 h-8 rounded-[6px] bg-[#F2F4F7] text-[#667085] flex items-center justify-center hover:bg-[#E4E7EC] cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Layers className="w-4 h-4 text-[#078A55] shrink-0" />
                        <span className="text-sm font-semibold text-[#101828] truncate">
                          {cat.name}
                        </span>
                        <span className="text-[11px] font-medium text-[#667085] bg-[#F2F4F7] px-2 py-0.5 rounded-full shrink-0">
                          {count} {count === 1 ? 'dish' : 'dishes'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditing(cat)}
                          className="p-1.5 text-[#667085] hover:text-[#101828] hover:bg-[#F2F4F7] rounded-[6px] transition-colors cursor-pointer"
                          title="Rename Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          disabled={deletingId === cat.id}
                          className="p-1.5 text-[#667085] hover:text-[#D92D20] hover:bg-[#FEF3F2] rounded-[6px] transition-colors cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
