import React, { useState } from "react";
import Axios from "axios";

const DelCourseWarn = ({ isOpen, onClose, onConfirm, coursesToDelete }) => {
   console.log("Received coursesToDelete:", coursesToDelete); // ✅ Ensure coursesToDelete is populated
  const [successMessage, setSuccessMessage] = useState("");

  if (!isOpen) return null;

  const confirmDelete = async () => {
    if (!coursesToDelete || coursesToDelete.length === 0) {
      setSuccessMessage("No course selected for deletion.");
      return;
    }

    try {
      await Promise.all(
        coursesToDelete.map((course) =>
          Axios.delete(`http://localhost:8080/course/deleteCourse/${course.id}`)
        )
      );

      setSuccessMessage("Selected courses deleted successfully!");
      onConfirm(coursesToDelete);

      // Optional: Close the modal after a delay
      setTimeout(() => {
        setSuccessMessage("");
        onClose();
      }, 3000);
    } catch (error) {
      console.error("Error deleting courses:", error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-8/12 md:w-1/3">
        <h2 className="text-xl font-bold text-gray-800 text-center mb-4">
          {coursesToDelete?.length > 0
            ? `Are you sure you want to delete ${coursesToDelete.length} course(s)?`
            : "No course selected."}
        </h2>

        {/* Display success message */}
        {successMessage && (
          <p className="text-green-600 text-center font-semibold mb-4">
            {successMessage}
          </p>
        )}

        <div className="flex justify-center gap-4">
          <button
            className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-800 duration-300"
            onClick={confirmDelete}
            disabled={!coursesToDelete || coursesToDelete.length === 0}
          >
            Yes, Delete
          </button>
          <button
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-700 duration-300"
            onClick={() => {
              setSuccessMessage("");
              onClose();
            }}
          >
            No, Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DelCourseWarn;