import { useState, useEffect, useRef } from "react";
import Axios from '../../axiosConfig';
import { useAuth } from '../authContext';

const AddCourseModal = ({ isOpen, onClose, fetchCourse }) => {
  const { user } = useAuth();
  console.log("UUUUUUUUUUUUUSSSSERR: ", user);
  console.log("useridDDDDDDDDDDDDDDept: ", user.DepartmentId);
  const [courseCode, setCourseCode] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseDuration, setCourseDuration] = useState("");
  const [courseUnits, setCourseUnits] = useState("");
  const [courseType, setCourseType] = useState("");
  const [courseYear, setCourseYear] = useState("")
  const [statusCode, setStatusCode] = useState("")
  const [isShaking, setIsShaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (!isOpen) return null; // Prevent rendering if the modal is not open

  const shakeForm = () => {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 500)
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent form refresh
    setErrorMessage("") //pang clear error kung nagkaroon man

    console.log({
      Code: courseCode,
      Description: courseDescription,
      Duration: courseDuration,
      Units: courseUnits,
      Type: courseType, // Ensure this is populated
      Year: courseYear
    });

    try {
      const response = await Axios.post("/course/addCourse", {
        Code: courseCode,
        Description: courseDescription,
        Duration: courseDuration,
        Units: courseUnits,
        Type: courseType,
        Year: courseYear,
        Dept_id: user.DepartmentId
      });

      // Handle successful response
      if (response.data.successful) {
        setSuccessMessage("Course Added Successfully! Reloading page...");
        fetchCourse();
        onClose();
      }

      else {
        console.error("Failed to add course: " + response.data.message);
      }

    } catch (error) {
      // Handle Axios errors
      if (error.response && error.response.status === 400) {
        console.log("Course Already Exists!");
        setErrorMessage("Course Already Exists!")
        shakeForm();
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
        <form
          className={`space-y-10 px-20 ${isShaking ? 'animate-shake' : ''}`}
          onSubmit={handleSubmit}
        > {errorMessage && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded" role="alert">
            <p className="font-bold">Error</p>
            <p>{errorMessage}</p>
          </div> //para maidentify if mali o duplicate di siya mag poproceed
        )}
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

          <label className="block font-semibold text-white">Year Level</label>
          <input
            type="number"
            placeholder="Year Level"
            className="w-full p-8 border rounded bg-customWhite"
            value={courseYear}
            onChange={(e) => setCourseYear(e.target.value)}
            required
          />

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
