import React, { useState } from "react";
import Axios from 'axios';

const AddCourseModal = ({ isOpen, onClose }) => {
  const [courseCode, setCourseCode] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseDuration, setCourseDuration] = useState("");
  const [courseUnits, setCourseUnits] = useState("");
  const [courseType, setCourseType] = useState("");
  const [statusCode, setStatusCode] = useState("")
  const [successMessage, setSuccessMessage] = useState("");

  if (!isOpen) return null; // Prevent rendering if the modal is not open


  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent form refresh

    console.log({
      Code: courseCode,
      Description: courseDescription,
      Duration: courseDuration,
      Units: courseUnits,
      Type: courseType, // Ensure this is populated
    });

    try {
      const response = await Axios.post("http://localhost:8080/course/addCourse", {
        Code: courseCode,
        Description: courseDescription,
        Duration: courseDuration,
        Units: courseUnits,
        Type: courseType,
        Dept_id: 1 // Temporary
      });

      // Handle successful response
      if (response.data.successful) {
        setSuccessMessage("Course Added Successfully! Reloading page...");
      }

      else {
        console.error("Failed to add course: " + response.data.message);
      }

    } catch (error) {
      // Handle Axios errors
      if (error.response && error.response.status === 400) {
        alert("Course Already Exists!");
      } else {
        console.error("An unexpected error occurred:", error.message);
        alert("An unexpected error occurred. Please try again.");
      }
    }
  };


  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-customBlue1 p-8 rounded-lg w-11/12 md:w-1/3">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl text-white font-semibold mx-auto">Add Course</h2>
          <button
            className="text-xl text-white hover:text-black"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <form className="space-y-10 px-20" onSubmit={handleSubmit}>
          <label className="block font-semibold text-white">Course Code</label>
          <input
            type="text"
            placeholder="Course Code"
            className="w-full p-8 border rounded bg-customWhite"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            required
          />

          <label className="block font-semibold text-white">Course Description</label>
          <input
            type="text"
            placeholder="Course Description"
            className="w-full p-8 border rounded bg-customWhite"
            value={courseDescription}
            onChange={(e) => setCourseDescription(e.target.value)}
            required
          />

          <label className="block font-semibold text-white">Course Duration</label>
          <input
            type="number"
            placeholder="Course Duration"
            className="w-full p-8 border rounded bg-customWhite"
            value={courseDuration}
            onChange={(e) => setCourseDuration(e.target.value)}
            required
          />

          <label className="block font-semibold text-white">No. of Units</label>
          <input
            type="number"
            placeholder="No. of Units"
            className="w-full p-8 border rounded bg-customWhite"
            value={courseUnits}
            onChange={(e) => setCourseUnits(e.target.value)}
            required
          />

          <label className="block font-semibold text-white">Course Type</label>
          <select
            className="w-full p-10 border rounded bg-customWhite"
            required
            value={courseType} // Bind the value of the select to the state
            onChange={(e) => setCourseType(e.target.value)} // Update the state when the value changes
          >
            <option disabled value="">
              Select Course Type
            </option>
            <option value="Core">Core</option>
            <option value="Professional">Professional</option>
          </select>

          {/* Display the success message */}
          {successMessage && (
            <div className="text-green-600 mb-4">{successMessage}</div>
          )}

          <div className="flex justify-center gap-6 py-6">
            <button
              type="submit"
              className="bg-blue-500 text-white hover:bg-blue-700 duration-300 px-18 font-semibold py-2 rounded-lg"
            >
              Add
            </button>
            <button
              type="button"
              className="bg-gray-500 text-white font-semibold border border-gray-500 hover:bg-gray-700 duration-300 px-8 py-2 rounded-lg"
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

export default AddCourseModal;
