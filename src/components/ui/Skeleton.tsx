import React from 'react';

export const MetricSkeleton: React.FC = () => (
  <div className="bg-white border border-[#E4E7EC] rounded-[16px] p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-4 w-24 bg-[#EEF1F5] rounded-md" />
      <div className="w-10 h-10 rounded-[10px] bg-[#EEF1F5]" />
    </div>
    <div className="mt-4">
      <div className="h-10 w-32 bg-[#EEF1F5] rounded-md" />
      <div className="h-3 w-28 bg-[#EEF1F5] rounded-md mt-3" />
    </div>
  </div>
);

export const TableRowSkeleton: React.FC = () => (
  <div className="flex items-center justify-between py-4 px-6 border-b border-[#EEF1F5] animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-[8px] bg-[#EEF1F5] shrink-0" />
      <div className="space-y-2">
        <div className="h-4 w-36 bg-[#EEF1F5] rounded-md" />
        <div className="h-3 w-24 bg-[#EEF1F5] rounded-md" />
      </div>
    </div>
    <div className="h-4 w-20 bg-[#EEF1F5] rounded-md hidden sm:block" />
    <div className="h-4 w-16 bg-[#EEF1F5] rounded-md" />
    <div className="w-11 h-6 bg-[#EEF1F5] rounded-full" />
    <div className="w-8 h-8 bg-[#EEF1F5] rounded-md" />
  </div>
);

export const PublicMenuItemSkeleton: React.FC = () => (
  <div className="bg-white border border-[#E4E7EC] rounded-[12px] p-3 flex gap-3.5 animate-pulse">
    <div className="w-[88px] h-[88px] rounded-[10px] bg-[#EEF1F5] shrink-0" />
    <div className="flex-1 flex flex-col justify-between py-0.5">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="h-4 w-32 bg-[#EEF1F5] rounded-md" />
          <div className="h-4 w-14 bg-[#EEF1F5] rounded-md" />
        </div>
        <div className="h-3 w-44 bg-[#EEF1F5] rounded-md mt-2" />
      </div>
      <div className="h-3 w-20 bg-[#EEF1F5] rounded-md" />
    </div>
  </div>
);
