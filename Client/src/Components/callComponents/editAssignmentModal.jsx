import { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import axios from "../../axiosConfig";
import { useAuth } from '../authContext';

const EditAssignmentModal = ({
    assignment,
    onClose,
    onUpdate,
    schoolYears,
    semesters,
    courses: propCourses = []
}) => {
    const [formData, setFormData] = useState({
        professorId: "",
        schoolYear: "",
        semester: "",
        courseId: "",
        roomTypeId: ""
    });
    // Using a constant department id; you can pass this via props as needed
    const { user } = useAuth();
    const DEPARTMENT_ID = user.DepartmentId;
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Local state for courses if none are provided via props
    const [fetchedCourses, setFetchedCourses] = useState([]);
    const [coursesLoading, setCoursesLoading] = useState(false);
    const [coursesError, setCoursesError] = useState(null);
    const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

    // State for searchable course dropdown
    const [courseSearch, setCourseSearch] = useState("");
    const [showCourseDropdown, setShowCourseDropdown] = useState(false);
    const [selectedCourseName, setSelectedCourseName] = useState("");

    // State for searchable professor dropdown
    const [professorSearch, setProfessorSearch] = useState("");
    const [showProfessorDropdown, setShowProfessorDropdown] = useState(false);
    const [selectedProfessorName, setSelectedProfessorName] = useState("");

    // State for all professors
    const [allProfessors, setAllProfessors] = useState([]);
    const [loadingProfessors, setLoadingProfessors] = useState(true);
    const [errorProfessors, setErrorProfessors] = useState("");

    // New state for room types
    const [roomTypes, setRoomTypes] = useState([]);
    const [loadingRoomTypes, setLoadingRoomTypes] = useState(true);
    const [errorRoomTypes, setErrorRoomTypes] = useState("");

    // New state for overload warning similar to AddAssignationModal
    const [willOverload, setWillOverload] = useState(false);
    const [selectedCourseUnits, setSelectedCourseUnits] = useState(0);
    const [selectedProfessorLoad, setSelectedProfessorLoad] = useState(0);
    const [profStatuses, setProfStatuses] = useState([]);
    const [maxAllowedUnits, setMaxAllowedUnits] = useState(0);
    const [originalCourseId, setOriginalCourseId] = useState(null);
    const [originalCourseUnits, setOriginalCourseUnits] = useState(0);

    // Fetch all professors
    useEffect(() => {
        const fetchAllProfessors = async () => {
            try {
                const response = await axios.get('/prof/getAllProf');
                if (response.data.successful) {
                    setAllProfessors(response.data.data);

                    // Once professors are loaded, update formData with correct professorId
                    if (assignment && assignment.ProfessorId) {
                        setFormData(prev => ({
                            ...prev,
                            professorId: assignment.ProfessorId
                        }));

                        // Set the selected professor name for display
                        const professor = response.data.data.find(
                            p => String(p.id) === String(assignment.ProfessorId)
                        );
                        if (professor) {
                            setSelectedProfessorName(professor.Name);
                            setSelectedProfessorLoad(professor.Total_units || 0);
                        }
                    }
                } else {
                    setErrorProfessors(response.data.message || "Failed to fetch professors");
                }
            } catch (err) {
                setErrorProfessors(err.message || "An error occurred while fetching professors");
            } finally {
                setLoadingProfessors(false);
            }
        };
        fetchAllProfessors();
    }, [assignment]);

    // Fetch all room types
    useEffect(() => {
        const fetchRoomTypes = async () => {
            try {
                const response = await axios.get('/roomType/getAllRoomTypes');
                if (response.data.successful) {
                    setRoomTypes(response.data.data);

                    // Update formData with correct roomTypeId if available
                    if (assignment && assignment.RoomTypeId) {
                        setFormData(prev => ({
                            ...prev,
                            roomTypeId: assignment.RoomTypeId
                        }));
                    }
                } else {
                    setErrorRoomTypes(response.data.message || "Failed to fetch room types");
                }
            } catch (err) {
                setErrorRoomTypes(err.message || "An error occurred while fetching room types");
            } finally {
                setLoadingRoomTypes(false);
            }
        };
        fetchRoomTypes();
    }, [assignment]);

    // Fetch professor statuses for overload checking
    useEffect(() => {
        const fetchProfessorStatuses = async () => {
            try {
                const response = await axios.get("/profStatus/getAllStatus");
                if (response.data.successful) {
                    setProfStatuses(response.data.data);
                } else {
                    setError(response.data.message || "Failed to fetch professor statuses");
                }
            } catch (err) {
                setError(err.message || "An error occurred while fetching professor statuses");
            }
        };
        fetchProfessorStatuses();
    }, []);

    // Fetch courses from API if propCourses is empty
    useEffect(() => {
        if (!hasAttemptedFetch && (!propCourses || propCourses.length === 0)) {
            setCoursesLoading(true);
            setHasAttemptedFetch(true); // Mark that we've attempted to fetch

            axios
                .get('/course/getAllCourses')
                .then(response => {
                    if (response.data.successful) {
                        setFetchedCourses(response.data.data);

                        // Once courses are loaded, update formData with correct courseId
                        if (assignment && assignment.CourseId) {
                            setFormData(prev => ({
                                ...prev,
                                courseId: assignment.CourseId
                            }));
                            setOriginalCourseId(assignment.CourseId);

                            // Find course units for overload calculation
                            const assignedCourse = response.data.data.find(
                                c => String(c.id) === String(assignment.CourseId)
                            );
                            if (assignedCourse) {
                                setSelectedCourseUnits(assignedCourse.Units || 0);
                                setOriginalCourseUnits(assignedCourse.Units || 0);
                            }
                        }
                    } else {
                        setCoursesError(response.data.message || "Failed to fetch courses");
                    }
                })
                .catch(err => {
                    setCoursesError(err.message || "An error occurred while fetching courses");
                })
                .finally(() => {
                    setCoursesLoading(false);
                });
        }
    }, [propCourses, hasAttemptedFetch, assignment]);

    // Set initial form data when the assignment prop changes
    useEffect(() => {
        if (assignment) {
            setFormData({
                professorId: assignment.ProfessorId || "",
                schoolYear: assignment.School_Year || "",
                semester: assignment.Semester || "",
                courseId: assignment.CourseId || "",
                roomTypeId: assignment.RoomTypeId || ""
            });
            setOriginalCourseId(assignment.CourseId);

            // Set the selected course name for display
            if (assignment.Course) {
                setSelectedCourseName(`${assignment.Course.Code} - ${assignment.Course.Description}`);
                setSelectedCourseUnits(assignment.Course.Units || 0);
                setOriginalCourseUnits(assignment.Course.Units || 0);
            }

            // Set the selected professor name for display
            if (assignment.Professor && assignment.Professor.Name) {
                setSelectedProfessorName(assignment.Professor.Name);
            }
        }
    }, [assignment]);

    // Check for overload when course or professor changes
    useEffect(() => {
        if (formData.courseId && formData.professorId) {
            const availableCourses = (propCourses && propCourses.length > 0) ? propCourses : fetchedCourses;
            const selectedCourse = availableCourses.find(c => String(c.id) === String(formData.courseId));
            const selectedProfessor = allProfessors.find(p => String(p.id) === String(formData.professorId));

            if (selectedCourse && selectedProfessor) {
                const courseUnits = selectedCourse.Units || 0;
                let professorCurrentLoad = selectedProfessor.Total_units || 0;

                // If changing the course but keeping the same professor,
                // subtract the original course units to avoid double counting
                if (String(formData.professorId) === String(assignment?.ProfessorId) &&
                    String(formData.courseId) !== String(originalCourseId)) {
                    professorCurrentLoad -= originalCourseUnits;
                }

                setSelectedCourseUnits(courseUnits);
                setSelectedProfessorLoad(professorCurrentLoad);

                // Find the professor's status max units
                const professorStatus = profStatuses.find(status =>
                    status.Status === selectedProfessor.Status
                );

                const maxUnits = professorStatus ? professorStatus.Max_units : 24; // Default to 24 if not found
                setMaxAllowedUnits(maxUnits);

                // Check if this will cause an overload
                setWillOverload(professorCurrentLoad + courseUnits > maxUnits);
            }
        } else {
            setWillOverload(false);
        }
    }, [formData.courseId, formData.professorId, propCourses, fetchedCourses, allProfessors, profStatuses, assignment, originalCourseId, originalCourseUnits]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            const courseDropdown = document.getElementById("course-dropdown-container");
            if (courseDropdown && !courseDropdown.contains(event.target)) {
                setShowCourseDropdown(false);
            }

            const professorDropdown = document.getElementById("professor-dropdown-container");
            if (professorDropdown && !professorDropdown.contains(event.target)) {
                setShowProfessorDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Use the prop courses if available, otherwise use the fetched courses
    const availableCourses = (propCourses && propCourses.length > 0) ? propCourses : fetchedCourses;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Handle course search input change
    const handleCourseSearchChange = (e) => {
        setCourseSearch(e.target.value);
        setShowCourseDropdown(true);
    };

    // Select a course from the dropdown
    const handleCourseSelect = (course) => {
        setFormData({
            ...formData,
            courseId: course.id.toString(),
        });
        setSelectedCourseName(`${course.Code} - ${course.Description}${course.Units ? ` (${course.Units} units)` : ''}`);
        setCourseSearch("");
        setShowCourseDropdown(false);
    };

    // Handle professor search input change
    const handleProfessorSearchChange = (e) => {
        setProfessorSearch(e.target.value);
        setShowProfessorDropdown(true);
    };

    // Select a professor from the dropdown
    const handleProfessorSelect = (professor) => {
        setFormData({
            ...formData,
            professorId: professor.id.toString(),
        });
        setSelectedProfessorName(professor.Name);
        setProfessorSearch("");
        setShowProfessorDropdown(false);
    };

    // Filter courses based on search input
    const filteredCourses = availableCourses.filter(course =>
        course.Code?.toLowerCase().includes(courseSearch.toLowerCase()) ||
        course.Description?.toLowerCase().includes(courseSearch.toLowerCase())
    );

    // Filter professors based on search input
    const filteredProfessors = allProfessors.filter(professor =>
        professor.Name?.toLowerCase().includes(professorSearch.toLowerCase())
    );

    // Calculate new total load for display
    const newTotalLoad = selectedProfessorLoad + selectedCourseUnits;

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log(formData);
        if (!formData.professorId || !formData.schoolYear || !formData.semester) {
            setError('Please fill out all required fields.');
            return;
        }

        try {
            setSuccessMessage('Updating assignment... Please wait.');
            setError('');
            setIsLoading(true);

            // Build the update payload with CORRECTLY CASED field names to match backend expectations
            const updateData = {
                id: assignment.id,
                ProfessorId: Number(formData.professorId),
                DepartmentId: Number(assignment.DepartmentId || assignment.Department?.id || DEPARTMENT_ID),
                School_Year: formData.schoolYear,
                Semester: formData.semester,
                CourseId: Number(formData.courseId),
                RoomTypeId: formData.roomTypeId ? Number(formData.roomTypeId) : null
            };

            console.log("Sending update data:", updateData);

            const response = await axios.put(
                `/assignation/updateAssignation/${assignment.id}`,
                updateData,
                { headers: { 'Content-Type': 'application/json' } }
            );

            if (response.data.successful) {
                // Find updated course object if available
                let updatedCourse = assignment.Course;
                if (availableCourses && availableCourses.length > 0) {
                    const foundCourse = availableCourses.find(c => String(c.id) === String(formData.courseId));
                    if (foundCourse) {
                        updatedCourse = foundCourse;
                    }
                }

                // Find the selected room type
                const selectedRoomType = roomTypes.find(rt => String(rt.id) === String(formData.roomTypeId));

                // Create updated assignment object for the UI.
                const updatedAssignment = {
                    ...assignment,
                    ProfessorId: formData.professorId,
                    Professor: allProfessors.find(p => String(p.id) === String(formData.professorId)) || assignment.Professor,
                    CourseId: formData.courseId,
                    Course: updatedCourse,
                    School_Year: formData.schoolYear,
                    Semester: formData.semester,
                    RoomTypeId: formData.roomTypeId || null,
                    RoomType: selectedRoomType || null
                };

                // Update the parent component with the changes
                onUpdate(updatedAssignment);

                setSuccessMessage('Assignment updated successfully!');

                // Close the modal after a short delay so user can see success message
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                setError(response.data.message || "Failed to update assignment");
                setSuccessMessage('');
            }
        } catch (error) {
            console.error("Error response:", error.response?.data);
            setError(error.response?.data?.message || 'An error occurred');
            setSuccessMessage('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-customBlue1 p-8 rounded-lg w-11/12 md:w-1/3">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl text-white font-semibold mx-auto">Edit Course Assignment</h2>
                </div>
                <form className="space-y-10 px-20" onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block font-semibold text-white" htmlFor="professorSearch">
                            Professor
                        </label>
                        <div id="professor-dropdown-container" className="relative">
                            {loadingProfessors ? (
                                <p className="text-white">Loading professors...</p>
                            ) : errorProfessors ? (
                                <p className="text-red-500">{errorProfessors}</p>
                            ) : (
                                <div className="flex flex-col">
                                    <input
                                        type="text"
                                        id="professorSearch"
                                        placeholder="Search for a professor..."
                                        className={`w-full p-3 border rounded bg-customWhite ${willOverload ? 'border-yellow-500' : ''}`}
                                        value={professorSearch}
                                        onChange={handleProfessorSearchChange}
                                        onFocus={() => setShowProfessorDropdown(true)}
                                        disabled={isLoading}
                                    />

                                    {willOverload && formData.professorId && formData.courseId && (
                                        <div className="absolute top-0 right-0 h-full flex items-center pr-3">
                                            <div className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center" title={`Will exceed maximum load (${maxAllowedUnits} units)`}>
                                                !
                                            </div>
                                        </div>
                                    )}

                                    {selectedProfessorName && (
                                        <div className="mt-2 text-white bg-blue-600 rounded p-2 flex justify-between items-center">
                                            <span>{selectedProfessorName}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedProfessorName("");
                                                    setFormData({ ...formData, professorId: "" });
                                                }}
                                                className="text-white hover:text-gray-300"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}

                                    {showProfessorDropdown && (
                                        <div className="absolute mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto top-full">
                                            {filteredProfessors.length > 0 ? (
                                                filteredProfessors.map(professor => (
                                                    <div
                                                        key={professor.id}
                                                        className="p-2 hover:bg-gray-100 cursor-pointer"
                                                        onClick={() => handleProfessorSelect(professor)}
                                                    >
                                                        {professor.Name} {professor.Total_units ? `(Current Units: ${professor.Total_units})` : ''}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-2 text-gray-500">No professors found</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            <input
                                type="hidden"
                                name="professorId"
                                value={formData.professorId}
                            />
                        </div>

                        {/* Loading warning indicator */}
                        {willOverload && formData.professorId && formData.courseId && (
                            <div className="mt-2 bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span>
                                    This will overload the professor ({selectedProfessorLoad} + {selectedCourseUnits} = {newTotalLoad} units, exceeds {maxAllowedUnits})
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="mb-4">
                        <label className="block font-semibold text-white" htmlFor="courseSearch">
                            Course
                        </label>
                        <div id="course-dropdown-container" className="relative">
                            {coursesLoading ? (
                                <p className="text-white">Loading courses...</p>
                            ) : coursesError ? (
                                <p className="text-red-500">{coursesError}</p>
                            ) : (
                                <div className="flex flex-col">
                                    <input
                                        type="text"
                                        id="courseSearch"
                                        placeholder="Search for a course..."
                                        className="w-full p-3 border rounded bg-customWhite"
                                        value={courseSearch}
                                        onChange={handleCourseSearchChange}
                                        onFocus={() => setShowCourseDropdown(true)}
                                        disabled={isLoading}
                                    />
                                    {selectedCourseName && (
                                        <div className="mt-2 text-white bg-blue-600 rounded p-2 flex justify-between items-center">
                                            <span>{selectedCourseName}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCourseName("");
                                                    setFormData({ ...formData, courseId: "" });
                                                }}
                                                className="text-white hover:text-gray-300"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}

                                    {showCourseDropdown && (
                                        <div className="absolute mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto top-full">
                                            {filteredCourses.length > 0 ? (
                                                filteredCourses.map(course => (
                                                    <div
                                                        key={course.id}
                                                        className="p-2 hover:bg-gray-100 cursor-pointer"
                                                        onClick={() => handleCourseSelect(course)}
                                                    >
                                                        {course.Code} - {course.Description} {course.Units ? `(${course.Units} units)` : ''}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-2 text-gray-500">No courses found</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            <input
                                type="hidden"
                                name="courseId"
                                value={formData.courseId}
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block font-semibold text-white" htmlFor="roomTypeId">
                            Room Type
                        </label>
                        {loadingRoomTypes ? (
                            <p className="text-white">Loading room types...</p>
                        ) : errorRoomTypes ? (
                            <p className="text-red-500">{errorRoomTypes}</p>
                        ) : (
                            <select
                                id="roomTypeId"
                                name="roomTypeId"
                                value={formData.roomTypeId}
                                onChange={handleChange}
                                className="w-full p-8 border rounded bg-customWhite"
                            >
                                <option value="">Select Room Type (Optional)</option>
                                {roomTypes.map(roomType => (
                                    <option key={`roomType-${roomType.id}`} value={roomType.id}>
                                        {roomType.Type}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="mb-4">
                        <label className="block font-semibold text-white" htmlFor="schoolYear">
                            School Year
                        </label>
                        <select
                            id="schoolYear"
                            name="schoolYear"
                            value={formData.schoolYear}
                            onChange={handleChange}
                            className="w-full p-8 border rounded bg-customWhite"
                        >
                            <option value="">Select School Year</option>
                            {schoolYears && schoolYears.map(year => (
                                <option key={`year-${year}`} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block font-semibold text-white" htmlFor="semester">
                            Semester
                        </label>
                        <select
                            id="semester"
                            name="semester"
                            value={formData.semester}
                            onChange={handleChange}
                            className="w-full p-8 border rounded bg-customWhite"
                        >
                            <option value="">Select Semester</option>
                            {semesters && semesters.map(sem => (
                                <option key={`sem-${sem}`} value={sem}>
                                    {sem}
                                </option>
                            ))}
                        </select>
                    </div>
                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                    {successMessage && <p className="text-green-500 text-sm mb-4">{successMessage}</p>}
                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-500 text-white px-6 py-2 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-blue-500 text-white px-6 py-2 rounded-lg"
                        >
                            {isLoading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

EditAssignmentModal.propTypes = {
    assignment: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        ProfessorId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        Professor: PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            Name: PropTypes.string
        }),
        DepartmentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        Department: PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            Name: PropTypes.string
        }),
        CourseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        Course: PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            Code: PropTypes.string,
            Description: PropTypes.string,
            Units: PropTypes.number
        }),
        RoomTypeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        RoomType: PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            Type: PropTypes.string
        }),
        School_Year: PropTypes.string,
        Semester: PropTypes.string
    }).isRequired,
    onClose: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
    schoolYears: PropTypes.array.isRequired,
    semesters: PropTypes.array.isRequired,
    courses: PropTypes.array
};

export default EditAssignmentModal;