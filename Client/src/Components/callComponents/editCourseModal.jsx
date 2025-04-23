import React, { useState, useEffect } from "react";
import Axios from "../../axiosConfig";
import { useAuth } from '../authContext';
import PropTypes from "prop-types";

const EditCourseModal = ({ isOpen, onClose, course, onUpdateSuccess }) => {
  const { user } = useAuth();
  const [courseCode, setCourseCode] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseType, setCourseType] = useState("");
  const [courseDuration, setCourseDuration] = useState("");
  const [courseUnits, setCourseUnits] = useState("");
  const [courseYear, setCourseYear] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isShaking, setIsShaking] = useState(false);

  // Define prop types
  EditCourseModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    course: PropTypes.object,
    onUpdateSuccess: PropTypes.func
  };

  // Reset form when modal opens with new course data
  useEffect(() => {
    if (isOpen && course) {
      setCourseCode(course.Code || "");
      setCourseDescription(course.Description || "");
      setCourseType(course.Type || "");
      setCourseDuration(course.Duration || "");
      setCourseUnits(course.Units || "");
      setCourseYear(course.Year || "");
      setMessage({ text: "", type: "" });
    }
  }, [isOpen, course]);

  if (!isOpen) return null;

  const shakeForm = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const closeModal = () => {
    setMessage({ text: "", type: "" });
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!course || !course.id) {
      setMessage({ text: "Course data is missing or has no ID", type: "error" });
      shakeForm();
      return;
    }

    try {
      const response = await Axios.put(
        `/course/updateCourse/${course.id}`,
        {
          Code: courseCode,
          Description: courseDescription,
          Duration: courseDuration,
          Units: courseUnits,
          Type: courseType,
          Year: courseYear,
          Dept_id: user.DepartmentId
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.data.successful) {
        setMessage({ text: "Course updated successfully!", type: "success" });
        if (onUpdateSuccess) {
          onUpdateSuccess();
        }
        setTimeout(closeModal, 1500);
      } else {
        // Handle case where request succeeds but operation fails
        setMessage({ text: response.data.message || "Failed to update course", type: "error" });
        shakeForm();
      }
    } catch (error) {
      // Display actual backend error message
      const errorMsg = error.response?.data?.message || error.message || "An unexpected error occurred";
      setMessage({ text: errorMsg, type: "error" });
      shakeForm();
      console.error("Error updating course:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-customBlue1 p-8 rounded-lg w-11/12 md:w-1/3">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl text-white font-semibold mx-auto">Edit Course</h2>
          <button className="text-3xl text-white hover:text-red-500 duration-300" onClick={closeModal}>
            &times;
          </button>
        </div>
        <form className={`space-y-4 px-6 ${isShaking ? 'animate-shake' : ''}`} onSubmit={handleSubmit}>
          {message.text && (
            <div className={`border-l-4 p-4 mb-4 rounded
              ${message.type === 'success' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-red-100 border-red-500 text-red-700'}`}>
              <p className={message.type === 'error' ? "font-bold" : ""}>{message.type === 'error' ? "Error" : ""}</p>
              <p>{message.text}</p>
            </div>
          )}

          <label className="block font-semibold text-white">Course Code</label>
          <input
            type="text"
            className="w-full p-5 border rounded bg-customWhite"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            required
          />

          <label className="block font-semibold text-white">Course Description</label>
          <input
            type="text"
            className="w-full p-5 rounded bg-customWhite"
            value={courseDescription}
            onChange={(e) => setCourseDescription(e.target.value)}
            required
          />

          <label className="block font-semibold text-white">Duration</label>
          <input
            type="number"
            className="w-full p-5 border rounded bg-customWhite"
            value={courseDuration}
            onChange={(e) => setCourseDuration(e.target.value)}
            required
          />

          <label className="block font-semibold text-white">Units</label>
          <input
            type="number"
            className="w-full p-5 border rounded bg-customWhite"
            value={courseUnits}
            onChange={(e) => setCourseUnits(e.target.value)}
            required
          />

          <label className="block font-semibold text-white">Course Type</label>
          <select
            className="w-full p-5 border rounded bg-customWhite"
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

          <label className="block font-semibold text-white">Year Level</label>
          <input
            type="number"
            className="w-full p-5 border rounded bg-customWhite"
            value={courseYear}
            onChange={(e) => setCourseYear(e.target.value)}
          />

          <div className="flex justify-center gap-6 py-6">
            <button type="submit" className="bg-blue-500 text-white hover:bg-blue-700 duration-300 px-12 font-semibold py-2 rounded-lg">
              Save
            </button>
            <button type="button" className="bg-gray-500 text-white font-semibold border border-gray-500 hover:bg-gray-600 duration-300 px-6 py-2 rounded-lg" onClick={closeModal}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCourseModal;