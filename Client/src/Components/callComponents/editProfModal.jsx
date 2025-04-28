import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, Check, AlertCircle, Save } from 'lucide-react';
import axios from '../../axiosConfig';

const EditProfModal = ({ professor, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: professor.Name || '',
    email: professor.Email || '',
    ProfStatusId: professor.ProfStatus.id || '',
  });
  const [statuses, setStatuses] = useState([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form data when professor prop changes
  useEffect(() => {
    setFormData({
      name: professor.Name || '',
      email: professor.Email || '',
      // Use Status as fallback if StatusId is undefined
      ProfStatusId: professor.ProfStatus.id || professor.Status || '',
    });
  }, [professor]);

  // Fetch statuses from the backend
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const response = await axios.get('/profStatus/getAllStatus');
        setStatuses(response.data.data);

        // If StatusId is missing but we have Status name, try to find the ID
        if (!formData.ProfStatusId && professor.Status && response.data.data) {
          const matchingStatus = response.data.data.find(
            status => status.Status === professor.Status
          );
          if (matchingStatus) {
            setFormData(prev => ({
              ...prev,
              ProfStatusId: matchingStatus.id
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching statuses:', error);
        setError('Failed to load teaching statuses.');
      }
    };

    fetchStatuses();
  }, []); // Only fetch once when component mounts

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.ProfStatusId) {
      setError('Please fill out all required fields.');
      return;
    }

    try {
      setSuccessMessage('');
      setError('');
      setIsLoading(true);

      const response = await axios.put(
        `/prof/updateProf/${professor.id}`,
        formData,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Update the UI with the new professor data
      if (onUpdate) {
        onUpdate(response.data);
      }

      setSuccessMessage('Professor updated successfully!');

      // Close the modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred while updating professor.');
      setSuccessMessage('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex justify-center items-center z-50 backdrop-filter backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-md overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl text-white font-semibold">Edit Professor</h2>
          <button
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors duration-200"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700" htmlFor="name">
              Professor Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700" htmlFor="email">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700" htmlFor="status">
              Teaching Status
            </label>
            <select
              id="status"
              name="ProfStatusId"
              value={formData.ProfStatusId}
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              required
            >
              <option value="">Select Teaching Status</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.Status}
                </option>
              ))}
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start space-x-2">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-start space-x-2">
              <Check size={18} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm">{successMessage}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              className="px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded hover:bg-gray-200 transition duration-200"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-4 py-2.5 bg-blue-600 text-white font-medium rounded shadow-md hover:bg-blue-700 transition duration-200 flex items-center space-x-2 ${isLoading ? "opacity-75 cursor-not-allowed" : ""
                }`}
            >
              {isLoading ? (
                <>Loading...</>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

EditProfModal.propTypes = {
  professor: PropTypes.shape({
    Name: PropTypes.string.isRequired,
    Email: PropTypes.string.isRequired,
    // Make StatusId optional with Status as an alternative
    StatusId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    Status: PropTypes.string,
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export default EditProfModal;