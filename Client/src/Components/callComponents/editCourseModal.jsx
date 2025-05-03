import React, { useState, useEffect } from "react";
import Axios from "../../axiosConfig";
import { useAuth } from "../authContext";
import PropTypes from "prop-types";
import { X, Check, AlertCircle } from "lucide-react";

const EditCourseModal = ({ isOpen, onClose, course, onUpdateSuccess }) => {
  const { user } = useAuth();
  console.log("user: ", user);
  const isCore = user.Department.isCore;
  const [formData, setFormData] = useState({
    Code: "",
    Description: "",
    Type: "",
    Duration: "",
    Units: "",
    RoomTypeId: "",
    DepartmentId: "",
  });
  const [roomTypes, setRoomTypes] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Define prop types
  EditCourseModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    course: PropTypes.object,
    onUpdateSuccess: PropTypes.func,
  };

  useEffect(() => {
    if (isOpen && course) {
      // Reset form with course data
      setFormData({
        Code: course.Code || "",
        Description: course.Description || "",
        Type: course.Type || "",
        Duration: course.Duration || "",
        Units: course.Units || "",
        RoomTypeId: course.RoomTypeId || "",
        DepartmentId: user?.DepartmentId || course.DepartmentId || "",
      });
      setErrorMessage("");
      setSuccessMessage("");
      fetchRoomTypes();
    }
  }, [isOpen, course, user]);

  useEffect(() => {
    // If user is not from a core department and tries to select Core type, reset to Professional
    if (!isCore && formData.Type === "Core") {
      setFormData({
        ...formData,
        Type: "Professional",
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

    if (parseInt(formData.Duration) <= 0 || parseInt(formData.Units) <= 0) {
      setErrorMessage("Duration and Units must be greater than 0");
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
          DepartmentId: user.DepartmentId,
        },
        {
          headers: { "Content-Type": "application/json" },
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
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "An unexpected error occurred";
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

        <form
          className={`p-6 space-y-4 max-h-[80vh] overflow-y-auto ${
            isShaking ? "animate-shake" : ""
          }`}
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
                className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                value={formData.Units}
                onChange={handleInputChange}
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
              className={`px-4 py-2.5 bg-blue-600 text-white font-medium rounded shadow-md hover:bg-blue-700 transition duration-200 flex items-center space-x-2 ${
                isSubmitting ? "opacity-75 cursor-not-allowed" : ""
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

export default EditCourseModal;