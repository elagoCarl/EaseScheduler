import React from "react";

const EditCourseModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null; // Prevent rendering if the modal is not open

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-customBlue1 p-8 rounded-lg w-11/12 md:w-1/3">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl text-white font-semibold mx-auto">Edit Course</h2>
          <button
            className="text-xl text-white hover:text-black"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <form className="space-y-10 px-20">
          <label className="block font-semibold text-white">Course Code</label>
          <input
            type="text"
            placeholder="Course Code"
            className="w-full p-8 border rounded bg-customWhite"
            required
          />

          <label className="block font-semibold text-white">Course Description</label>
          <input
            type="text"
            placeholder="Course Description"
            className="w-full p-8 border rounded bg-customWhite"
            required
          />

          <label className="block font-semibold text-white">Course Duration</label>
          <input
            type="number"
            placeholder="Course Duration"
            className="w-full p-8 border rounded bg-customWhite"
            required
          />

          <label className="block font-semibold text-white">No. of Units</label>
          <input
            type="number"
            placeholder="No. of Units"
            className="w-full p-8 border rounded bg-customWhite"
            required
          />

          <label className="block font-semibold text-white">Course Type</label>
          <select className="w-full p-8 border rounded bg-customWhite" required>
            <option disabled>Select Course Type</option>
            <option>Lecture</option>
            <option>Lab</option>
          </select>

          <div className="flex justify-center mt-4 gap-4">
            <button
              type="submit"
              className="bg-blue-500 text-white px-6 py-2 rounded-lg"
            >
              Save
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

export default EditCourseModal;
