import React from 'react';
import { Star, Flame, Sparkles, Award } from 'lucide-react';

export interface TagBadgeProps {
  tag: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  size = 'xs',
  className = '',
}) => {
  const normalized = tag.trim().toLowerCase();

  const isVeg =
    normalized === 'veg' ||
    normalized === 'vegetarian' ||
    normalized === 'pure veg';

  const isNonVeg =
    normalized === 'non-veg' ||
    normalized === 'nonveg' ||
    normalized === 'non veg' ||
    normalized === 'non-vegetarian';

  const isEgg =
    normalized === 'egg' ||
    normalized === 'eggetarian' ||
    normalized === 'contains egg';

  const isBestseller =
    normalized === 'bestseller' ||
    normalized === 'best seller' ||
    normalized === 'popular' ||
    normalized === 'must try';

  const isChefSpecial =
    normalized === "chef's special" ||
    normalized === 'chef special' ||
    normalized === 'special' ||
    normalized === 'signature';

  const isSpicy =
    normalized === 'spicy' ||
    normalized === 'extra spicy' ||
    normalized === 'hot';

  const isVegan = normalized === 'vegan';

  const isGlutenFree =
    normalized === 'gluten-free' ||
    normalized === 'gluten free' ||
    normalized === 'gf';

  const isNew = normalized === 'new' || normalized === 'new arrival';

  // Size styling
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  }[size];

  // Specific Tag Renderers
  if (isVeg) {
    return (
      <span
        className={`inline-flex items-center font-bold text-[#078A55] bg-[#EAF8F1] border border-[#078A55]/30 rounded-md ${sizeClasses} ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#078A55] shrink-0" />
        <span>Veg</span>
      </span>
    );
  }

  if (isNonVeg) {
    return (
      <span
        className={`inline-flex items-center font-bold text-[#991B1B] bg-[#FEF2F2] border border-[#EF4444]/30 rounded-md ${sizeClasses} ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] shrink-0" />
        <span>Non-Veg</span>
      </span>
    );
  }

  if (isEgg) {
    return (
      <span
        className={`inline-flex items-center font-bold text-[#B45309] bg-[#FFFBEB] border border-[#F59E0B]/30 rounded-md ${sizeClasses} ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shrink-0" />
        <span>Egg</span>
      </span>
    );
  }

  if (isBestseller) {
    return (
      <span
        className={`inline-flex items-center font-bold text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] rounded-md ${sizeClasses} ${className}`}
      >
        <Star className="w-2.5 h-2.5 fill-[#D97706] text-[#D97706] shrink-0" />
        <span>Bestseller</span>
      </span>
    );
  }

  if (isChefSpecial) {
    return (
      <span
        className={`inline-flex items-center font-bold text-[#5B21B6] bg-[#F5F3FF] border border-[#DDD6FE] rounded-md ${sizeClasses} ${className}`}
      >
        <Award className="w-2.5 h-2.5 text-[#7C3AED] shrink-0" />
        <span>Chef's Special</span>
      </span>
    );
  }

  if (isSpicy) {
    return (
      <span
        className={`inline-flex items-center font-bold text-[#991B1B] bg-[#FFF1F2] border border-[#FECDD3] rounded-md ${sizeClasses} ${className}`}
      >
        <Flame className="w-2.5 h-2.5 text-[#E11D48] shrink-0" />
        <span>Spicy</span>
      </span>
    );
  }

  if (isVegan) {
    return (
      <span
        className={`inline-flex items-center font-bold text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] rounded-md ${sizeClasses} ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#059669] shrink-0" />
        <span>Vegan</span>
      </span>
    );
  }

  if (isGlutenFree) {
    return (
      <span
        className={`inline-flex items-center font-bold text-[#155E75] bg-[#ECFEFF] border border-[#A5F3FC] rounded-md ${sizeClasses} ${className}`}
      >
        <span>🌾 Gluten-Free</span>
      </span>
    );
  }

  if (isNew) {
    return (
      <span
        className={`inline-flex items-center font-bold text-[#1E40AF] bg-[#EFF6FF] border border-[#BFDBFE] rounded-md ${sizeClasses} ${className}`}
      >
        <Sparkles className="w-2.5 h-2.5 text-[#3B82F6] shrink-0" />
        <span>New</span>
      </span>
    );
  }

  // Default custom tag (e.g. portion size "Half | 500gm", "Quarter", "250gm", "Chef Choice", etc.)
  return (
    <span
      className={`inline-flex items-center font-medium text-[#344054] bg-[#F8F9FC] border border-[#E4E7EC] rounded-md ${sizeClasses} ${className}`}
    >
      <span>{tag}</span>
    </span>
  );
};
