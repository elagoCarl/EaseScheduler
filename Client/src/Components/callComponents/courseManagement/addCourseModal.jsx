import { useState, useEffect } from "react";
import Axios from '../../../axiosConfig';
import { useAuth } from '../../authContext';
import PropTypes from "prop-types";
import { X, Check, AlertCircle, Plus, Trash } from "lucide-react";

const AddCourseModal = ({ isOpen, onClose, fetchCourse }) => {
  const { user } = useAuth();
  const isCore = user?.Department?.isCore;
  const [formData, setFormData] = useState({
    Code: "", Description: "", Duration: "", Units: "", Type: "",
    DepartmentId: "", RoomTypeId: "", ProgYears: []
  });
  const [programs, setPrograms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      fetchPrograms();
      fetchRoomTypes();
      if (user?.DepartmentId) {
        setFormData(prev => ({ ...prev, DepartmentId: user.DepartmentId }));
      }
    }
  }, [isOpen, user]);

  useEffect(() => {
    // If user is not from a core department and tries to select Core type, reset to Professional
    if (!isCore && formData.Type === "Core") {
      setFormData({
        ...formData,
        Type: "Professional"
      });
    }
  }, [formData.Type, isCore]);

  const resetForm = () => {
    setFormData({
      Code: "", Description: "", Duration: "", Units: "", Type: "",
      DepartmentId: user?.DepartmentId || "", RoomTypeId: "", ProgYears: []
    });
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(false);
  };

  const fetchPrograms = async () => {
    try {
      const response = await Axios.get(`/program/getAllProgByDept/${user.DepartmentId}`);
      if (response.data.successful) setPrograms(response.data.data);
    } catch (error) {
      setErrorMessage("Failed to fetch programs. Please try again.");
    }
  };

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

  const addProgramYear = () => {
    setFormData({
      ...formData,
      ProgYears: [...formData.ProgYears, { ProgramId: "", Year: "" }]
    });
  };

  const removeProgramYear = (index) => {
    const updatedProgYears = [...formData.ProgYears];
    updatedProgYears.splice(index, 1);
    setFormData({ ...formData, ProgYears: updatedProgYears });
  };

  const handleProgramYearChange = (index, field, value) => {
    const updatedProgYears = [...formData.ProgYears];
    updatedProgYears[index][field] = value;
    setFormData({ ...formData, ProgYears: updatedProgYears });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    if (formData.Duration <= 0 || formData.Units <= 0) {
      setErrorMessage("Duration and Units must be greater than 0");
      shakeForm();
      setIsSubmitting(false);
      return;
    }

    if (formData.ProgYears.length === 0) {
      setErrorMessage("Please add at least one program and year");
      shakeForm();
      setIsSubmitting(false);
      return;
    }

    for (const prog of formData.ProgYears) {
      if (!prog.ProgramId || !prog.Year) {
        setErrorMessage("Please fill in all program and year fields");
        shakeForm();
        setIsSubmitting(false);
        return;
      }
      if (prog.Year < 1 || prog.Year > 6) {
        setErrorMessage("Year must be between 1 and 6");
        shakeForm();
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const response = await Axios.post("/course/addCourse", {
        ...formData,
        Duration: parseInt(formData.Duration),
        Units: parseInt(formData.Units),
        ProgYears: formData.ProgYears.map(prog => ({
          ...prog,
          ProgramId: parseInt(prog.ProgramId),
          Year: parseInt(prog.Year)
        }))
      });

      if (response.data.successful) {
        setSuccessMessage("Course Added Successfully!");
        setTimeout(() => {
          fetchCourse(); // Call fetchCourse before closing the modal
          onClose();
        }, 1500);
      } else {
        setErrorMessage(response.data.message || "Failed to add course");
        shakeForm();
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || error.message || "An unexpected error occurred");
      shakeForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex justify-center items-center z-50 backdrop-filter backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-11/12 md:max-w-xl overflow-hidden transform transition-all">
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl text-white font-semibold">Add Course</h2>
          <button
            type="button"
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors duration-200"
            onClick={(e) => {
              e.preventDefault();
              onClose();
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form className={`p-6 space-y-4 max-h-[80vh] overflow-y-auto ${isShaking ? 'animate-shake' : ''}`} onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Course Code</label>
            <input
              type="text" name="Code" placeholder="Enter course code"
              className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              value={formData.Code} onChange={handleInputChange} required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Course Description</label>
            <input
              type="text" name="Description" placeholder="Enter course description"
              className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              value={formData.Description} onChange={handleInputChange} required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Course Duration (hours)</label>
              <input
                type="number" name="Duration" placeholder="Enter duration" min="1"
                className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                value={formData.Duration} onChange={handleInputChange} required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">No. of Units</label>
              <input
                type="number" name="Units" placeholder="Enter number of units" min="1"
                className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                value={formData.Units} onChange={handleInputChange} required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Course Type</label>
              <select
                name="Type"
                className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                value={formData.Type} onChange={handleInputChange} required
              >
                <option value="" disabled>Select Course Type</option>
                <option 
                  value="Core" 
                  disabled={!isCore}
                >
                  Core {!isCore && "(Requires Core Department Access)"}
                </option>
                <option value="Professional">Professional</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Room Type</label>
              <select
                name="RoomTypeId"
                className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                value={formData.RoomTypeId} onChange={handleInputChange} required
              >
                <option value="" disabled>Select Room Type</option>
                {roomTypes.map((roomType) => (
                  <option key={roomType.id} value={roomType.id}>{roomType.Type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">Program & Year Levels</label>
              <button
                type="button"
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                onClick={addProgramYear}
              >
                <Plus size={16} className="mr-1" /> Add Program
              </button>
            </div>

            {formData.ProgYears.length > 0 ? (
              formData.ProgYears.map((prog, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                  <div className="flex-1">
                    <select
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={prog.ProgramId}
                      onChange={(e) => handleProgramYearChange(index, 'ProgramId', e.target.value)}
                      required
                    >
                      <option value="">Select Program</option>
                      {programs.map((program) => (
                        <option key={program.id} value={program.id}>
                          {program.Code} - {program.Description}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-50">
                    <input
                      type="number" placeholder="Year" min="1" max="6"
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={prog.Year}
                      onChange={(e) => handleProgramYearChange(index, 'Year', e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700 p-1"
                    onClick={() => removeProgramYear(index)}
                  >
                    <Trash size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 italic">Please add at least one program and year level</div>
            )}
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
              onClick={(e) => {
                e.preventDefault();
                onClose();
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2.5 bg-blue-600 text-white font-medium rounded shadow-md hover:bg-blue-700 transition duration-200 flex items-center space-x-2 ${isSubmitting ? "opacity-75 cursor-not-allowed" : ""}`}
            >
              {isSubmitting ? "Adding..." : "Add Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

AddCourseModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  fetchCourse: PropTypes.func.isRequired,
};

export default AddCourseModal;