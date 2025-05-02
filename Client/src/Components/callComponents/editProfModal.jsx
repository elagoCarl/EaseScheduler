import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, Save } from 'lucide-react';
import axios from '../../axiosConfig';

const EditProfModal = ({ professor, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: professor.Name || '',
    email: professor.Email || '',
    ProfStatusId: professor.ProfStatus?.id || '',
  });
  const [statuses, setStatuses] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when professor prop changes
  useEffect(() => {
    setFormData({
      name: professor.Name || '',
      email: professor.Email || '',
      // Use Status as fallback if StatusId is undefined
      ProfStatusId: professor.ProfStatus?.id || professor.Status || '',
    });
  }, [professor]);

  // Fetch statuses from the backend
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const response = await axios.get('/profStatus/getAllStatus', {
          withCredentials: true
        });
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
        setErrorMessage(error.response?.data?.message || 'Failed to load teaching statuses.');
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
      setErrorMessage('Please fill out all required fields.');
      return;
    }

    try {
      setErrorMessage('');
      setIsSubmitting(true);

      const response = await axios.put(
        `/prof/updateProf/${professor.id}`,
        formData,
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );

      // Update the UI with the new professor data and pass success message
      if (onUpdate) {
        onUpdate(response.data, 'Professor updated successfully!');
      }

      // Close the modal after submission
      onClose();

    } catch (error) {
      console.error("Error updating professor:", error);
      setErrorMessage(error.response?.data?.message || 'An error occurred while updating professor.');
      setIsSubmitting(false);
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
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start space-x-2">
              <div className="flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm">{errorMessage}</p>
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
              disabled={isSubmitting}
              className={`px-4 py-2.5 bg-blue-600 text-white font-medium rounded shadow-md hover:bg-blue-700 transition duration-200 flex items-center space-x-2 ${isSubmitting ? "opacity-75 cursor-not-allowed" : ""
                }`}
            >
              {isSubmitting ? (
                <>Updating...</>
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
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    Name: PropTypes.string.isRequired,
    Email: PropTypes.string.isRequired,
    ProfStatus: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      Status: PropTypes.string
    }),
    Status: PropTypes.string, // Fallback if ProfStatus object is not available
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export default EditProfModal;