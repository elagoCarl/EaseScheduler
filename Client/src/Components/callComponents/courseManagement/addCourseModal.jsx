import { useState, useEffect } from "react";
import Axios from '../../../axiosConfig';
import { useAuth } from '../../authContext';
import PropTypes from "prop-types";
import { X, Check, AlertCircle, Plus, Trash, PlusCircle } from "lucide-react";

const AddCourseModal = ({ isOpen, onClose, fetchCourse, departmentId: propDepartmentId }) => {
  const { user } = useAuth();
  // Use either the user's department or the one passed as prop
  const departmentId = user?.DepartmentId || propDepartmentId;

  // State to store department details including isCore status
  const [departmentDetails, setDepartmentDetails] = useState(null);
  const isCore = departmentDetails?.isCore || user?.Department?.isCore;
  const [isPair, setIsPair] = useState(false);
  const [courses, setCourses] = useState([{
    Code: "",
    Description: "",
    Duration: "",
    Units: "",
    Type: "",
    DepartmentId: "",
    RoomTypeId: "",
    ProgYears: [],
    isTutorial: false
  }]);
  const [programs, setPrograms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      fetchRoomTypes();

      // Only fetch programs and department details if we have a department ID
      if (departmentId) {
        fetchPrograms(departmentId);
        fetchDepartmentDetails(departmentId);
      }
    }
  }, [isOpen, departmentId]);

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

  // Separate effect to handle department ID updates
  useEffect(() => {
    if (isOpen && departmentId) {
      setCourses(prevCourses => {
        // Only update if the first course doesn't already have the department ID
        if (prevCourses[0]?.DepartmentId !== departmentId) {
          const updatedCourses = [...prevCourses];
          updatedCourses[0] = { ...updatedCourses[0], DepartmentId: departmentId };
          return updatedCourses;
        }
        return prevCourses;
      });
    }
  }, [isOpen, departmentId]);

  useEffect(() => {
    // Initialize pair if needed
    if (isPair && courses.length === 1) {
      // Add a second course for the pair (lab course)
      addPairedCourse();
    } else if (!isPair && courses.length > 1) {
      // Remove second course if no longer a pair
      setCourses([courses[0]]);
    }

    // If this is a pair, sync program years between courses
    if (isPair && courses.length === 2) {
      const updatedCourses = [...courses];
      // Ensure both courses have the same ProgYears
      updatedCourses[1].ProgYears = JSON.parse(JSON.stringify(updatedCourses[0].ProgYears));
      setCourses(updatedCourses);
    }
  }, [isPair]);

  useEffect(() => {
    // Only run this if isCore changes and there are courses with Type=Core that need adjustment
    if (!isCore) {
      let needsUpdate = false;
      const updatedCourses = courses.map(course => {
        if (course.Type === "Core") {
          needsUpdate = true;
          return { ...course, Type: "Professional" };
        }
        return course;
      });

      // Only update state if we actually made changes
      if (needsUpdate) {
        setCourses(updatedCourses);
      }
    }
  }, [isCore]);

  const resetForm = () => {
    setIsPair(false);
    setCourses([{
      Code: "",
      Description: "",
      Duration: "",
      Units: "",
      Type: "",
      DepartmentId: departmentId || "", // Use current departmentId
      RoomTypeId: "",
      ProgYears: [],
      isTutorial: false
    }]);
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(false);
  };

  const fetchPrograms = async (deptId) => {
    if (!deptId) {
      console.log("No department ID available for fetching programs");
      setPrograms([]);
      return;
    }

    try {
      const response = await Axios.get(`/program/getAllProgByDept/${deptId}`);
      if (response.data.successful) {
        setPrograms(response.data.data);
      } else {
        setErrorMessage("Failed to fetch programs for the selected department");
        setPrograms([]);
      }
    } catch (error) {
      setErrorMessage("Failed to fetch programs. Please try again.");
      setPrograms([]);
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

  // If no department is selected, show a message
  if (!departmentId) {
    return (
      <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex justify-center items-center z-50 backdrop-filter backdrop-blur-sm">
        <div className="bg-white rounded-lg shadow-xl w-11/12 md:max-w-md overflow-hidden transform transition-all">
          <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl text-white font-semibold">Add Course</h2>
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
              Please select a department first to add a course.
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

  const handleInputChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const updatedCourses = [...courses];

    // Handle checkbox differently
    if (type === 'checkbox') {
      updatedCourses[index][name] = checked;

      // If marking as tutorial, set Units to 0
      if (name === 'isTutorial' && checked) {
        updatedCourses[index].Units = "0";
      }
    } else {
      updatedCourses[index][name] = value;
    }

    setCourses(updatedCourses);
  };

  const addPairedCourse = () => {
    // Create a lab version of the course
    const mainCourse = courses[0];
    const labCourse = {
      ...mainCourse,
      Code: mainCourse.Code ? `${mainCourse.Code}L` : "",
      Description: mainCourse.Description ? `${mainCourse.Description} Lab` : "",
      Duration: mainCourse.Duration,
      Units: mainCourse.Units,
      Type: mainCourse.Type,
      DepartmentId: mainCourse.DepartmentId,
      RoomTypeId: mainCourse.RoomTypeId,
      ProgYears: JSON.parse(JSON.stringify(mainCourse.ProgYears)), // Deep copy
      isTutorial: mainCourse.isTutorial
    };

    setCourses([...courses, labCourse]);
  };

  const addProgramYear = (courseIndex) => {
    const updatedCourses = [...courses];
    updatedCourses[courseIndex].ProgYears = [
      ...updatedCourses[courseIndex].ProgYears,
      { ProgramId: "", Year: "", Semester: "1" }
    ];

    // If this is a pair, add to the other course as well
    if (isPair && courses.length === 2) {
      const otherCourseIndex = courseIndex === 0 ? 1 : 0;
      updatedCourses[otherCourseIndex].ProgYears = [
        ...updatedCourses[otherCourseIndex].ProgYears,
        { ProgramId: "", Year: "", Semester: "1" }
      ];
    }

    setCourses(updatedCourses);
  };

  const removeProgramYear = (courseIndex, progIndex) => {
    const updatedCourses = [...courses];
    updatedCourses[courseIndex].ProgYears.splice(progIndex, 1);

    // If this is a pair, remove from the other course as well
    if (isPair && courses.length === 2) {
      const otherCourseIndex = courseIndex === 0 ? 1 : 0;
      updatedCourses[otherCourseIndex].ProgYears.splice(progIndex, 1);
    }

    setCourses(updatedCourses);
  };

  const handleProgramYearChange = (courseIndex, progIndex, field, value) => {
    const updatedCourses = [...courses];
    updatedCourses[courseIndex].ProgYears[progIndex][field] = value;

    // If this is a pair, update the other course as well
    if (isPair && courses.length === 2) {
      const otherCourseIndex = courseIndex === 0 ? 1 : 0;

      // Make sure the other course has this program year entry
      if (!updatedCourses[otherCourseIndex].ProgYears[progIndex]) {
        updatedCourses[otherCourseIndex].ProgYears[progIndex] = {
          ProgramId: "",
          Year: "",
          Semester: "1"
        };
      }

      // Update the corresponding field in the other course
      updatedCourses[otherCourseIndex].ProgYears[progIndex][field] = value;
    }

    setCourses(updatedCourses);
  };

  const validateForm = () => {
    // Validate each course
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];

      // Check mandatory fields
      if (!course.Code || !course.Description || !course.Duration || !course.Type ||
        !course.DepartmentId || !course.RoomTypeId) {
        setErrorMessage("All mandatory fields are required.");
        return false;
      }

      // Validate duration
      if (parseInt(course.Duration) <= 0) {
        setErrorMessage("Duration must be greater than 0");
        return false;
      }

      // For non-tutorial courses, validate Units and ProgYears
      if (!course.isTutorial) {
        if (!course.Units || parseInt(course.Units) <= 0) {
          setErrorMessage("Units must be greater than 0 for non-tutorial courses");
          return false;
        }

        if (parseInt(course.Units) < 1 || parseInt(course.Units) > 30) {
          setErrorMessage("Units should be between 1 and 30");
          return false;
        }

        if (course.ProgYears.length === 0) {
          setErrorMessage("Please add at least one program and year for non-tutorial courses");
          return false;
        }

        // Check all ProgYears
        for (const prog of course.ProgYears) {
          if (!prog.ProgramId || !prog.Year || !prog.Semester) {
            setErrorMessage("Please fill in all program, year, and semester fields");
            return false;
          }

          if (parseInt(prog.Year) < 1 || parseInt(prog.Year) > 6) {
            setErrorMessage("Year must be between 1 and 6");
            return false;
          }

          if (prog.Semester !== "1" && prog.Semester !== "2") {
            setErrorMessage("Semester must be either 1 or 2");
            return false;
          }
        }
      }
    }

    // If this is a pair, validate pair conditions
    if (isPair && courses.length === 2) {
      // Check if one code ends with L (lab) and the other doesn't
      const hasLabCourse = courses.some(course => course.Code.endsWith('L'));
      const hasLectureCourse = courses.some(course => !course.Code.endsWith('L'));

      if (!hasLabCourse || !hasLectureCourse) {
        setErrorMessage("For course pairs, one course should be a lab course (ending with 'L').");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    if (!validateForm()) {
      shakeForm();
      setIsSubmitting(false);
      return;
    }

    try {
      // Prepare data for submission
      const formattedCourses = courses.map(course => ({
        ...course,
        Duration: parseInt(course.Duration),
        Units: parseInt(course.Units),
        ProgYears: course.ProgYears.map(prog => ({
          ...prog,
          ProgramId: parseInt(prog.ProgramId),
          Year: parseInt(prog.Year),
          Semester: parseInt(prog.Semester)
        }))
      }));

      // Submit single course or pair based on isPair state
      const response = await Axios.post("/course/addCourse",
        isPair ? formattedCourses : formattedCourses[0]
      );

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
      <div className="bg-white rounded-lg shadow-xl w-11/12 md:max-w-xl lg:max-w-2xl overflow-hidden transform transition-all">
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl text-white font-semibold">
            Add {isPair ? "Course Pair" : "Course"}
          </h2>
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
          {/* Course Pair Toggle */}
          <div className="flex items-center mb-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="form-checkbox h-15 w-15 text-blue-600"
                checked={isPair}
                onChange={(e) => setIsPair(e.target.checked)}
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Create as Course Pair (Lecture + Lab together)
              </span>
            </label>
          </div>

          {/* Course Form(s) */}
          {courses.map((course, courseIndex) => (
            <div key={courseIndex} className="mb-6 p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium mb-3">
                {isPair
                  ? (courseIndex === 0 ? "Lecture Course" : "Lab Course")
                  : "Course Details"}
              </h3>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Course Code</label>
                  <input
                    type="text" name="Code" placeholder="Enter course code"
                    className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                    value={course.Code} onChange={(e) => handleInputChange(courseIndex, e)} required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Course Description</label>
                  <input
                    type="text" name="Description" placeholder="Enter course description"
                    className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                    value={course.Description} onChange={(e) => handleInputChange(courseIndex, e)} required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Course Duration (hours)</label>
                    <input
                      type="number" name="Duration" placeholder="Enter duration" min="1"
                      className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                      value={course.Duration} onChange={(e) => handleInputChange(courseIndex, e)} required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      <div className="flex items-center justify-between">
                        <span>No. of Units</span>
                        {/* Only show the tutorial checkbox on the first course or if not a pair */}
                        {(!isPair || courseIndex === 0) && (
                          <label className="flex items-center text-xs">
                            <input
                              type="checkbox"
                              name="isTutorial"
                              className="mr-1"
                              checked={course.isTutorial}
                              onChange={(e) => {
                                handleInputChange(courseIndex, e);
                                // If it's a pair, sync the isTutorial value to the other course
                                if (isPair && courses.length === 2) {
                                  const otherIndex = courseIndex === 0 ? 1 : 0;
                                  const event = {
                                    target: {
                                      name: "isTutorial",
                                      type: "checkbox",
                                      checked: e.target.checked
                                    }
                                  };
                                  handleInputChange(otherIndex, event);
                                }
                              }}
                            />
                            check if this is a tutorial course
                          </label>
                        )}
                      </div>
                    </label>
                    <input
                      type="number" name="Units" placeholder="Enter number of units" min={course.isTutorial ? "0" : "1"}
                      className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                      value={course.Units}
                      onChange={(e) => handleInputChange(courseIndex, e)}
                      disabled={course.isTutorial}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Course Type</label>
                    <select
                      name="Type"
                      className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                      value={course.Type}
                      onChange={(e) => handleInputChange(courseIndex, e)}
                      required
                    >
                      <option value="" disabled>Select Course Type</option>
                      <option
                        value="Core"
                        disabled={!isCore}
                      >
                        Core {!isCore && "(Requires Core Department Access)"}
                      </option>
                      <option value="Professional">Professional</option>
                      {/* <option value="General">General</option> */}
                      {/* <option value="Elective">Elective</option> */}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Room Type</label>
                    <select
                      name="RoomTypeId"
                      className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                      value={course.RoomTypeId}
                      onChange={(e) => handleInputChange(courseIndex, e)}
                      required
                    >
                      <option value="" disabled>Select Room Type</option>
                      {roomTypes.map((roomType) => (
                        <option key={roomType.id} value={roomType.id}>{roomType.Type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Only show the Program & Year Levels section for the first course when it's a pair */}
                {!course.isTutorial && (!isPair || courseIndex === 0) && (
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium text-gray-700">
                        Program & Year Levels
                        {isPair && <span className="ml-2 text-xs text-blue-600">(Will apply to both courses)</span>}
                      </label>
                      <button
                        type="button"
                        className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                        onClick={() => addProgramYear(courseIndex)}
                      >
                        <Plus size={16} className="mr-1" /> Add Program
                      </button>
                    </div>

                    {course.ProgYears.length > 0 ? (
                      course.ProgYears.map((prog, progIndex) => (
                        <div key={progIndex} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                          <div className="flex-1">
                            <select
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              value={prog.ProgramId}
                              onChange={(e) => handleProgramYearChange(courseIndex, progIndex, 'ProgramId', e.target.value)}
                              required
                            >
                              <option value="">Select Program</option>
                              {programs.map((program) => (
                                <option key={program.id} value={program.id}>
                                  {program.Code} - {program.Name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1">
                            <input
                              type="number" placeholder="Year" min="1" max="6"
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              value={prog.Year}
                              onChange={(e) => handleProgramYearChange(courseIndex, progIndex, 'Year', e.target.value)}
                              required
                            />
                          </div>
                          <div className="flex-1">
                            <select
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              value={prog.Semester}
                              onChange={(e) => handleProgramYearChange(courseIndex, progIndex, 'Semester', e.target.value)}
                              required
                            >
                              <option value="1">Sem 1</option>
                              <option value="2">Sem 2</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            className="text-red-500 hover:text-red-700 p-1"
                            onClick={() => removeProgramYear(courseIndex, progIndex)}
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 italic">Please add at least one program and year level</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

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
              {isSubmitting ? `Adding ${isPair ? "Courses" : "Course"}...` : `Add ${isPair ? "Course Pair" : "Course"}`}
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
  departmentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) // Optional prop for when user has no department
};

export default AddCourseModal;