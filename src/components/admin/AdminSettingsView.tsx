import React from 'react';
import {
  Settings,
  ShieldCheck,
  Database,
  CheckCircle,
  Globe,
  Sliders
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminSettingsView: React.FC = () => {
  const { user, profile } = useAuth();

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-[#078A55]" />
          <span>Platform Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Platform credentials, tenant configuration defaults, and system status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Super Admin Identity */}
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#078A55] flex items-center justify-center font-bold flex-shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Administrator Account</h2>
              <p className="text-xs text-slate-500">Active platform session</p>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-2 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 flex-shrink-0">Name:</span>
              <span className="text-slate-900 font-semibold truncate">{profile?.name || user?.displayName || 'Administrator'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 flex-shrink-0">Email:</span>
              <span className="text-slate-900 font-mono truncate">{user?.email || 'admin@menuestro.com'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 flex-shrink-0">User ID:</span>
              <span className="text-slate-600 font-mono text-[11px] truncate max-w-[150px] sm:max-w-[240px]">{user?.uid}</span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-slate-200">
              <span className="text-slate-500">Role:</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700">
                Administrator
              </span>
            </div>
          </div>
        </div>

        {/* Review Engine Config */}
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold flex-shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Review Assistant Configuration</h2>
              <p className="text-xs text-slate-500">Rule-based deterministic engine</p>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-2 text-xs">
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 flex-shrink-0">Engine Architecture:</span>
              <span className="text-slate-900 font-semibold text-right">Rule-Based Deterministic</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 flex-shrink-0">External Dependencies:</span>
              <span className="text-[#078A55] font-semibold text-right">Zero external API dependencies</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 flex-shrink-0">Execution Speed:</span>
              <span className="text-slate-900 font-mono text-right">&lt; 15 ms (Client-Side)</span>
            </div>
          </div>
        </div>

        {/* Database & Multi-Tenancy */}
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Database & Security</h2>
              <p className="text-xs text-slate-500">Multi-tenant isolation & data store</p>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 flex-shrink-0">Database Engine:</span>
              <span className="text-slate-900 font-medium text-right">Google Cloud Firestore</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 flex-shrink-0">Multi-Tenancy:</span>
              <span className="text-[#078A55] font-medium flex items-center gap-1 text-right">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> Scoped by restaurant ID
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 flex-shrink-0">Slug Resolution:</span>
              <span className="text-[#078A55] font-medium flex items-center gap-1 text-right">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> Unique URL Index
              </span>
            </div>
          </div>
        </div>

        {/* Platform System Info */}
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">System Information</h2>
              <p className="text-xs text-slate-500">Environment and build version</p>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-2 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 flex-shrink-0">Platform Version:</span>
              <span className="text-slate-900 font-mono">v2.4.0</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 flex-shrink-0">Framework:</span>
              <span className="text-slate-900 font-medium truncate">React 18 + Vite + Tailwind CSS</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 flex-shrink-0">Status:</span>
              <span className="text-[#078A55] font-medium">All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
