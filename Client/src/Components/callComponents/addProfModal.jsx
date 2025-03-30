import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "axios";

const AddProfModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    Name: "",
    Email: "",
    Status: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [statuses, setStatuses] = useState([]);

  // Fetch statuses from the backend when the modal is opened
  useEffect(() => {
    if (isOpen) {
      const fetchStatuses = async () => {
        try {
          const response = await axios.get("http://localhost:8080/profStatus/getAllProfStatus", {
            withCredentials: true
          });
          setStatuses(response.data.data); // Assuming 'data' contains the status records
        } catch (error) {
          setErrorMessage(error.response?.data?.message || "An error occurred while fetching statuses.");
        }
      };

      fetchStatuses();
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
    console.log("formData:", formData);
    console.log("statuses:", statuses);

    try {
      const response = await axios.post(
        "http://localhost:8080/prof/addProf",
        formData,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      setSuccessMessage("Professor added successfully! Reloading page...");
      setTimeout(() => {
        onClose(); // Close the modal after a short delay
        window.location.reload(); // Reload the page to reflect the changes
      }, 1000); // Wait 1 second before closing the modal and reloading the page
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Failed to add professor.");
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-customBlue1 p-8 rounded-lg w-11/12 md:w-1/3">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl text-white font-semibold mx-auto">Add Professor</h2>
          <button
            className="text-xl text-white hover:text-black"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <form className="space-y-10 px-20" onSubmit={handleSubmit}>
          <label className="block font-semibold text-white">Name</label>
          <input
            type="text"
            name="Name"
            placeholder="Name"
            className="w-full p-8 border rounded bg-customWhite"
            value={formData.Name}
            onChange={handleInputChange}
            required
          />

          <label className="block font-semibold text-white">Email</label>
          <input
            type="text"
            name="Email"
            placeholder="Email"
            className="w-full p-8 border rounded bg-customWhite"
            value={formData.Email}
            onChange={handleInputChange}
            required
          />

          <label className="block font-semibold text-white">Total Units</label>
          <input
            type="number"
            placeholder="0"
            className="w-full p-8 border rounded bg-customWhite"
            disabled
          />

          <label className="block font-semibold text-white">Teaching Status</label>
          <select
            name="Status"
            className="w-full p-8 border rounded bg-customWhite"
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

          {errorMessage && (
            <p className="text-red-500 text-center">{errorMessage}</p>
          )}

          {successMessage && (
            <p className="text-green-500 text-center">{successMessage}</p>
          )}

          <div className="flex justify-center mt-4 gap-4">
            <button
              type="submit"
              className="bg-blue-500 text-white px-6 py-2 rounded-lg"
            >
              Add
            </button>
            <button
              type="button"
              className="bg-gray-500 text-white px-6 py-2 rounded-lg"
              onClick={onClose}
            >
              Cancel
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
};

export default AddProfModal;