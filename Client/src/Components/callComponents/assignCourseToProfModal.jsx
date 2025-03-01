import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import AddBulk from "../Img/AddBulk.png";
import delBtn from "../Img/delBtn.png";

const AssignCourseToProfModal = ({ isOpen = false, onClose, selectedProfId = "", onAssign }) => {
  const [courses, setCourses] = useState([""]);
  const [professors, setProfessors] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedProfessor, setSelectedProfessor] = useState("");
  const [selectedCourses, setSelectedCourses] = useState([""]);
  const [error, setError] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      // Reset available courses
      setAvailableCourses([]);

      // Set the selected professor if selectedProfId is provided
      if (selectedProfId) {
        setSelectedProfessor(selectedProfId);
      } else {
        // Only reset if there's no selectedProfId
        setSelectedProfessor("");
      }

      // Reset error
      setError("");

      // Fetch professors
      axios
        .get("http://localhost:8080/prof/getAllProf")
        .then((response) => {
          if (response.data.successful) {
            setProfessors(response.data.data);
          }
        })
        .catch((error) => {
          console.error("Error fetching professors:", error);
          setError("Failed to fetch professors");
        });
    } else {
      // Reset form when modal closes
      setCourses([""]);
      setSelectedCourses([""]);
    }
  }, [isOpen, selectedProfId]);

  // When a professor is selected, fetch available courses for that professor
  useEffect(() => {
    if (isOpen && selectedProfessor) {
      fetchAvailableCoursesForProfessor(selectedProfessor);
    }
  }, [selectedProfessor, isOpen]);

  const fetchAllCourses = () => {
    axios
      .get("http://localhost:8080/course/getAllCourses")
      .then((response) => {
        if (response.data.successful) {
          setAvailableCourses(response.data.data);
        }
      })
      .catch((error) => {
        console.error("Error fetching courses:", error);
        setError("Failed to fetch courses");
      });
  };

  const fetchAvailableCoursesForProfessor = (profId) => {
    setLoadingCourses(true);
    setError("");

    // First, get all courses
    axios
      .get("http://localhost:8080/course/getAllCourses")
      .then((allCoursesResponse) => {
        if (allCoursesResponse.data.successful) {
          const allCourses = allCoursesResponse.data.data;

          // Then, get the professor's assigned courses using the existing endpoint
          axios
            .get(`http://localhost:8080/course/getCoursesByProf/${profId}`)
            .then((assignedResponse) => {
              if (assignedResponse.data.successful) {
                const assignedCourses = assignedResponse.data.data || [];

                // Filter out already assigned courses
                const assignedCourseIds = assignedCourses.map(course => course.id);
                const filteredCourses = allCourses.filter(
                  course => !assignedCourseIds.includes(course.id)
                );

                setAvailableCourses(filteredCourses);
                setLoadingCourses(false);
              }
            })
            .catch((error) => {
              console.error("Error fetching assigned courses:", error);
              setError("Failed to fetch assigned courses");
              setLoadingCourses(false);
              // If there's an error fetching assigned courses, just show all courses
              setAvailableCourses(allCourses);
            });
        }
      })
      .catch((error) => {
        console.error("Error fetching courses:", error);
        setError("Failed to fetch courses");
        setLoadingCourses(false);
      });
  };

  const handleAddBulk = (e) => {
    e.preventDefault();
    setCourses([...courses, ""]);
    setSelectedCourses([...selectedCourses, ""]);
  };

  const handleRemoveCourse = (index) => {
    const updatedCourses = courses.filter((_, i) => i !== index);
    const updatedSelectedCourses = selectedCourses.filter((_, i) => i !== index);
    setCourses(updatedCourses);
    setSelectedCourses(updatedSelectedCourses);
  };

  const handleCourseSelection = (index, value) => {
    const updatedSelectedCourses = [...selectedCourses];
    updatedSelectedCourses[index] = value;
    setSelectedCourses(updatedSelectedCourses);
  };

  const handleProfessorChange = (profId) => {
    setSelectedProfessor(profId);
    // Reset course selections when professor changes
    setCourses([""]);
    setSelectedCourses([""]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate selections
    if (!selectedProfessor) {
      setError("Please select a professor");
      return;
    }

    if (selectedCourses.some(course => !course)) {
      setError("Please select all courses");
      return;
    }

    // Remove duplicate courses
    const uniqueCourses = [...new Set(selectedCourses.filter(Boolean))];

    try {
      const response = await axios.post("http://localhost:8080/prof/addCourseProf", {
        courseIds: uniqueCourses, // Send selected courses as an array
        profId: selectedProfessor  // Send professor ID
      });

      if (response.data.successful) {
        // Call the onAssign callback to refresh the assigned courses
        if (onAssign) {
          onAssign();
        }

        // Reset form and close modal
        setCourses([""]);
        setSelectedCourses([""]);
        setError("");
        onClose();
      } else {
        setError(response.data.message || "Failed to assign courses");
      }
    } catch (error) {
      console.error("Error assigning courses:", error);
      setError(error.response?.data?.message || "Failed to assign courses");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-customBlue1 p-8 rounded-lg w-11/12 md:w-1/3">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl text-white font-semibold mx-auto">Assign Course</h2>
          <button className="text-xl text-white hover:text-black" onClick={onClose}>
            &times;
          </button>
        </div>

        <form className="mt-6" onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block font-semibold text-white mb-2">Professor:</label>
            <select
              className="border rounded w-full py-2 px-4 text-gray-700"
              value={selectedProfessor}
              onChange={(e) => handleProfessorChange(e.target.value)}
              disabled={selectedProfId}
            >
              <option value="" disabled>
                -- Select Professor --
              </option>
              {professors.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.Name}
                </option>
              ))}
            </select>
          </div>

          {loadingCourses ? (
            <div className="text-white text-center py-4">Loading available courses...</div>
          ) : (
            availableCourses.length === 0 && selectedProfessor ? (
              <div className="text-white text-center py-4">
                No more courses available to assign to this professor.
              </div>
            ) : (
              courses.map((_, index) => (
                <div key={index} className="mb-6">
                  <label className="block font-semibold text-white mb-2">Course:</label>
                  <div className="flex items-center gap-2">
                    <select
                      className="border rounded w-full py-2 px-4 text-gray-700"
                      value={selectedCourses[index]}
                      onChange={(e) => handleCourseSelection(index, e.target.value)}
                      disabled={!selectedProfessor || loadingCourses}
                    >
                      <option value="" disabled>
                        -- Select Course --
                      </option>
                      {availableCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.Code} - {course.Description}
                        </option>
                      ))}
                    </select>
                    {index === courses.length - 1 && availableCourses.length > 0 && (
                      <button
                        onClick={handleAddBulk}
                        className="ml-2"
                        disabled={!selectedProfessor || loadingCourses}
                        type="button"
                      >
                        <img src={AddBulk} alt="Add Bulk" className="h-10 w-10 cursor-pointer hover:scale-110" />
                      </button>
                    )}
                    {courses.length > 1 && (
                      <button
                        onClick={() => handleRemoveCourse(index)}
                        className="ml-2"
                        type="button"
                      >
                        <img src={delBtn} alt="Remove Course" className="h-10 w-10 cursor-pointer hover:scale-110" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )
          )}

          <div className="flex justify-end mt-4">
            <button
              className="bg-customLightBlue2 hover:bg-blue-300 text-gray-600 font-bold py-2 px-6 rounded"
              type="submit"
              disabled={!selectedProfessor || loadingCourses || availableCourses.length === 0}
            >
              Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

AssignCourseToProfModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  selectedProfId: PropTypes.string,
  onAssign: PropTypes.func
};

export default AssignCourseToProfModal;