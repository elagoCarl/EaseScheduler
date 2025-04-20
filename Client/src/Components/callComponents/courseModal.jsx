// CourseModal.jsx
import React, { useState } from 'react';

const CourseModal = ({ isOpen, onClose, onConfirm }) => {
  const [selectedCourses, setSelectedCourses] = useState([]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Configure Core Courses</h2>
        <p className="text-sm text-gray-600 mb-4">
          Select core courses to include in the automation:
        </p>

        <div className="max-h-60 overflow-y-auto mb-4">
          {/* Course selection would go here */}
          <div className="mb-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="mr-2"
                onChange={(e) => {
                  // Handle course selection logic
                }}
              />
            </label>
          </div>
          {/* More courses would be listed here */}
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedCourses)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseModal;