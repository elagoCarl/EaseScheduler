import { useState, useEffect } from 'react';
import axios from '../../axiosConfig.js';
import PropTypes from 'prop-types';

const AssignationsWithNullYearModal = ({ isOpen, onClose, assignationIds, deptId, onSelectSections }) => {
  const [assignations, setAssignations] = useState([]);
  const [sectionsPerAssignation, setSectionsPerAssignation] = useState({});
  const [selectedSectionsPerAssignation, setSelectedSectionsPerAssignation] = useState({});
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      fetchAssignations();
    }
  }, [isOpen, deptId, assignationIds]);

  const fetchAssignations = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/assignation/getAllAssignationsByDeptInclude/${deptId}`);
      if (response.data.successful) {
        // Filter assignations by the passed assignation IDs
        const filteredAssignations = response.data.data.filter(assignation => 
          assignationIds.includes(assignation.id)
        );
        setAssignations(filteredAssignations);
        
        // Initialize sections for each assignation
        const sectionsInit = {};
        const selectedInit = {};
        
        // Fetch sections for each assignation
        await Promise.all(filteredAssignations.map(async (assignation) => {
          if (assignation.CourseId) {
            try {
              const sectionsResponse = await axios.post('/progYrSec/getProgYrSecByCourse', { 
                CourseId: assignation.CourseId, 
                DepartmentId: deptId 
              });
              
              if (sectionsResponse.data.successful) {
                sectionsInit[assignation.id] = sectionsResponse.data.data;
                selectedInit[assignation.id] = [];
              }
            } catch (error) {
              console.error(`Error fetching sections for course ${assignation.CourseId}:`, error);
              sectionsInit[assignation.id] = [];
              selectedInit[assignation.id] = [];
            }
          }
        }));
        
        setSectionsPerAssignation(sectionsInit);
        setSelectedSectionsPerAssignation(selectedInit);
      } else {
        setAssignations([]);
      }
    } catch (error) {
      console.error("Error fetching assignations:", error);
      setAssignations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSectionChange = (assignationId, sectionId, checked) => {
    setSelectedSectionsPerAssignation(prev => {
      const updatedSelections = { ...prev };
      if (checked) {
        updatedSelections[assignationId] = [...(updatedSelections[assignationId] || []), sectionId];
      } else {
        updatedSelections[assignationId] = (updatedSelections[assignationId] || []).filter(id => id !== sectionId);
      }
      return updatedSelections;
    });
  };

  const handleSelectAll = (assignationId) => {
    setSelectedSectionsPerAssignation(prev => {
      const updatedSelections = { ...prev };
      updatedSelections[assignationId] = sectionsPerAssignation[assignationId].map(s => s.id);
      return updatedSelections;
    });
  };

  const handleClearAll = (assignationId) => {
    setSelectedSectionsPerAssignation(prev => {
      const updatedSelections = { ...prev };
      updatedSelections[assignationId] = [];
      return updatedSelections;
    });
  };

  // Check if all assignations with available sections have at least one section selected
  const isFormValid = () => {
    return assignations.every(assignation => {
      const availableSections = sectionsPerAssignation[assignation.id] || [];
      // If there are no sections available, we can't require selection
      if (availableSections.length === 0) return true;
      
      // Otherwise, check if at least one section is selected
      const selectedSections = selectedSectionsPerAssignation[assignation.id] || [];
      return selectedSections.length > 0;
    });
  };

  const getMissingSelectionsList = () => {
    return assignations
      .filter(assignation => {
        const availableSections = sectionsPerAssignation[assignation.id] || [];
        const selectedSections = selectedSectionsPerAssignation[assignation.id] || [];
        return availableSections.length > 0 && selectedSections.length === 0;
      })
      .map(assignation => assignation.Course?.Code || `Course ID: ${assignation.CourseId}`);
  };

  const handleSubmit = () => {
    if (!isFormValid()) {
      const missingCourses = getMissingSelectionsList();
      alert(`Please select at least one section for each course.\nMissing selections for: ${missingCourses.join(', ')}`);
      return;
    }
    
    // Create an array of assignments with their selected sections
    const selections = Object.entries(selectedSectionsPerAssignation)
      .filter(([_, sections]) => sections.length > 0)
      .map(([assignationId, sectionIds]) => ({
        assignationId: parseInt(assignationId, 10),
        sectionIds
      }));
    
    // Call the parent component's handler for each selection
    selections.forEach(selection => {
      onSelectSections(selection.assignationId, selection.sectionIds);
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 border-rounded-md">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 flex flex-col h-5/6">
        {/* Sticky Header */}
        <div className="p-4 border-b sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Select Sections for Courses Without Year</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              X
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {assignations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No assignations found</div>
              ) : (
                assignations.map(assignation => {
                  const availableSections = sectionsPerAssignation[assignation.id] || [];
                  const selectedSections = selectedSectionsPerAssignation[assignation.id] || [];
                  const hasValidSelection = availableSections.length === 0 || selectedSections.length > 0;
                  
                  return (
                    <div key={assignation.id} className={`border rounded-lg overflow-hidden ${!hasValidSelection ? 'border-red-500' : ''}`}>
                      <div className={`${!hasValidSelection ? 'bg-red-50' : 'bg-gray-100'} p-3 border-b flex justify-between items-center`}>
                        <div>
                          <h3 className="font-medium text-gray-700">
                            {assignation.Course?.Code} - {assignation.Course?.Description}
                          </h3>
                          <div className="text-sm text-gray-600">
                            Professor: {assignation.Professor?.Name} | 
                            School Year: {assignation.School_Year}, Semester: {assignation.Semester}
                          </div>
                        </div>
                        {!hasValidSelection && (
                          <span className="text-red-600 text-sm font-medium">
                            Required: Select at least one section
                          </span>
                        )}
                      </div>
                      
                      <div className="p-4">
                        {availableSections.length > 0 ? (
                          <>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-3">
                              {availableSections.map(section => (
                                <div key={section.id} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    id={`section-${assignation.id}-${section.id}`}
                                    value={section.id}
                                    checked={selectedSections.includes(section.id)}
                                    onChange={(e) => handleSectionChange(assignation.id, section.id, e.target.checked)}
                                    className="w-auto h-auto text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <label 
                                    htmlFor={`section-${assignation.id}-${section.id}`} 
                                    className="ml-2 text-sm text-gray-700 cursor-pointer truncate"
                                  >
                                    {section.Program?.Code} {section.Year}-{section.Section}
                                  </label>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-end space-x-2">
                              <button
                                type="button"
                                onClick={() => handleSelectAll(assignation.id)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Select All
                              </button>
                              <button
                                type="button"
                                onClick={() => handleClearAll(assignation.id)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Clear All
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center text-gray-500">No sections available for this course</div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="p-4 border-t sticky bg-white z-10">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isFormValid()}
              className={`px-4 py-2 rounded-lg transition-colors ${
                !isFormValid()
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Confirm Selections
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

AssignationsWithNullYearModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  assignationIds: PropTypes.array.isRequired,
  deptId: PropTypes.number.isRequired,
  onSelectSections: PropTypes.func.isRequired
};

export default AssignationsWithNullYearModal;