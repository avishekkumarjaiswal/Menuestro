import React, { useState, useEffect, useRef } from 'react';
import { Upload, Plus, Check, Sparkles, Image as ImageIcon, X } from 'lucide-react';
import { Category, MenuItem } from '../../types';
import { uploadImageFile } from '../../services/storageService';
import { createCategory } from '../../services/firestoreService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Toggle } from '../ui/Toggle';
import { ImageUpdateModal } from '../common/ImageUpdateModal';
import {
  FOOD_PRESETS,
  DEFAULT_DISH_PHOTO,
  getPresetImageForDishName,
  getMatchingPreset,
} from '../../services/imagePresets';

interface ItemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Omit<MenuItem, 'id' | 'businessId'>) => Promise<void>;
  itemToEdit?: MenuItem | null;
  categories: Category[];
  selectedCategoryId: string;
  currency?: string;
  onCategoryCreated?: (newCategory: Category) => void;
}

export const ItemDrawer: React.FC<ItemDrawerProps> = ({
  isOpen,
  onClose,
  onSave,
  itemToEdit,
  categories,
  selectedCategoryId,
  currency = '₹',
  onCategoryCreated,
}) => {
  const { business } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultSamplePhoto = DEFAULT_DISH_PHOTO;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  // New Category Creation State
  const [isCreatingNewCat, setIsCreatingNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [creatingCatLoading, setCreatingCatLoading] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  useEffect(() => {
    setIsCreatingNewCat(false);
    setNewCatName('');
    setNewTagInput('');
    if (itemToEdit) {
      setName(itemToEdit.name || '');
      setDescription(itemToEdit.description || '');
      setPrice(itemToEdit.price ? itemToEdit.price.toString() : '');
      setCategoryId(itemToEdit.categoryId || selectedCategoryId || (categories[0]?.id ?? 'cat-main'));
      setImageUrl(itemToEdit.imageUrl || defaultSamplePhoto);
      setIsAvailable(itemToEdit.isAvailable ?? true);
      setTags(itemToEdit.tags ? [...itemToEdit.tags] : []);
      setImageFile(null);
    } else {
      setName('');
      setDescription('');
      setPrice('');
      setCategoryId(selectedCategoryId !== 'all' ? selectedCategoryId : (categories[0]?.id ?? 'cat-main'));
      setImageUrl(defaultSamplePhoto);
      setIsAvailable(true);
      setTags([]);
      setImageFile(null);
    }
  }, [itemToEdit, selectedCategoryId, categories, isOpen]);

  // Automatically match preset photo & suggest dietary tag when typing dish name
  const handleNameChange = (val: string) => {
    setName(val);

    if (!imageFile) {
      const autoPhoto = getPresetImageForDishName(val);
      if (autoPhoto) {
        setImageUrl(autoPhoto);
      }
    }

    // Auto-suggest dietary tag if no tags are currently selected
    if (tags.length === 0 && val.trim().length >= 3) {
      const lower = val.toLowerCase();
      const isNonVeg = /chicken|mutton|fish|prawn|egg|meat|pork|beef|bacon|pepperoni|wings/i.test(lower);
      const isVeg = /paneer|veg|dal|mushroom|cheese|garlic knot|tofu|corn|margherita/i.test(lower);

      if (isNonVeg && !isVeg) {
        setTags(['Non-Veg']);
      } else if (isVeg && !isNonVeg) {
        setTags(['Veg']);
      }
    }
  };

  const handleQuickAddCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) {
      showToast('Please enter a category name', 'error');
      return;
    }

    try {
      setCreatingCatLoading(true);
      const bizId = business?.id || 'demo-biz';
      const catId = `cat-${Date.now()}`;
      const newCat: Category = {
        id: catId,
        businessId: bizId,
        name: trimmed,
        description: '',
        sortOrder: categories.length + 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await createCategory(bizId, newCat, catId);
      if (onCategoryCreated) onCategoryCreated(newCat);
      setCategoryId(catId);
      setIsCreatingNewCat(false);
      setNewCatName('');
      showToast(`Category "${trimmed}" created & selected!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to create category', 'error');
    } finally {
      setCreatingCatLoading(false);
    }
  };

  const handleImageFile = (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      showToast('Image file size exceeds 20MB limit', 'error');
      return;
    }
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleFormSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter an item name', 'error');
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      showToast('Please enter a valid price', 'error');
      return;
    }

    try {
      setSaving(true);
      let finalImageUrl = imageUrl || defaultSamplePhoto;

      if (imageFile) {
        finalImageUrl = await uploadImageFile(
          imageFile,
          `menu_items/item_${Date.now()}.jpg`
        );
      }

      await onSave({
        name: name.trim(),
        description: description.trim(),
        price: numPrice,
        categoryId: categoryId || categories[0]?.id || 'cat-main',
        imageUrl: finalImageUrl,
        isAvailable,
        tags: tags.length > 0 ? (tags as any) : [],
        sortOrder: itemToEdit?.sortOrder || 1,
        createdAt: itemToEdit?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      showToast(itemToEdit ? 'Menu item updated' : 'Menu item added');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to save menu item', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={itemToEdit ? 'Edit Menu Item' : 'Add Menu Item'}
      description="Update your item details and availability"
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => handleFormSubmit()}
            isLoading={saving}
          >
            {saving ? 'Saving...' : itemToEdit ? 'Save Changes' : 'Save Item'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleFormSubmit} className="space-y-4">
        {/* Item Photo Upload */}
        <div className="p-3 bg-[#F8F9FC] border border-[#E4E7EC] rounded-[14px] space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-[#101828] uppercase tracking-wider">
              Item Dish Photo
            </label>
            <span className="text-[11px] text-[#667085]">
              High resolution photo boosts orders
            </span>
          </div>

          <div className="flex items-center gap-3">
            <img
              src={imageUrl || defaultSamplePhoto}
              alt="Preview"
              className="w-16 h-16 rounded-[12px] object-cover border-2 border-white shadow-xs shrink-0 bg-white"
              onError={(e) => {
                (e.target as HTMLImageElement).src = defaultSamplePhoto;
              }}
            />
            <div className="flex-1 space-y-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="hidden"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={<Sparkles className="w-4 h-4" />}
                  onClick={() => setIsPhotoModalOpen(true)}
                >
                  Change Photo
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Upload className="w-4 h-4 text-[#667085]" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload File
                </Button>
              </div>
              <p className="text-[11px] text-[#98A2B3]">
                Supports JPG, PNG, or WebP up to 5MB
              </p>
            </div>
          </div>

          {/* Quick Preset Dish Badges */}
          <div className="pt-1 flex items-center gap-1.5 flex-wrap border-t border-[#E4E7EC]">
            <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider mr-1">
              Food Presets:
            </span>
            {FOOD_PRESETS.slice(0, 8).map((p, idx) => {
              const isMatched = imageUrl === p.url || getMatchingPreset(name)?.name === p.name;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setImageUrl(p.url);
                    setImageFile(null);
                  }}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                    isMatched
                      ? 'bg-[#078A55] text-white border-[#078A55] font-bold shadow-xs'
                      : 'bg-white text-[#344054] border-[#D0D5DD] hover:border-[#078A55]'
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Item Name */}
        <Input
          label="Item Name"
          placeholder="e.g. Garlic Knots With Cheese"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
        />

        {/* Description */}
        <Textarea
          label="Description"
          placeholder="Describe ingredients, taste profile, or dietary details..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        {/* Price & Category in 2 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <Input
            label={`Price (${currency})`}
            type="number"
            step="any"
            placeholder="279"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />

          <div className="w-full space-y-1">
            <div className="flex items-center justify-between h-[18px]">
              <label className="block text-xs font-medium text-slate-700">
                Category
              </label>
              {!isCreatingNewCat ? (
                <button
                  type="button"
                  onClick={() => setIsCreatingNewCat(true)}
                  className="text-xs font-semibold text-[#078A55] hover:text-[#067A4B] hover:underline inline-flex items-center gap-0.5 cursor-pointer leading-none"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Category</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreatingNewCat(false)}
                  className="text-xs font-semibold text-[#667085] hover:text-[#101828] cursor-pointer leading-none"
                >
                  Cancel
                </button>
              )}
            </div>

            {isCreatingNewCat ? (
              <div className="flex items-center gap-1.5 h-9">
                <input
                  type="text"
                  placeholder="e.g. Special Combos..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickAddCategory();
                    }
                  }}
                  autoFocus
                  className="flex-1 h-9 bg-white border border-[#078A55] rounded-lg px-3 text-xs sm:text-sm text-slate-900 focus:outline-hidden"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleQuickAddCategory}
                  isLoading={creatingCatLoading}
                  disabled={!newCatName.trim() || creatingCatLoading}
                  className="h-9 px-3"
                >
                  Add
                </Button>
              </div>
            ) : (
              <select
                value={categoryId}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    setIsCreatingNewCat(true);
                  } else {
                    setCategoryId(e.target.value);
                  }
                }}
                className="w-full h-9 bg-white border border-slate-300 hover:border-slate-400 focus:border-[#078A55] focus:ring-1 focus:ring-[#078A55] rounded-lg px-3 text-xs sm:text-sm text-slate-900 focus:outline-hidden transition-all cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
                <option value="__add_new__">+ Create New Category...</option>
              </select>
            )}
          </div>
        </div>

        {/* Item Tags & Badges */}
        <div className="p-3.5 bg-[#F8F9FC] border border-[#E4E7EC] rounded-[14px] space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-[#101828] uppercase tracking-wider">
              Item Tags & Badges
            </label>
            <span className="text-[11px] text-[#667085]">
              Click to toggle preset or type custom
            </span>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            {['Veg', 'Non-Veg', 'Bestseller', "Chef's Special", 'Spicy', 'Vegan', 'Gluten-Free', 'New'].map((preset) => {
              const isSelected = tags.some((t) => t.toLowerCase() === preset.toLowerCase());
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setTags(tags.filter((t) => t.toLowerCase() !== preset.toLowerCase()));
                    } else {
                      setTags([...tags, preset]);
                    }
                  }}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer inline-flex items-center gap-1 ${
                    isSelected
                      ? 'bg-[#078A55] text-white border-[#078A55] font-bold shadow-xs'
                      : 'bg-white text-[#344054] border-[#D0D5DD] hover:border-[#078A55]'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  <span>{preset}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tags with removal & Custom Tag Input */}
          <div className="pt-2 border-t border-[#E4E7EC] flex flex-wrap items-center gap-1.5">
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-xs font-semibold bg-white border border-[#D0D5DD] text-[#101828] px-2 py-0.5 rounded-md shadow-2xs"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                  className="text-[#98A2B3] hover:text-rose-600 cursor-pointer ml-0.5"
                  title="Remove tag"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            <div className="inline-flex items-center gap-1 flex-1 min-w-[150px]">
              <input
                type="text"
                placeholder="Add custom tag (e.g. 250gm, Half)..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmed = newTagInput.trim();
                    if (trimmed && !tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
                      setTags([...tags, trimmed]);
                      setNewTagInput('');
                    }
                  }
                }}
                className="h-[30px] px-2.5 bg-white border border-[#D0D5DD] rounded-md text-xs text-[#101828] placeholder-[#98A2B3] focus:border-[#078A55] focus:outline-hidden flex-1"
              />
              {newTagInput.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = newTagInput.trim();
                    if (trimmed && !tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
                      setTags([...tags, trimmed]);
                      setNewTagInput('');
                    }
                  }}
                  className="h-[30px] px-2.5 bg-[#078A55] text-white text-xs font-semibold rounded-md hover:bg-[#067A4B] cursor-pointer"
                >
                  + Add
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Availability Toggle */}
        <div className="pt-1">
          <Toggle
            checked={isAvailable}
            onChange={setIsAvailable}
            label={isAvailable ? 'Item is Available' : 'Item is Unavailable (Hidden from Menu)'}
          />
        </div>
      </form>

      <ImageUpdateModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onSelectImage={(url) => {
          setImageUrl(url);
          setImageFile(null);
        }}
        currentImageUrl={imageUrl || defaultSamplePhoto}
        title="Select Menu Item Photo"
        type="dish"
        businessId={business?.id}
      />
    </Modal>
  );
};
