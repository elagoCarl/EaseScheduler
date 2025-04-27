import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { X, Check, AlertCircle } from "lucide-react";
import axios from "../../axiosConfig";

const AddProfModal = ({ isOpen, onClose, onProfessorAdded }) => {
  const [formData, setFormData] = useState({
    Name: "",
    Email: "",
    Status: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [statuses, setStatuses] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch statuses from the backend when the modal is opened
  useEffect(() => {
    if (isOpen) {
      const fetchStatuses = async () => {
        try {
          const response = await axios.get("/profStatus/getAllStatus", {
            withCredentials: true
          });
          setStatuses(response.data.data); // Assuming 'data' contains the status records
        } catch (error) {
          setErrorMessage(error.response?.data?.message || "An error occurred while fetching statuses.");
        }
      };

      fetchStatuses();

      // Reset form when modal opens
      setFormData({
        Name: "",
        Email: "",
        Status: "",
      });
      setErrorMessage("");
      setSuccessMessage("");
    }
  }, [isOpen]); // Re-run when `isOpen` changes

  if (!isOpen) return null; // Prevent rendering if the modal is not open

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const response = await axios.post(
        "/prof/addProf",
        formData,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      setSuccessMessage("Professor added successfully!");

      // Notify parent component that a professor was added
      if (onProfessorAdded) {
        onProfessorAdded(response.data.data); // Pass the newly added professor data
      }

      setTimeout(() => {
        onClose(); // Close the modal after a short delay
      }, 1000); // Wait 1 second before closing the modal
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Failed to add professor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex justify-center items-center z-50 backdrop-filter backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-md overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl text-white font-semibold">Add Professor</h2>
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
            <label className="block text-sm font-medium text-gray-700">Professor Name</label>
            <input
              type="text"
              name="Name"
              placeholder="Enter full name"
              className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              value={formData.Name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              name="Email"
              placeholder="email@example.com"
              className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              value={formData.Email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Total Units</label>
            <input
              type="number"
              placeholder="0"
              className="w-full p-2.5 border border-gray-300 rounded bg-gray-50 cursor-not-allowed"
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">Units will be assigned based on courses</p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Teaching Status</label>
            <select
              name="Status"
              className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              value={formData.Status}
              onChange={handleInputChange}
              required
            >
              <option value="" disabled>
                Select Teaching Status
              </option>
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
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm">{errorMessage}</p>
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
              disabled={isSubmitting}
              className={`px-4 py-2.5 bg-blue-600 text-white font-medium rounded shadow-md hover:bg-blue-700 transition duration-200 flex items-center space-x-2 ${isSubmitting ? "opacity-75 cursor-not-allowed" : ""
                }`}
            >
              {isSubmitting ? "Adding..." : "Add Professor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

AddProfModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onProfessorAdded: PropTypes.func,
};

export default AddProfModal;