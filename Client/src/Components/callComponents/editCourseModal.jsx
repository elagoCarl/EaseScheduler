import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "axios";

const EditCourseModal = ({ course, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    type: "",
  });
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (course) {
      setFormData({
        code: course.Code || "",
        description: course.Description || "",
        type: course.Type || "",
      });
    }
  }, [course]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!formData.code || !formData.description || !formData.type) {
    setError("Please fill out all fields.");
    return;
  }

  console.log("Submitting update for course:", course); // Debugging course object
  console.log("Course ID being sent:", course?.id); // Check if ID exists

  try {
    setSuccessMessage("Updating course... Please wait.");
    setError("");
    setIsLoading(true);

    const response = await axios.put(
  "http://localhost:8080/course/updateCourse",
  {
    id: course.id, // 🔍 Ensure ID is sent properly
    ...formData,   // Spread formData so its properties are included directly
  },
  {
    headers: { "Content-Type": "application/json" },
  }
);

    console.log("Update successful:", response.data);
    onUpdate(response.data);
    setSuccessMessage("Course updated successfully! Reloading page...");

    setTimeout(() => window.location.reload(), 1000);
  } catch (error) {
    console.error("Error updating course:", error.response?.data || error.message);
    setError(error.response?.data?.message || "An error occurred");
  } finally {
    setIsLoading(false);
    onClose(); // Ensures modal closes
  }
};


  const handleOutsideClick = (e) => {
    if (e.target === e.currentTarget) {
      console.log("Clicked outside, closing modal...");
      onClose();
    }
  };

  if (!course) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleOutsideClick}
    >
      <div
        className="bg-customBlue1 p-6 rounded shadow-lg w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center text-white mb-4">
          <h2 className="text-xl font-semibold mx-auto">Edit Course</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-2 px-4">
            <label className="block text-md font-medium mb-1 text-white" htmlFor="code">
              Code
            </label>
            <input
              name="code"
              value={formData.code}
              onChange={handleChange}
              className="w-full bg-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-2 px-4">
            <label className="block text-md font-medium mb-1 text-white" htmlFor="description">
              Description
            </label>
            <input
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full bg-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-8 px-4">
            <label className="block text-md font-medium mb-1 text-white" htmlFor="type">
              Type
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Core">Core</option>
              <option value="Professional">Professional</option>
            </select>
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          {successMessage && <p className="text-green-500 text-sm mb-4">{successMessage}</p>}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              className="px-6 py-2 bg-blue-500 hover:bg-blue-700 duration-300 rounded-md text-sm font-semibold text-white"
              onClick={() => {
                console.log("Cancel button clicked");
                onClose();
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-gray-500 hover:bg-gray-700 duration-300 text-white rounded-md text-sm font-semibold"
            >
              {isLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

EditCourseModal.propTypes = {
  course: PropTypes.shape({
    Code: PropTypes.string.isRequired,
    Description: PropTypes.string.isRequired,
    Type: PropTypes.string.isRequired,
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  }),
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export default EditCourseModal;
