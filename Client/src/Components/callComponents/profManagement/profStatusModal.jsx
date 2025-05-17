import { useState, useEffect } from 'react';
import { Plus, X, Edit, Trash2, ChevronRight } from 'lucide-react';
import axios from '../../../axiosConfig.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ProfStatusModal = ({ isOpen, onClose, onStatusesUpdated }) => {
  const [profStatusList, setProfStatusList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    Status: '',
    Max_units: 0
  });
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState(null);
  const [error, setError] = useState({});
  const [allProfessors, setAllProfessors] = useState([]);
  const [showForm, setShowForm] = useState(false);

  // Fetch all professor statuses
  const fetchProfStatuses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/profStatus/getAllStatus');
      if (response.data && response.data.successful) {
        setProfStatusList(response.data.data || []);
      } else {
        console.error('Error fetching professor statuses:', response.data?.message || 'Unknown error');
        toast.error('Failed to load professor statuses');
      }
    } catch (err) {
      console.error('Failed to fetch professor statuses:', err);
      toast.error('Failed to load professor statuses: ' + (err.response?.data?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProfessors = async () => {
    try {
      const response = await axios.get("/prof/getAllProf");
      if (response.data.successful) {
        setAllProfessors(response.data.data || []);
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error("Failed to fetch professors:", error);
      return [];
    }
  };

  // Fetch a single professor status by ID
  const fetchSingleProfStatus = async (id) => {
    try {
      setLoading(true);
      const response = await axios.get(`/profStatus/getProfStatus/${id}`);
      if (response.data && response.data.successful) {
        return response.data.data;
      } else {
        console.error('Error fetching professor status:', response.data?.message || 'Unknown error');
        toast.error('Failed to load professor status details');
        return null;
      }
    } catch (err) {
      console.error('Failed to fetch professor status:', err);
      toast.error('Failed to load professor status details: ' + (err.response?.data?.message || 'Unknown error'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProfStatuses();
      fetchAllProfessors();
    }
  }, [isOpen]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'Max_units' ? parseInt(value) || 0 : value
    });

    if (name === 'Status' && value.trim()) {
      const duplicateExists = profStatusList.some(status =>
        status.Status.toLowerCase() === value.toLowerCase() &&
        status.id !== currentId
      );

      if (duplicateExists) {
        setError(prev => ({
          ...prev,
          Status: 'This status already exists'
        }));
      } else {
        if (error.Status === 'This status already exists') {
          setError(prev => ({
            ...prev,
            Status: undefined
          }));
        }
      }
    }
  };

  // Validate form data
  const validateForm = () => {
    const errors = {};
    if (!formData.Status.trim()) {
      errors.Status = 'Status is required';
    } else {
      // Check for duplicates, but ignore the current status being edited
      const duplicateExists = profStatusList.some(status =>
        status.Status.toLowerCase() === formData.Status.toLowerCase() &&
        status.id !== currentId
      );

      if (duplicateExists) {
        errors.Status = 'This status already exists';
      }
    }

    if (formData.Max_units <= 0) {
      errors.Max_units = 'Maximum units must be greater than 0';
    }

    setError(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      if (isEditing) {
        const response = await axios.put(`/profStatus/updateProfStatus/${currentId}`, formData);
        if (response.data && response.data.successful) {
          toast.success('Professor status updated successfully');
        } else {
          toast.error(response.data?.message || 'Failed to update status');
        }
      } else {
        const response = await axios.post('/profStatus/addProfStatus', formData);
        if (response.data && response.data.successful) {
          toast.success('Professor status added successfully');
        } else {
          toast.error(response.data?.message || 'Failed to add status');
        }
      }

      resetForm();
      fetchProfStatuses();
      if (onStatusesUpdated) onStatusesUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
      console.error(err);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({ Status: '', Max_units: 0 });
    setIsEditing(false);
    setCurrentId(null);
    setError({});
    setShowForm(false);
  };

  // Edit professor status
  const handleEdit = async (status) => {
    setIsEditing(true);
    setCurrentId(status.id);
    setShowForm(true);

    try {
      const detailedStatus = await fetchSingleProfStatus(status.id);
      if (detailedStatus) {
        setFormData({
          Status: detailedStatus.Status,
          Max_units: detailedStatus.Max_units
        });
      } else {
        setFormData({
          Status: status.Status,
          Max_units: status.Max_units
        });
      }
    } catch (err) {
      setFormData({
        Status: status.Status,
        Max_units: status.Max_units
      });
    }
  };

  const confirmDelete = (id) => {
    setStatusToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!statusToDelete) return;

    try {
      const response = await axios.delete(`/profStatus/deleteProfStatus/${statusToDelete}`);
      if (response.data && response.data.successful) {
        toast.success('Professor status deleted successfully');
        fetchProfStatuses();
        if (onStatusesUpdated) onStatusesUpdated();
      } else {
        toast.error(response.data?.message || 'Failed to delete status');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete professor status');
      console.error(err);
    } finally {
      setShowDeleteModal(false);
      setStatusToDelete(null);
    }
  };

  const countProfessors = (status) => {
    // If allProfessors is not yet loaded, return 0
    if (!allProfessors || !Array.isArray(allProfessors)) return 0;
    return allProfessors.filter(prof => prof.Status === status.Status).length;
  };

  const getStatusColor = (status) => {
    switch (status) {
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 p-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Professor Status Management</h2>
            <button
              onClick={onClose}
              className="p-1.5 bg-blue-500 hover:bg-blue-700 rounded-md text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-grow p-6">
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-700">
              Manage professor status types and their maximum teaching units
            </p>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
                setIsEditing(false);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition duration-200 flex items-center gap-2 shadow-md"
            >
              <Plus size={16} />
              Add Status
            </button>
          </div>

          {/* Form Section - Show when adding new or editing */}
          {showForm && (
            <div className="mb-8 bg-blue-50 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {isEditing ? 'Edit Professor Status' : 'Add New Professor Status'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Status Name
                    </label>
                    <input
                      type="text"
                      name="Status"
                      value={formData.Status}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${error.Status ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                      placeholder="e.g., Full-time, Part-time"
                    />
                    {error.Status && (
                      <div className="mt-1">
                        <p className="text-red-500 text-xs">{error.Status}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Maximum Units
                    </label>
                    <input
                      type="number"
                      name="Max_units"
                      value={formData.Max_units}
                      onChange={handleChange}
                      min="1"
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${error.Max_units ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    />
                    {error.Max_units && (
                      <p className="text-red-500 text-xs mt-1">{error.Max_units}</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
                  >
                    {isEditing ? 'Update' : 'Add'} Status
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Status List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
              <span className="ml-3 text-blue-600 font-medium">Loading...</span>
            </div>
          ) : !Array.isArray(profStatusList) || profStatusList.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500">No professor statuses found. Add one to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Maximum Units
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Professors
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {profStatusList.map((status) => (
                    <tr key={status.id} className="hover:bg-gray-50 transition duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <ChevronRight size={16} className="text-blue-500 mr-2" />
                          <div className="text-sm font-medium text-gray-900">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${getStatusColor(status.Status)}`}>
                              {status.Status}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{status.Max_units}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-md">
                            {countProfessors(status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleEdit(status)}
                            className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition duration-150"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => confirmDelete(status.id)}
                            className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded transition duration-150"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Deletion
            </h3>
            <p className="mb-6 text-gray-700">
              Are you sure you want to delete this status? This will also affect all professors with this status.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfStatusModal;