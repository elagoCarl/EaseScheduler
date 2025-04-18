import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from '../../axiosConfig';

const EditProfModal = ({ professor, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: professor.Name,
    email: professor.Email,
    ProfStatusId: professor.StatusId,
  });
  const [statuses, setStatuses] = useState([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form data when professor prop changes
  useEffect(() => {
    setFormData({
      name: professor.Name,
      email: professor.Email,
      ProfStatusId: professor.StatusId,
    });
  }, [professor]);

  // Fetch statuses from the backend
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const response = await axios.get('/profStatus/getAllProfStatus');
        console.log("Fetched data:", response.data);
        setStatuses(response.data.data);
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
    console.log("formData:", formData);
    console.log("statuses:", statuses);

    if (!formData.name || !formData.email || !formData.ProfStatusId) {
      setError('Please fill out all fields.');
      return;
    }

    try {
      setSuccessMessage('Updating professor... Please wait.');
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
      setError(error.response?.data?.message || 'An error occurred');
      setSuccessMessage('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-customBlue1 p-8 rounded-lg w-11/12 md:w-1/3">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl text-white font-semibold mx-auto">Edit Professor</h2>
          <button
            className="text-xl text-white hover:text-black"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <form className="space-y-10 px-20" onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block font-semibold text-white" htmlFor="name">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-8 border rounded bg-customWhite"
            />
          </div>
          <div className="mb-4">
            <label className="block font-semibold text-white" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-8 border rounded bg-customWhite"
            />
          </div>
          <div className="mb-4">
            <label className="block font-semibold text-white" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              name="ProfStatusId"
              value={formData.ProfStatusId}
              onChange={handleChange}
              className="w-full p-8 border rounded bg-customWhite"
            >
              <option value="">Select a status</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.Status}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          {successMessage && <p className="text-green-500 text-sm mb-4">{successMessage}</p>}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg"
            >
              {isLoading ? 'Saving...' : 'Save'}
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
    StatusId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export default EditProfModal;