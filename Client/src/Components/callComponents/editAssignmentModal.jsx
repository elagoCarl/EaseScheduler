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
        courseId: ""
    });
    // Using a constant department id; you can pass this via props as needed
    const { user } = useAuth();
    console.log("UUUUUUUUUUUUUSSSSERR: ", user);
    console.log("useridDDDDDDDDDDDDDDept: ", user.DepartmentId);
    const DEPARTMENT_ID = user.DepartmentId;
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Local state for courses if none are provided via props
    const [fetchedCourses, setFetchedCourses] = useState([]);
    const [coursesLoading, setCoursesLoading] = useState(false);
    const [coursesError, setCoursesError] = useState(null);
    const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

    // New state for all professors from getAllProfs
    const [allProfessors, setAllProfessors] = useState([]);
    const [loadingProfessors, setLoadingProfessors] = useState(true);
    const [errorProfessors, setErrorProfessors] = useState("");

    // Fetch all professors from getAllProfs API
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
                courseId: assignment.CourseId || ""
            });
        }
    }, [assignment]);

    // Use the prop courses if available, otherwise use the fetched courses
    const availableCourses = (propCourses && propCourses.length > 0) ? propCourses : fetchedCourses;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

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
                CourseId: Number(formData.courseId)
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

                // Create updated assignment object for the UI.
                const updatedAssignment = {
                    ...assignment,
                    ProfessorId: formData.professorId,
                    Professor: allProfessors.find(p => String(p.id) === String(formData.professorId)) || assignment.Professor,
                    CourseId: formData.courseId,
                    Course: updatedCourse,
                    School_Year: formData.schoolYear,
                    Semester: formData.semester,
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
                        <label className="block font-semibold text-white" htmlFor="professorId">
                            Professor
                        </label>
                        <select
                            id="professorId"
                            name="professorId"
                            value={formData.professorId}
                            onChange={handleChange}
                            className="w-full p-8 border rounded bg-customWhite"
                        >
                            <option value="">Select Professor</option>
                            {loadingProfessors ? (
                                <option disabled>Loading professors...</option>
                            ) : errorProfessors ? (
                                <option disabled>{errorProfessors}</option>
                            ) : (
                                allProfessors.map((prof) => (
                                    <option key={`prof-${prof.id}`} value={prof.id}>
                                        {prof.Name}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="block font-semibold text-white" htmlFor="courseId">
                            Course
                        </label>
                        {coursesLoading ? (
                            <p className="text-white">Loading courses...</p>
                        ) : coursesError ? (
                            <p className="text-red-500">{coursesError}</p>
                        ) : (
                            <select
                                id="courseId"
                                name="courseId"
                                value={formData.courseId}
                                onChange={handleChange}
                                className="w-full p-8 border rounded bg-customWhite"
                            >
                                <option value="">Select Course</option>
                                {availableCourses.map(course => (
                                    <option key={`course-${course.id}`} value={course.id}>
                                        {course.Code} - {course.Description}
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
            Description: PropTypes.string
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