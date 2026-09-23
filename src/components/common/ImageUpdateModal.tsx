import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { uploadImageFile, validateImageFile, fileToOptimizedDataUrl } from '../../services/storageService';
import { Upload, Link as LinkIcon, Image as ImageIcon, Check, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';

export interface ImageUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (url: string) => void;
  currentImageUrl?: string;
  title: string;
  type: 'logo' | 'cover' | 'dish';
  businessId?: string;
}

const PRESET_LOGOS = [
  { label: 'Artisan Bistro', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&auto=format&fit=crop&q=80', category: 'Bistro' },
  { label: 'Craft Bakery & Cafe', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80', category: 'Cafe' },
  { label: 'Woodfired Pizza Co.', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80', category: 'Italian' },
  { label: 'Cellar & Fine Wine', url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&auto=format&fit=crop&q=80', category: 'Fine Dining' },
  { label: 'Prime Burger & Smokehouse', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80', category: 'Grill' },
  { label: 'Espresso & Roasters', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&auto=format&fit=crop&q=80', category: 'Coffee' },
  { label: 'Fresh Green Harvest', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&auto=format&fit=crop&q=80', category: 'Healthy' },
  { label: 'Sushi & Asian Wok', url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&auto=format&fit=crop&q=80', category: 'Asian' },
];

const PRESET_COVERS = [
  { label: 'Warm Atmospheric Dining', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80', desc: 'Cozy mood lighting & tables' },
  { label: 'Rooftop Sunset Terrace', url: 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=1200&auto=format&fit=crop&q=80', desc: 'Golden hour open-air patio' },
  { label: 'Open Kitchen & Wood Fired Oven', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80', desc: 'Chefs cooking at the flame' },
  { label: 'Cocktail Bar & Lounge', url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&auto=format&fit=crop&q=80', desc: 'Modern speakeasy vibe' },
  { label: 'Gourmet Spread & Wine', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80', desc: 'Sumptuous feast presentation' },
  { label: 'Sunlit Morning Cafe', url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&auto=format&fit=crop&q=80', desc: 'Bright, airy brunch ambiance' },
  { label: 'Rustic Brick Trattoria', url: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1200&auto=format&fit=crop&q=80', desc: 'Traditional artisan dining' },
  { label: 'Fine Dining White Linen', url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&auto=format&fit=crop&q=80', desc: 'Elegant crystal & candle setting' },
];

const PRESET_DISHES = [
  { label: 'Truffle Bruschetta', url: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600&auto=format&fit=crop&q=80', category: 'Appetizer' },
  { label: 'Burrata Caprese', url: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop&q=80', category: 'Salad' },
  { label: 'Pappardelle al Tartufo', url: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600&auto=format&fit=crop&q=80', category: 'Pasta' },
  { label: 'Artisan Margherita Pizza', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80', category: 'Pizza' },
  { label: 'Gourmet Burger & Fries', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80', category: 'Mains' },
  { label: 'Butter Chicken Masala', url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=80', category: 'Curry' },
  { label: 'Smoky Paneer Tikka', url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop&q=80', category: 'Tandoori' },
  { label: 'Royal Chicken Biryani', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80', category: 'Rice' },
  { label: 'Dark Chocolate Lava Cake', url: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=600&auto=format&fit=crop&q=80', category: 'Dessert' },
  { label: 'Signature Iced Coffee', url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80', category: 'Beverage' },
];

export const ImageUpdateModal: React.FC<ImageUpdateModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  currentImageUrl = '',
  title,
  type,
  businessId,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [selectedUrl, setSelectedUrl] = useState<string>(currentImageUrl);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [urlError, setUrlError] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedUrl(currentImageUrl);
      setCustomUrlInput(currentImageUrl.startsWith('http') ? currentImageUrl : '');
      setUrlError('');
      setUploadError('');
      setActiveTab('upload');
    }
  }, [isOpen, currentImageUrl]);

  const handleProcessFile = async (file: File) => {
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid image file.');
      return;
    }

    setUploadError('');
    setIsUploading(true);

    const maxWidth = type === 'logo' ? 400 : 1000;
    const maxHeight = type === 'logo' ? 400 : 600;

    // 1. Instantly set client-side preview in ~30ms so the user sees the photo immediately
    try {
      const instantPreview = await fileToOptimizedDataUrl(file, maxWidth, maxHeight, 0.82);
      setSelectedUrl(instantPreview);
    } catch {
      // Ignore preview failure, uploadImageFile will handle it
    }

    // 2. Perform upload / compression
    try {
      const fileName = `${type}_${Date.now()}.${file.name.split('.').pop() || 'jpg'}`;
      const path = businessId ? `businesses/${businessId}/${fileName}` : `uploads/${fileName}`;
      const uploadedUrl = await uploadImageFile(file, path, businessId);
      if (uploadedUrl) {
        setSelectedUrl(uploadedUrl);
      }
    } catch (err: any) {
      console.error('File upload error:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleApplyUrl = () => {
    const trimmed = customUrlInput.trim();
    if (!trimmed) {
      setUrlError('Please enter an image URL');
      return;
    }
    if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('data:image/')) {
      setUrlError('Please enter a valid URL starting with http:// or https://');
      return;
    }
    setUrlError('');
    setSelectedUrl(trimmed);
  };

  const handleConfirm = () => {
    if (selectedUrl) {
      onSelectImage(selectedUrl);
    }
    onClose();
  };

  const presets = type === 'logo' ? PRESET_LOGOS : type === 'cover' ? PRESET_COVERS : PRESET_DISHES;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={`Update, upload, or replace your ${type === 'logo' ? 'restaurant logo' : type === 'cover' ? 'header cover banner' : 'dish photo'}.`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs text-[#667085] truncate max-w-[280px]">
            {selectedUrl !== currentImageUrl ? (
              <span className="inline-flex items-center gap-1 text-[#078A55] font-semibold">
                <Check className="w-3.5 h-3.5" />
                New image ready to apply
              </span>
            ) : (
              <span>Current photo selected</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={isUploading || !selectedUrl}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Apply Image
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1 bg-[#F2F4F7] rounded-[10px]">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-[8px] transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white text-[#101828] shadow-xs'
                : 'text-[#667085] hover:text-[#101828]'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-[8px] transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'bg-white text-[#101828] shadow-xs'
                : 'text-[#667085] hover:text-[#101828]'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>Image URL</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-[8px] transition-all cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-white text-[#101828] shadow-xs'
                : 'text-[#667085] hover:text-[#101828]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#078A55]" />
            <span>Curated Presets</span>
          </button>
        </div>

        {/* Tab 1: Upload File */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-[16px] text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                isDragOver
                  ? 'border-[#078A55] bg-[#EAF8F1]'
                  : 'border-[#D0D5DD] bg-[#F9FAFB] hover:border-[#078A55] hover:bg-white'
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <RefreshCw className="w-8 h-8 text-[#078A55] animate-spin" />
                  <p className="text-sm font-semibold text-[#101828]">Processing & Optimizing Image...</p>
                  <p className="text-xs text-[#667085]">Preparing crisp mobile-friendly dimensions</p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-[#EAF8F1] flex items-center justify-center text-[#078A55]">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#101828]">
                      Click to browse or drag and drop your photo
                    </p>
                    <p className="text-xs text-[#667085] mt-0.5">
                      Supports JPG, PNG, WebP or SVG up to 8MB
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#D0D5DD] rounded-[8px] text-xs font-semibold text-[#344054] shadow-xs">
                    Choose from computer
                  </span>
                </>
              )}
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 p-3 bg-[#FEF3F2] border border-[#FECDCA] rounded-[10px] text-xs text-[#B42318]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Image URL */}
        {activeTab === 'url' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#344054]">
                Direct Web Image Link
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="https://images.unsplash.com/... or https://your-site.com/photo.jpg"
                    value={customUrlInput}
                    onChange={(e) => {
                      setCustomUrlInput(e.target.value);
                      setUrlError('');
                    }}
                    leftIcon={<LinkIcon className="w-4 h-4 text-[#98A2B3]" />}
                  />
                </div>
                <Button variant="secondary" onClick={handleApplyUrl} className="shrink-0">
                  Preview URL
                </Button>
              </div>
              {urlError ? (
                <p className="text-xs text-[#D92D20] font-medium">{urlError}</p>
              ) : (
                <p className="text-[11px] text-[#667085]">
                  Paste links from Unsplash, Google Photos, restaurant websites, or Cloudinary.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Curated Presets */}
        {activeTab === 'presets' && (
          <div className="space-y-3">
            <p className="text-xs text-[#667085]">
              Select from professionally shot and royalty-free hospitality imagery:
            </p>
            <div
              className={`grid gap-3 max-h-[300px] overflow-y-auto pr-1 ${
                type === 'cover' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
              }`}
            >
              {presets.map((preset, idx) => {
                const isSelected = selectedUrl === preset.url;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedUrl(preset.url)}
                    className={`group relative rounded-[12px] overflow-hidden border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#078A55] ring-2 ring-[#078A55]/20 shadow-sm'
                        : 'border-[#E4E7EC] hover:border-[#078A55]/60 hover:shadow-xs'
                    }`}
                  >
                    <div className={type === 'cover' ? 'h-24 w-full' : 'h-20 w-full'}>
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2 bg-white">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[#101828] truncate">
                          {preset.label}
                        </p>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-[#078A55] text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      {'desc' in preset && (
                        <p className="text-[10px] text-[#667085] truncate mt-0.5">
                          {preset.desc}
                        </p>
                      )}
                      {'category' in preset && (
                        <span className="inline-block text-[10px] font-medium text-[#078A55] mt-0.5">
                          {preset.category}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Preview Comparison */}
        {selectedUrl && (
          <div className="p-4 bg-[#F8F9FC] border border-[#E4E7EC] rounded-[14px] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#344054] flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#078A55]" />
                Selected Image Live Preview
              </span>
              {selectedUrl !== currentImageUrl && (
                <button
                  type="button"
                  onClick={() => setSelectedUrl(currentImageUrl)}
                  className="text-xs font-semibold text-[#078A55] hover:underline cursor-pointer"
                >
                  Revert to current
                </button>
              )}
            </div>

            <div className="relative rounded-[10px] overflow-hidden border border-[#D0D5DD] bg-white flex items-center justify-center">
              {type === 'cover' ? (
                <img
                  src={selectedUrl}
                  alt="Selected Preview"
                  className="w-full h-32 object-cover"
                  onError={() => setUrlError('Unable to load image from this URL. Please verify the link.')}
                />
              ) : type === 'logo' ? (
                <div className="p-4 flex items-center justify-center bg-[#F2F4F7] w-full">
                  <img
                    src={selectedUrl}
                    alt="Selected Logo"
                    className="w-20 h-20 rounded-[14px] object-cover border border-[#D0D5DD] shadow-xs"
                    onError={() => setUrlError('Unable to load image from this URL. Please verify the link.')}
                  />
                </div>
              ) : (
                <img
                  src={selectedUrl}
                  alt="Selected Dish"
                  className="w-full h-36 object-cover"
                  onError={() => setUrlError('Unable to load image from this URL. Please verify the link.')}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
