import React, { useState } from 'react';

const ScheduleReportModal = ({ isOpen, onClose, scheduleData }) => {
  const [activeTab, setActiveTab] = useState('success');
  
  if (!isOpen || !scheduleData) return null;

  const {
    successful,
    message,
    totalSchedules,
    newSchedules,
    scheduleReport,
    failedAssignations
  } = scheduleData;

  // Map day number to day name
  const getDayName = (dayNum) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum] || `Day ${dayNum}`;
  };

  // Get sections formatted
  const formatSections = (sections) => {
    if (!sections || sections.length === 0 || sections[0] === "No Section") {
      return "No Section";
    }
    return sections.map(sec => {
      const match = sec.match(/ProgId=(\d+), Year=(\d+), Sec=([A-Z])/);
      if (match) {
        return `Year ${match[2]}-${match[3]}`;
      }
      return sec;
    }).join(", ");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-4/5 max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Schedule Report</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Summary */}
        <div className="p-4 bg-gray-50">
          <div className={`text-lg font-medium ${successful ? 'text-green-600' : 'text-red-600'}`}>
            {successful ? 'Schedule automation completed successfully!' : 'Schedule automation completed with issues'}
          </div>
          <div className="text-sm text-gray-600 mt-1">{message}</div>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className="bg-white p-3 rounded border border-gray-200">
              <p className="text-sm text-gray-500">Total Scheduled</p>
              <p className="font-medium">{totalSchedules} of {totalSchedules + failedAssignations.length}</p>
            </div>
            <div className="bg-white p-3 rounded border border-gray-200">
              <p className="text-sm text-gray-500">New Schedules</p>
              <p className="font-medium">{newSchedules}</p>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button 
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'success' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('success')}
            >
              Successful ({scheduleReport.length})
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'failed' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('failed')}
            >
              Failed ({failedAssignations.length})
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="overflow-auto flex-1 p-4">
          {activeTab === 'success' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Professor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scheduleReport.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.Professor}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.Course}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatSections(item.Sections)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getDayName(item.Day)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.Start_time} - {item.End_time}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.Room}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {activeTab === 'failed' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Professor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {failedAssignations.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.Course}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.Professor}</td>
                      <td className="px-6 py-4 text-sm text-red-600">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleReportModal;