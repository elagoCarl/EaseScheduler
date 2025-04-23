import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from '../axiosConfig';
import { FaEdit, FaTrash } from 'react-icons/fa';
import TopMenu from '../Components/callComponents/topMenu';
import Sidebar from '../Components//callComponents/sideBar';
import Image3 from '../Components/Img/3.jpg';

const ProfStatus = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [profStatusList, setProfStatusList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    Status: '',
    Max_units: 0
  });
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState({});

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [statusToDelete, setStatusToDelete] = useState(null);

    const confirmDelete = (id) => {
    setStatusToDelete(id);
    setShowDeleteModal(true);
  };

  
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
    fetchProfStatuses();
  }, []);

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
          status.id !== currentId // Skip the current status being edited
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
    setShowModal(false);
    setError({});
  };

  // Edit professor status
  const handleEdit = async (status) => {
    setIsEditing(true);
    setCurrentId(status.id);

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
    
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!statusToDelete) return;
    
    try {
      const response = await axios.delete(`/profStatus/deleteProfStatus/${statusToDelete}`);
      if (response.data && response.data.successful) {
        toast.success('Professor status deleted successfully');
        fetchProfStatuses();
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
    if (!status || !status.Professors) return 0;
    return Array.isArray(status.Professors) ? status.Professors.length : 0;
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8"
      style={{
        backgroundImage: `url(${Image3})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="fixed top-0 h-full z-50">
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      </div>
      <TopMenu toggleSidebar={toggleSidebar} />
      
      <div className="container mx-auto p-10 flex-1 max-w-8xl w-full">
        <div className="bg-gray-100 rounded-xl shadow-lg overflow-hidden mx-auto my-4">
          {/* Header */}
          <div className="bg-blue-600 p-8 sm:p-6">
          <div className="flex flex-row justify-between items-center gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate">Professor Status Management</h1>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-white text-blue-600 hover:bg-gray-300 duration-300 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium flex items-center text-sm sm:text-base whitespace-nowrap"
            >
              Add Status
            </button>
          </div>
        </div>
          
          {/* Status Table */}
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
                <span className="ml-3 text-blue-600 font-medium">Loading...</span>
              </div>
            ) : !Array.isArray(profStatusList) || profStatusList.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500">No professor statuses found. Add one to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                        Status
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                        Maximum Units
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                        Professors
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {profStatusList.map((status) => (
                      <tr key={status.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{status.Status}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{status.Max_units}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{countProfessors(status)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-5 ml-10">
                            <button
                              onClick={() => handleEdit(status)}
                              className="text-black hover:text-gray-700 duration-300"
                            >
                              <FaEdit className="h-16 w-16" />
                            </button>
                            <button
                                onClick={() => confirmDelete(status.id)}
                                className="text-red-600 hover:text-red-800"
                                >
                                <FaTrash className="h-16 w-16" />
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
        </div>
      </div>
      
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-10 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {isEditing ? 'Edit Professor Status' : 'Add New Professor Status'}
              </h3>
              <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-1">
                    Status Name
                    </label>
                    <input
                    type="text"
                    name="Status"
                    value={formData.Status}
                    onChange={handleChange}
                    className={`w-full px-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        error.Status ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Full-time, Part-time"
                    />
                    {error.Status && (
                    <div className={`mt-1 ${error.Status === 'This status already exists' ? 'bg-red-100 p-2 rounded-md' : ''}`}>
                        <p className="text-red-500 text-xs">{error.Status}</p>
                        {error.Status === 'This status already exists' && (
                        <p className="text-red-600 text-xs mt-1">Please use a different status name.</p>
                        )}
                    </div>
                    )}
                  </div>
                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-medium mb-1">
                    Maximum Units
                  </label>
                  <input
                    type="number"
                    name="Max_units"
                    value={formData.Max_units}
                    onChange={handleChange}
                    min="1"
                    className={`w-full px-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      error.Max_units ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {error.Max_units && (
                    <p className="text-red-500 text-xs mt-1">{error.Max_units}</p>
                  )}
                </div>
                <div className="flex justify-end space-x-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 duration-300 hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-900 duration-300"
                  >
                    {isEditing ? 'Update' : 'Add'} Status
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white p-3 rounded-lg shadow-xl max-w-md w-full">
                    <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Confirm Deletion
                    </h3>
                    <p className="mb-6 text-gray-700">
                        Are you sure you want to delete this status? This will also delete all professors with this status.
                    </p>
                    <div className="flex justify-end space-x-6">
                        <button
                        type="button"
                        onClick={() => setShowDeleteModal(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 duration-300 hover:bg-gray-100"
                        >
                        Cancel
                        </button>
                        <button
                        type="button"
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 duration-300"
                        >
                        Delete
                        </button>
                    </div>
                    </div>
                </div>
                </div>
            )}
                </div>
  );
};

export default ProfStatus;