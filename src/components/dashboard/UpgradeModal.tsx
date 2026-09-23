import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../common/Toast';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();

  const handleUpgrade = () => {
    showToast('Plan upgraded to Pro successfully!');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upgrade to Menuestro Pro"
      description="Supercharge your restaurant's digital presence"
      maxWidth="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpgrade}>
            Upgrade Now
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Pricing banner */}
        <div className="p-4 rounded-[12px] bg-[#EAF8F1] border border-[#D1EEDC] text-center">
          <span className="text-xs font-bold text-[#078A55] uppercase tracking-wider">
            Restaurant Growth Plan
          </span>
          <div className="mt-1 flex items-baseline justify-center gap-1">
            <span className="text-3xl font-extrabold text-[#101828]">₹999</span>
            <span className="text-xs text-[#667085] font-medium">/month</span>
          </div>
          <p className="text-xs text-[#078A55] mt-1">Billed annually or cancel anytime</p>
        </div>

        {/* Feature list */}
        <div className="space-y-2.5 text-xs text-[#344054]">
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded-full bg-[#EAF8F1] text-[#078A55] flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
            <span>Unlimited table menu scans & live views</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded-full bg-[#EAF8F1] text-[#078A55] flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
            <span>Direct 1-click Google Reviews integration</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded-full bg-[#EAF8F1] text-[#078A55] flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
            <span>High-resolution printable standee QR codes</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded-full bg-[#EAF8F1] text-[#078A55] flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
            <span>Instant item availability & sold-out toggling</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
