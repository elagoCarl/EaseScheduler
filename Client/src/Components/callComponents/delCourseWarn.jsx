import React from "react";
import Axios from "axios";

const delCourseWarn = ({ isOpen, onClose, onConfirm, courseId }) => {
  if (!isOpen) return null;

  const handleDelete = async () => {
    try {
      const response = await Axios.delete(`http://localhost:8080/course/${courseId}`);

      if (response.status === 200) {
        alert("Course deleted successfully!");
        onConfirm(); // Notify parent to refresh the course list
        onClose(); // Close the modal
      } else {
        alert("Failed to delete course. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting course:", error);
      alert("An error occurred while deleting the course.");
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-11/12 md:w-1/3">
        <h2 className="text-xl font-bold text-gray-800 text-center mb-4">
          Are you sure you want to delete?
        </h2>
        <p className="text-gray-600 text-center mb-6">
          This action cannot be undone.
        </p>

        <div className="flex justify-center gap-4">
          <button
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 focus:outline-none"
            onClick={handleDelete}
          >
            Yes, Delete
          </button>
          <button
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 focus:outline-none"
            onClick={onClose}
          >
            No, Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default delCourseWarn;
