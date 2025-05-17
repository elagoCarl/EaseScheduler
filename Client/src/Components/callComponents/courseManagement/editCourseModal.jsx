import React, { useState, useEffect } from "react";
import Axios from "../../../axiosConfig";
import { useAuth } from "../../authContext";
import PropTypes from "prop-types";
import { X, Check, AlertCircle, AlertTriangle } from "lucide-react";

const EditCourseModal = ({ isOpen, onClose, course, onUpdateSuccess, departmentId: propDepartmentId }) => {
  const { user } = useAuth();
  // Use the user's department ID or the prop if user has no department
  const departmentId = user?.DepartmentId || propDepartmentId;

  // State to store department details including isCore status
  const [departmentDetails, setDepartmentDetails] = useState(null);
  const isCore = departmentDetails?.isCore || user?.Department?.isCore;

  const [formData, setFormData] = useState({
    Code: "",
    Description: "",
    Type: "",
    Duration: "",
    Units: "",
    RoomTypeId: "",
    DepartmentId: ""
  });
  const [roomTypes, setRoomTypes] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isPair, setIsPair] = useState(false);
  const [isTutorial, setIsTutorial] = useState(false);

  useEffect(() => {
    if (isOpen && course) {
      // Check if this is a paired course
      setIsPair(course.PairId !== null);
      setIsTutorial(course.isTutorial || false);

      // Reset form with course data
      setFormData({
        Code: course.Code || "",
        Description: course.Description || "",
        Type: course.Type || "",
        Duration: course.Duration || "",
        Units: course.Units || "",
        RoomTypeId: course.RoomTypeId || "",
        DepartmentId: departmentId || ""
      });
      setErrorMessage("");
      setSuccessMessage("");
      fetchRoomTypes();

      // Fetch department details if we have a departmentId
      if (departmentId) {
        fetchDepartmentDetails(departmentId);
      }

      // If this is a paired course, fetch the paired course info
      if (course.PairId) {
        fetchPairedCourse(course.id, course.PairId);
      }
    }
  }, [isOpen, course, departmentId]);

  // Fetch department details to determine if it's a core department
  const fetchDepartmentDetails = async (deptId) => {
    try {
      if (!deptId) return;

      const response = await Axios.get(`/department/getDepartmentById/${deptId}`);
      if (response.data.successful) {
        setDepartmentDetails(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch department details:", error);
    }
  };

  // State to store the paired course information
  const [pairedCourse, setPairedCourse] = useState(null);

  // Fetch the paired course information
  const fetchPairedCourse = async (currentCourseId, pairId) => {
    try {
      const response = await Axios.get(`/course/getAllCourses`);
      if (response.data.successful) {
        // Find the other course with the same PairId that isn't the current course
        const paired = response.data.data.find(c =>
          c.PairId === pairId && c.id !== currentCourseId
        );
        if (paired) {
          setPairedCourse(paired);
        }
      }
    } catch (error) {
      console.error("Failed to fetch paired course:", error);
    }
  };

  useEffect(() => {
    // If user is not from a core department and tries to select Core type, reset to Professional
    if (!isCore && formData.Type === "Core") {
      setFormData({
        ...formData,
        Type: "Professional"
      });
    }
  }, [formData.Type, isCore]);

  const fetchRoomTypes = async () => {
    try {
      const response = await Axios.get("/roomType/getAllRoomTypes");
      if (response.data.successful) setRoomTypes(response.data.data);
    } catch (error) {
      setErrorMessage("Failed to fetch room types. Please try again.");
    }
  };

  if (!isOpen) return null;

  // If no department is selected, show a message
  if (!departmentId) {
    return (
      <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex justify-center items-center z-50 backdrop-filter backdrop-blur-sm">
        <div className="bg-white rounded-lg shadow-xl w-11/12 md:max-w-md overflow-hidden transform transition-all">
          <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl text-white font-semibold">Edit Course</h2>
            <button
              type="button"
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors duration-200"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 text-center">
            <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Department Required</h3>
            <p className="text-gray-600 mb-4">
              Please select a department first to edit a course.
            </p>
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded shadow-md hover:bg-blue-700 transition duration-200"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const shakeForm = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    if (!course || !course.id) {
      setErrorMessage("Course data is missing or has no ID");
      shakeForm();
      setIsSubmitting(false);
      return;
    }

    // Basic client-side validation - just check if fields are filled
    if (!formData.Code || !formData.Description || !formData.Duration ||
      !formData.Units || !formData.Type || !formData.RoomTypeId) {
      setErrorMessage("Please fill in all required fields.");
      shakeForm();
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await Axios.put(
        `/course/updateCourse/${course.id}`,
        {
          Code: formData.Code,
          Description: formData.Description,
          Duration: parseInt(formData.Duration),
          Units: parseInt(formData.Units),
          Type: formData.Type,
          RoomTypeId: formData.RoomTypeId,
          DepartmentId: departmentId
        }
      );

      if (response.data.successful) {
        setSuccessMessage("Course updated successfully!");
        if (onUpdateSuccess) {
          onUpdateSuccess();
        }
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMessage(response.data.message || "Failed to update course");
        shakeForm();
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "An unexpected error occurred";
      setErrorMessage(errorMsg);
      shakeForm();
      console.error("Error updating course:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex justify-center items-center z-50 backdrop-filter backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-11/12 md:max-w-xl overflow-hidden transform transition-all">
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl text-white font-semibold">Edit Course</h2>
          <button
            type="button"
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors duration-200"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {isPair && pairedCourse && (
          <div className="bg-amber-50 border-t border-amber-200 p-3 flex items-start space-x-2">
            <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              This course is paired with <strong>{pairedCourse.Code}</strong> ({pairedCourse.Description})
            </p>
          </div>
        )}

        {isTutorial && (
          <div className="bg-blue-50 border-t border-blue-200 p-3 flex items-start space-x-2">
            <AlertCircle size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">
              This is a tutorial course. Note that tutorial courses have Units automatically set to 0.
            </p>
          </div>
        )}

        <form
          className={`p-6 space-y-4 max-h-[80vh] overflow-y-auto ${isShaking ? "animate-shake" : ""}`}
          onSubmit={handleSubmit}
        >
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Course Code
            </label>
            <input
              type="text"
              name="Code"
              placeholder="Enter course code"
              className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              value={formData.Code}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Course Description
            </label>
            <input
              type="text"
              name="Description"
              placeholder="Enter course description"
              className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              value={formData.Description}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Course Duration (hours)
              </label>
              <input
                type="number"
                name="Duration"
                placeholder="Enter duration"
                min="1"
                className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                value={formData.Duration}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                No. of Units
              </label>
              <input
                type="number"
                name="Units"
                placeholder="Enter number of units"
                min="1"
                max="30"
                className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                value={formData.Units}
                onChange={handleInputChange}
                disabled={isTutorial}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Course Type
              </label>
              <select
                name="Type"
                className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                value={formData.Type}
                onChange={handleInputChange}
                required
              >
                <option value="" disabled>
                  Select Course Type
                </option>
                <option value="Core" disabled={!isCore}>
                  Core {!isCore && "(Requires Core Department Access)"}
                </option>
                <option value="Professional">Professional</option>
                <option value="General">General</option>
                <option value="Elective">Elective</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Room Type
              </label>
              <select
                name="RoomTypeId"
                className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                value={formData.RoomTypeId}
                onChange={handleInputChange}
                required
              >
                <option value="" disabled>
                  Select Room Type
                </option>
                {roomTypes.map((roomType) => (
                  <option key={roomType.id} value={roomType.id}>
                    {roomType.Type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start space-x-2">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-start space-x-2">
              <Check size={18} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm">{successMessage}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              className="px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded hover:bg-gray-200 transition duration-200"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2.5 bg-blue-600 text-white font-medium rounded shadow-md hover:bg-blue-700 transition duration-200 flex items-center space-x-2 ${isSubmitting ? "opacity-75 cursor-not-allowed" : ""
                }`}
            >
              {isSubmitting ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

EditCourseModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  course: PropTypes.object,
  onUpdateSuccess: PropTypes.func,
  departmentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) // Optional prop for when user has no department
};

export default EditCourseModal;