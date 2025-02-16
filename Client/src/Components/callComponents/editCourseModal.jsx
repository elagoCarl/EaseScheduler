import React, { useState, useEffect } from "react";
import Axios from "axios";

const EditCourseModal = ({ isOpen, onClose, course }) => {
  const [courseCode, setCourseCode] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseType, setCourseType] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [courseID, setCourseID] = useState(""); // ✅ Ensure this is the correct field name

  // ✅ Ensure modal updates when a new course is selected
  useEffect(() => {
    if (course) {
      setCourseCode(course.Code || "");
      setCourseDescription(course.Description || "");
      setCourseType(course.Type || "");
      setCourseID(course.id || ""); // ✅ Ensure this is the correct field name
    }
  }, [course]); // ✅ Runs when `course` changes

  if (!isOpen) return null;

  console.log("Updating Course:", course);

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!course || !course.id) {
    console.error("Course data is missing or has no Id.");
    return;
  }

  console.log("Updating course with ID:", course.id); // ✅ Correct logging

  try {
    const response = await Axios.put(
      `http://localhost:8080/course/updateCourse/${courseID}`, // ✅ Ensure backend matches this URL
      {
        Code: courseCode,
        Description: courseDescription,
        Type: courseType,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    if (response.status === 200) {
      setSuccessMessage("Course updated successfully!");
      setTimeout(onClose, 1500);
    } else {
      console.error("Failed to update course:", response.data);
    }
  } catch (error) {
    console.error("Unexpected error:", error.message);
  }
};



  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-customBlue1 p-8 rounded-lg w-11/12 md:w-1/3">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl text-white font-semibold mx-auto">Edit Course</h2>
          <button className="text-xl text-white hover:text-black" onClick={onClose}>
            &times;
          </button>
        </div>
        <form className="space-y-10 px-20" onSubmit={handleSubmit}>
          <label className="block font-semibold text-white">Course Code</label>
          <input
            type="text"
            className="w-full p-8 border rounded bg-customWhite"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            required
          />

          <label className="block font-semibold text-white">Course Description</label>
          <input
            type="text"
            className="w-full p-8 border rounded bg-customWhite"
            value={courseDescription}
            onChange={(e) => setCourseDescription(e.target.value)}
            required
          />

          <label className="block font-semibold text-white">Course Type</label>
          <select
            className="w-full p-10 border rounded bg-customWhite"
            value={courseType}
            onChange={(e) => setCourseType(e.target.value)}
            required
          >
            <option disabled value="">
              Select Course Type
            </option>
            <option value="Core">Core</option>
            <option value="Professional">Professional</option>
          </select>

          {successMessage && <div className="text-green-600 mb-4">{successMessage}</div>}

          <div className="flex justify-center gap-6 py-6">
            <button type="submit" className="bg-blue-500 text-white hover:bg-blue-700 duration-300 px-18 font-semibold py-2 rounded-lg">
              Save
            </button>
            <button type="button" className="bg-gray-500 text-white font-semibold border border-gray-500 hover:bg-gray-700 duration-300 px-8 py-2 rounded-lg" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCourseModal;
