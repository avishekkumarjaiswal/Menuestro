import React, { useState, useEffect, useRef } from 'react';
import { Upload, Plus, Check, Sparkles, Image as ImageIcon } from 'lucide-react';
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

  const defaultSamplePhoto =
    'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=400&auto=format&fit=crop&q=80';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [saving, setSaving] = useState(false);

  // New Category Creation State
  const [isCreatingNewCat, setIsCreatingNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [creatingCatLoading, setCreatingCatLoading] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  useEffect(() => {
    setIsCreatingNewCat(false);
    setNewCatName('');
    if (itemToEdit) {
      setName(itemToEdit.name || '');
      setDescription(itemToEdit.description || '');
      setPrice(itemToEdit.price ? itemToEdit.price.toString() : '');
      setCategoryId(itemToEdit.categoryId || selectedCategoryId || (categories[0]?.id ?? 'cat-main'));
      setImageUrl(itemToEdit.imageUrl || defaultSamplePhoto);
      setIsAvailable(itemToEdit.isAvailable ?? true);
      setImageFile(null);
    } else {
      setName('');
      setDescription('');
      setPrice('');
      setCategoryId(selectedCategoryId !== 'all' ? selectedCategoryId : (categories[0]?.id ?? 'cat-main'));
      setImageUrl(defaultSamplePhoto);
      setIsAvailable(true);
      setImageFile(null);
    }
  }, [itemToEdit, selectedCategoryId, categories, isOpen]);

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
            {[
              { name: 'Pasta', url: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600&auto=format&fit=crop&q=80' },
              { name: 'Pizza', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80' },
              { name: 'Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80' },
              { name: 'Salad', url: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop&q=80' },
              { name: 'Curry', url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=80' },
              { name: 'Dessert', url: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=600&auto=format&fit=crop&q=80' },
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setImageUrl(p.url);
                  setImageFile(null);
                }}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                  imageUrl === p.url
                    ? 'bg-[#078A55] text-white border-[#078A55] font-semibold'
                    : 'bg-white text-[#344054] border-[#D0D5DD] hover:border-[#078A55]'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Item Name */}
        <Input
          label="Item Name"
          placeholder="e.g. Pasta Alfredo"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={`Price (${currency})`}
            type="number"
            step="any"
            placeholder="279"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-[#344054]">
                Category
              </label>
              {!isCreatingNewCat ? (
                <button
                  type="button"
                  onClick={() => setIsCreatingNewCat(true)}
                  className="text-xs font-semibold text-[#078A55] hover:text-[#067A4B] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Category</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreatingNewCat(false)}
                  className="text-xs font-semibold text-[#667085] hover:text-[#101828] cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            {isCreatingNewCat ? (
              <div className="flex items-center gap-1.5">
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
                  className="flex-1 h-[44px] bg-white border border-[#078A55] rounded-[10px] px-3 text-sm text-[#101828] focus:outline-hidden"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleQuickAddCategory}
                  isLoading={creatingCatLoading}
                  disabled={!newCatName.trim() || creatingCatLoading}
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
                className="w-full h-[44px] bg-white border border-[#D0D5DD] hover:border-[#98A2B3] focus:border-[#078A55] focus:ring-2 focus:ring-[#078A55]/20 rounded-[10px] px-3.5 text-sm text-[#101828] focus:outline-hidden transition-all cursor-pointer"
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

        {/* Availability Toggle */}
        <div className="pt-2">
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
