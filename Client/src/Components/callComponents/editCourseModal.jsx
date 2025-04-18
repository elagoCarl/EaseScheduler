import React, { useState, useEffect } from "react";
import Axios from "../../axiosConfig";
import { useAuth } from '../authContext';

const EditCourseModal = ({ isOpen, onClose, course, onUpdateSuccess }) => {
  const { user } = useAuth();
  const [courseCode, setCourseCode] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseType, setCourseType] = useState("");
  const [courseDuration, setCourseDuration] = useState(""); // ✅ Added Duration state
  const [courseUnits, setCourseUnits] = useState(""); // ✅ Added Units state
  const [courseYear, setCourseYear] = useState("")
  const [successMessage, setSuccessMessage] = useState("");
  const [courseID, setCourseID] = useState("");

  //modal updates when a new course is selected
  useEffect(() => {
    if (isOpen && course) {
      setCourseCode(course.Code || "");
      setCourseDescription(course.Description || "");
      setCourseType(course.Type || "");
      setCourseDuration(course.Duration || ""); // ✅ Initialize Duration
      setCourseUnits(course.Units || ""); // ✅ Initialize Units
      setCourseID(course.id || "");
      setCourseYear(course.Year || "")

      setSuccessMessage("")
    }
  }, [isOpen, course]);

  if (!isOpen) return null;

  console.log("Updating Course:", course);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!course || !courseID) {
      console.error("Course data is missing or has no Id.");
      return;
    }

    console.log("Updating course with ID:", courseID);

    try {
      const response = await Axios.put(
        `/course/updateCourse/${courseID}`,
        {
          Code: courseCode,
          Description: courseDescription,
          Duration: courseDuration, // ✅ Include Duration
          Units: courseUnits, // ✅ Include Units
          Type: courseType,
          Year: courseYear,
          Dept_id: user.DepartmentId
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.status === 200) {
        setSuccessMessage("Course updated successfully!");
        setTimeout(onClose, 1500);

        if (onUpdateSuccess) {
          onUpdateSuccess()
        }

        setTimeout(() => {
          onClose()

          setSuccessMessage("")
        }, 1500)

      } else {
        console.error("Failed to update course:", response.data);
      }
    } catch (error) {
      console.error("Unexpected error:", error.message);
    }
  };

  const handleEditCourse = async () => {
    try {
      const response = await Axios.put(`/course/updateCourse/${course.id}`, updatedCourse);
      if (response.data.successful) {
        onUpdateSuccess(); // ✅ Trigger parent update
        onClose(); // ✅ Close modal
      }
    } catch (error) {
      console.error("Error updating course:", error);
    }
  };


  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-customBlue1 p-8 rounded-lg w-11/12 md:w-1/3">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl text-white font-semibold mx-auto">Edit Course</h2>
          <button className="text-xl text-white hover:text-black" onClick={() => {
            setSuccessMessage(""); // Clear message on close
            onClose();
          }}
          >
            &times;
          </button>
        </div>
        <form className="space-y-4 px-6" onSubmit={handleSubmit}>
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
            required
          />

          {successMessage && (
            <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded">
              <p>{successMessage}</p>
            </div>
          )}

          <div className="flex justify-center gap-6 py-6">
            <button type="submit" className="bg-blue-500 text-white hover:bg-blue-700 duration-300 px-6 font-semibold py-2 rounded-lg">
              Save
            </button>
            <button type="button" className="bg-gray-500 text-white font-semibold border border-gray-500 hover:bg-gray-700 duration-300 px-6 py-2 rounded-lg" onClick={() => {
              setSuccessMessage(""); // Clear message on cancel
              onClose();
            }}
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
