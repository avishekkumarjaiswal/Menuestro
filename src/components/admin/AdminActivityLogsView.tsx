import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  X
} from 'lucide-react';
import { AdminActivityLog } from '../../types';
import { subscribeAdminActivityLogs } from '../../services/firestoreService';

export const AdminActivityLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AdminActivityLog | null>(null);

  useEffect(() => {
    const unsub = subscribeAdminActivityLogs(setLogs, undefined, 200);
    return () => unsub();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter;
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.adminName && log.adminName.toLowerCase().includes(search.toLowerCase())) ||
      (log.businessName && log.businessName.toLowerCase().includes(search.toLowerCase())) ||
      log.adminEmail.toLowerCase().includes(search.toLowerCase());
    return matchesEntity && matchesSearch;
  });

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 sm:w-6 sm:h-6 text-[#078A55]" />
            <span>Audit Logs</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Audit history of administrative actions, menu modifications, and settings updates.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by admin, action, or restaurant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#078A55]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'restaurant', label: 'Restaurants' },
            { id: 'menu_item', label: 'Menu Items' },
            { id: 'review_phrase', label: 'Phrases' },
            { id: 'review_template', label: 'Templates' },
            { id: 'qr_code', label: 'QR Codes' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setEntityFilter(item.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition flex-shrink-0 ${
                entityFilter === item.id
                  ? 'bg-[#078A55] text-white shadow-xs font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE CARDS VIEW (< md) */}
      <div className="block md:hidden space-y-3">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            onClick={() => setSelectedLog(log)}
            className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-2.5 hover:border-slate-300 transition cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-xs text-slate-900 leading-tight">
                {log.action}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-100 text-slate-700 flex-shrink-0">
                {log.entityType}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span className="font-medium text-slate-700">{log.adminName}</span>
              <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
            </div>

            {log.businessName && (
              <div className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md flex items-center justify-between">
                <span>Restaurant: <strong className="font-semibold">{log.businessName}</strong></span>
                <span className="text-emerald-600 font-semibold text-[10px]">Inspect ›</span>
              </div>
            )}
          </div>
        ))}

        {filteredLogs.length === 0 && (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
            No activity logs recorded matching criteria.
          </div>
        )}
      </div>

      {/* DESKTOP AUDIT LOGS TABLE (>= md) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Admin</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Restaurant</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-slate-50/80 transition cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <td className="py-3 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 block">{log.adminName}</span>
                    <span className="text-[11px] text-slate-400">{log.adminEmail}</span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">{log.action}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-100 text-slate-700">
                      {log.entityType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {log.businessName || log.businessId || '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-[#078A55] hover:text-[#067347] font-medium text-xs">
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    No activity logs recorded matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-900">Log Entry Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block font-medium text-[11px]">Action</span>
                <span className="text-slate-900 font-semibold text-sm">{selectedLog.action}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block font-medium text-[11px]">Admin</span>
                  <span className="text-slate-700">{selectedLog.adminName} ({selectedLog.adminEmail})</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium text-[11px]">Timestamp</span>
                  <span className="text-slate-700 font-mono text-[11px]">{new Date(selectedLog.timestamp).toISOString()}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-500 block font-medium text-[11px]">Entity Target</span>
                <span className="text-slate-700 font-mono text-[11px]">{selectedLog.entityType} (ID: {selectedLog.entityId})</span>
              </div>
              {selectedLog.metadata && (
                <div>
                  <span className="text-slate-500 block font-medium text-[11px] mb-1">Payload Details</span>
                  <pre className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
