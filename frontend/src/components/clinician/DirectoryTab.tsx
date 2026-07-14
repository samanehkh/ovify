import React, { useState, useEffect } from 'react';
import { fetchPatientDirectory } from '../../services/api';

interface DirectoryTabProps {
  privacyMode: boolean;
  handleOpenPatientChart: (patientId: number) => void;
  clinicianToken: string | null;
}

export const DirectoryTab: React.FC<DirectoryTabProps> = ({
  privacyMode,
  handleOpenPatientChart,
  clinicianToken
}) => {
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryPatients, setDirectoryPatients] = useState<any[]>([]);
  const [directoryPage, setDirectoryPage] = useState(1);
  const [directoryTotal, setDirectoryTotal] = useState(0);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const directoryLimit = 20;

  const maskLastName = (fullName: string) => {
    if (!privacyMode) return fullName;
    const parts = fullName.split(' ');
    if (parts.length <= 1) return fullName;
    return `${parts[0]} ${parts[1][0]}.`;
  };

  const fetchDirectoryData = async () => {
    setLoadingDirectory(true);
    try {
      const data = await fetchPatientDirectory(
        directorySearch,
        '', // Date filter omitted
        'All Packages', // Package filter omitted
        directoryPage,
        directoryLimit
      );
      setDirectoryPatients(data.patients);
      setDirectoryTotal(data.total_count);
    } catch (err: any) {
      console.error("Failed to fetch directory data", err);
    } finally {
      setLoadingDirectory(false);
    }
  };

  useEffect(() => {
    setDirectoryPage(1);
  }, [directorySearch]);

  useEffect(() => {
    if (clinicianToken) {
      fetchDirectoryData();
    }
  }, [clinicianToken, directorySearch, directoryPage]);

  return (
    <div className="max-w-7xl bg-white/70 backdrop-blur-md border border-navy-10 rounded-3xl p-8 shadow-md">
      <div className="mb-6 text-left">
        <h3 className="font-heading text-sm font-bold text-navy uppercase tracking-wider mb-2">Patient Directory</h3>
        <p className="font-body text-xs text-navy-70 leading-relaxed">
          Search, filter, and inspect demographics or stimulation protocols for registered patients.
        </p>
      </div>

      {/* Header Toolbar (Search) */}
      <div className="mb-8 text-left max-w-md">
        <label htmlFor="dir-search" className="block text-[9px] font-bold text-navy uppercase tracking-wider mb-1.5">
          Search Patients
        </label>
        <input
          id="dir-search"
          type="text"
          placeholder="Search by name, email or phone..."
          value={directorySearch}
          onChange={(e) => setDirectorySearch(e.target.value)}
          className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/20 focus:border-lavender transition-all min-h-[48px] shadow-inner"
        />
      </div>

      {/* Table View */}
      <div className="overflow-x-auto text-left rounded-2xl border border-navy-10/40 bg-white/50 shadow-inner">
        {loadingDirectory ? (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-lavender border-t-transparent animate-spin" />
            <span className="font-heading text-xs font-bold text-navy-70 mt-2">Loading Directory...</span>
          </div>
        ) : directoryPatients.length === 0 ? (
          <div className="py-12 text-center text-navy-70 text-xs">
            No patients found matching your search criteria. Try adjusting your filters.
          </div>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-navy-10 text-[10px] font-heading font-bold text-navy uppercase tracking-wider bg-bg-ivory/50">
                <th className="py-4 px-6">Patient Details</th>
                <th className="py-4 px-6">Contact Info</th>
                <th className="py-4 px-6">Active Status</th>
                <th className="py-4 px-6">Assigned Protocol</th>
              </tr>
            </thead>
            <tbody className="font-body">
              {directoryPatients.map((pt) => (
                <tr 
                  key={pt.patient_id} 
                  onClick={() => handleOpenPatientChart(pt.patient_id)}
                  className="border-b border-navy-10 hover:bg-bg-ivory/50 transition-all duration-150 cursor-pointer hover:translate-x-1"
                >
                  <td className="py-4.5 px-6">
                    <div className="font-bold text-navy hover:text-lavender transition-colors">{maskLastName(pt.name)}</div>
                    <div className="text-[10px] text-navy-70 font-data mt-0.5 font-semibold">
                      Registered: {pt.created_at ? new Date(pt.created_at).toLocaleDateString() : 'N/A'}
                    </div>
                  </td>
                  <td className="py-4.5 px-6 text-xs font-data font-medium">
                    <div className="text-navy">{pt.phone}</div>
                    <div className="text-navy-70">{pt.email}</div>
                  </td>
                  <td className="py-4.5 px-6">
                    <span className={`text-[9px] font-data font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block border ${
                      pt.status === 'Stimulation' ? 'bg-lavender-soft text-lavender border-lavender/25' : pt.status === 'Recovery Active' ? 'bg-due-soft text-due border-due/25' : 'bg-navy-10 text-navy-75 border-navy-10'
                    }`}>
                      {pt.status}
                    </span>
                  </td>
                  <td className="py-4.5 px-6 text-xs text-navy font-semibold">
                    {pt.cycle_type}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls Footer */}
      {!loadingDirectory && directoryPatients.length > 0 && (
        <div className="mt-8 pt-4 border-t border-navy-10 flex justify-between items-center text-xs">
          <div className="font-data font-bold text-navy-70">
            Showing {Math.min((directoryPage - 1) * directoryLimit + 1, directoryTotal)} - {Math.min(directoryPage * directoryLimit, directoryTotal)} of {directoryTotal} patients
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => setDirectoryPage(p => Math.max(p - 1, 1))}
              disabled={directoryPage === 1}
              className="px-5 py-3 border border-navy-10 rounded-xl font-heading font-bold text-navy hover:bg-bg-ivory hover:border-lavender/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px] min-w-[90px] active:scale-[0.96]"
            >
              Previous
            </button>
            <button
              onClick={() => setDirectoryPage(p => p + 1)}
              disabled={directoryPage * directoryLimit >= directoryTotal}
              className="px-5 py-3 border border-navy-10 rounded-xl font-heading font-bold text-navy hover:bg-bg-ivory hover:border-lavender/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px] min-w-[90px] active:scale-[0.96]"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
