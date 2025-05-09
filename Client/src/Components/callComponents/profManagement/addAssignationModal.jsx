import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "../../../axiosConfig";
import { useAuth } from '../../authContext';
import { X, Check, AlertCircle, Calendar } from "lucide-react";

const AddAssignationModal = ({ isOpen, onClose, onAssignationAdded, professorId, schoolYearId }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        Semester: "",
        CourseId: "",
        ProfessorId: professorId ? professorId.toString() : "",
        DepartmentId: user.DepartmentId,
        SchoolYearId: schoolYearId?.toString() || ""
    });

    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [warningMessage, setWarningMessage] = useState("");
    const [courses, setCourses] = useState([]);
    const [filteredAvailableCourses, setFilteredAvailableCourses] = useState([]);
    const [professors, setProfessors] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [courseSearch, setCourseSearch] = useState("");
    const [showCourseDropdown, setShowCourseDropdown] = useState(false);
    const [selectedCourseName, setSelectedCourseName] = useState("");
    const [willOverload, setWillOverload] = useState(false);
    const [selectedCourseUnits, setSelectedCourseUnits] = useState(0);
    const [selectedProfessorLoad, setSelectedProfessorLoad] = useState(0);
    const [profStatuses, setProfStatuses] = useState([]);
    const [maxAllowedUnits, setMaxAllowedUnits] = useState(0);
    const [departmentAssignations, setDepartmentAssignations] = useState([]);
    const [sections, setSections] = useState([]);
    const [filteredSections, setFilteredSections] = useState([]);
    const [selectedSectionIds, setSelectedSectionIds] = useState([]);

    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                try {
                    const assignationsResponse = await axios.get(`/assignation/getAllAssignationsByDept/${user.DepartmentId}`);
                    if (assignationsResponse.status === 200) {
                        setDepartmentAssignations(assignationsResponse.data.data);
                    } else {
                        setErrorMessage(assignationsResponse.data.message || "Failed to fetch assignations.");
                        return;
                    }

                    const coursesResponse = await axios.get(`course/getCoursesByDept/${user.DepartmentId}`)
                    if (coursesResponse.status === 200) {
                        setCourses(coursesResponse.data.data);
                    } else {
                        setErrorMessage(coursesResponse.data.message || "Failed to fetch courses.");
                        return;
                    }

                    const professorsResponse = await axios.get("/prof/getAllProf");
                    if (professorsResponse.status === 200) {
                        setProfessors(professorsResponse.data.data);
                    } else {
                        setErrorMessage(professorsResponse.data.message || "Failed to fetch professors.");
                        return;
                    }

                    const statusesResponse = await axios.get("/profStatus/getAllStatus");
                    if (statusesResponse.status === 200) {
                        setProfStatuses(statusesResponse.data.data);
                    } else {
                        setErrorMessage(statusesResponse.data.message || "Failed to fetch professor statuses.");
                    }

                    const sectionsResponse = await axios.get("/progYrSec/getAllProgYrSec");
                    if (sectionsResponse.status === 200) {
                        setSections(sectionsResponse.data.data);
                    } else {
                        setErrorMessage(sectionsResponse.data.message || "Failed to fetch sections.");
                    }
                } catch (error) {
                    setErrorMessage(
                        error.response?.data?.message ||
                        error.message ||
                        "An error occurred while fetching data."
                    );
                }
            };

            fetchData();
        }
    }, [isOpen, user.DepartmentId]);

    useEffect(() => {
        if (courses.length > 0 && formData.ProfessorId && formData.Semester) {
            const semesterAsNumber = parseInt(formData.Semester, 10);

            const semesterCourses = courses.filter(course => {
                // Tutorial courses should appear in both semesters
                if (course.isTutorial) {
                    return true;
                }
                
                // Regular courses are filtered by semester
                return course.CourseProgs && course.CourseProgs.some(
                    prog => prog.Semester === semesterAsNumber
                );
            });

            setFilteredAvailableCourses(semesterCourses);
        } else {
            setFilteredAvailableCourses([]);
        }
    }, [courses, formData.ProfessorId, formData.Semester]);

    // Filter sections based on course program and check if already assigned
    useEffect(() => {
        if (formData.CourseId && sections.length > 0 && courses.length > 0) {
            const selectedCourse = courses.find(c => c.id === parseInt(formData.CourseId, 10));
            
            if (selectedCourse && selectedCourse.CourseProgs) {
                // Get all valid program-year combinations for this course
                const validProgramYears = selectedCourse.CourseProgs.map(cp => ({
                    programId: cp.ProgramId,
                    year: cp.Year
                }));
                
                // Filter sections that match the course programs and year
                let courseSections = sections.filter(section => 
                    validProgramYears.some(validPY => 
                        section.Program?.id === validPY.programId && 
                        section.Year === validPY.year
                    )
                );
                
                // Further filter out sections that are already assigned to this professor, course and school year
                if (departmentAssignations.length > 0 && formData.ProfessorId && schoolYearId) {
                    // Find existing assignations for this professor, course and school year
                    const existingAssignations = departmentAssignations.filter(assignation => 
                        assignation.ProfessorId === parseInt(formData.ProfessorId, 10) && 
                        assignation.CourseId === parseInt(formData.CourseId, 10) && 
                        assignation.SchoolYearId === schoolYearId &&
                        assignation.Semester === parseInt(formData.Semester, 10)
                    );
                    
                    // Get all section IDs that are already assigned
                    const alreadyAssignedSectionIds = [];
                    existingAssignations.forEach(assignation => {
                        if (assignation.ProgYrSecs) {
                            assignation.ProgYrSecs.forEach(section => {
                                alreadyAssignedSectionIds.push(section.id);
                            });
                        }
                    });
                    
                    // Filter out already assigned sections
                    courseSections = courseSections.filter(section => 
                        !alreadyAssignedSectionIds.includes(section.id)
                    );
                }
                
                setFilteredSections(courseSections);
            } else {
                setFilteredSections([]);
            }
        } else {
            setFilteredSections([]);
        }
    }, [formData.CourseId, formData.ProfessorId, formData.Semester, sections, courses, departmentAssignations, schoolYearId]);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                Semester: "",
                CourseId: "",
                ProfessorId: professorId ? professorId.toString() : "",
                DepartmentId: user.DepartmentId,
                SchoolYearId: schoolYearId?.toString() || ""
            });
            setErrorMessage("");
            setSuccessMessage("");
            setWarningMessage("");
            setCourseSearch("");
            setSelectedCourseName("");
            setWillOverload(false);
            setSelectedCourseUnits(0);
            setSelectedProfessorLoad(0);
            setMaxAllowedUnits(0);
            setSelectedSectionIds([]);
        }
    }, [isOpen, user.DepartmentId, professorId, schoolYearId]);

    useEffect(() => {
        if (formData.CourseId && formData.Semester) {
            const courseStillAvailable = filteredAvailableCourses.some(
                course => course.id === parseInt(formData.CourseId, 10)
            );
            
            if (!courseStillAvailable) {
                setFormData(prev => ({
                    ...prev,
                    CourseId: ""
                }));
                setSelectedCourseName("");
            }
        }
    }, [formData.Semester, filteredAvailableCourses, formData.CourseId]);

    useEffect(() => {
        if (formData.CourseId && formData.ProfessorId) {
            const selectedCourse = courses.find(c => c.id === parseInt(formData.CourseId, 10));
            const selectedProfessor = professors.find(p => p.id === parseInt(formData.ProfessorId, 10));

            if (selectedCourse && selectedProfessor) {
                const courseUnits = selectedCourse.Units || 0;
                const professorCurrentLoad = selectedProfessor.Total_units || 0;

                setSelectedCourseUnits(courseUnits);
                setSelectedProfessorLoad(professorCurrentLoad);

                const professorStatus = profStatuses.find(status =>
                    status.Status === selectedProfessor.Status
                );

                const maxUnits = professorStatus ? professorStatus.Max_units : 24;
                setMaxAllowedUnits(maxUnits);

                setWillOverload(professorCurrentLoad + courseUnits > maxUnits);
            }
        } else {
            setWillOverload(false);
            setSelectedCourseUnits(0);
            setSelectedProfessorLoad(0);
            setMaxAllowedUnits(0);
        }
    }, [formData.CourseId, formData.ProfessorId, courses, professors, profStatuses]);

    useEffect(() => {
        if (formData.CourseId && formData.Semester) {
            setSelectedSectionIds([]);
        }
    }, [formData.CourseId, formData.Semester]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            const courseDropdown = document.getElementById("course-dropdown-container");
            if (courseDropdown && !courseDropdown.contains(event.target)) {
                setShowCourseDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!isOpen) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        if (name === "Semester") {
            setFormData({
                ...formData,
                [name]: value,
                CourseId: ""
            });
            setSelectedCourseName("");
        } else {
            setFormData({
                ...formData,
                [name]: value,
            });
        }
    };

    const handleCourseSearchChange = (e) => {
        setCourseSearch(e.target.value);
        setShowCourseDropdown(true);
    };

    const handleCourseSelect = (course) => {
        setFormData({
            ...formData,
            CourseId: course.id.toString(),
        });
        setSelectedCourseName(`${course.Code} - ${course.Description} (${course.Units} units)`);
        setCourseSearch("");
        setShowCourseDropdown(false);
    };

    const handleSectionToggle = (sectionId) => {
        setSelectedSectionIds(prev => {
            if (prev.includes(sectionId)) {
                return prev.filter(id => id !== sectionId);
            } else {
                return [...prev, sectionId];
            }
        });
    };

    const filteredCourses = filteredAvailableCourses.filter(course =>
        course.Code.toLowerCase().includes(courseSearch.toLowerCase()) ||
        course.Description.toLowerCase().includes(courseSearch.toLowerCase())
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");
        setWarningMessage("");
        setIsSubmitting(true);

        const submissionData = {
            SchoolYearId: schoolYearId,
            CourseId: parseInt(formData.CourseId, 10),
            ProfessorId: formData.ProfessorId ? parseInt(formData.ProfessorId, 10) : null,
            DepartmentId: parseInt(formData.DepartmentId, 10),
            SectionIds: selectedSectionIds.length > 0 ? selectedSectionIds : null,
            Semester: parseInt(formData.Semester, 10)
        };

        try {
            
            const response = await axios.post(
                "/assignation/addAssignation",
                submissionData
            );

            if (response.data.successful) {
                setSuccessMessage(response.data.message);
                
                if (response.data.warning) {
                    setWarningMessage(response.data.warning);
                }

                if (onAssignationAdded && response.data.data) {
                    onAssignationAdded(response.data.data);
                }

                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                setErrorMessage(response.data.message || "Failed to add assignation.");
                setTimeout(() => {
                    setErrorMessage("");
                }, 3000);
            }
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ||
                error.message ||
                "Failed to add assignation."
            );
            
        } finally {
            setIsSubmitting(false);
        }
    };

    const newTotalLoad = selectedProfessorLoad + selectedCourseUnits;
    const isCourseSelectionDisabled = !formData.Semester;

    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex justify-center items-center z-50 backdrop-filter backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-md overflow-hidden transform transition-all">
                <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl text-white font-semibold">Add Course Assignation</h2>
                    <button
                        className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors duration-200"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form className="p-6 space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Semester <span className="text-red-500">*</span></label>
                        <select
                            name="Semester"
                            className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                            value={formData.Semester}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="" disabled>Select Semester</option>
                            <option value="1">1st Semester</option>
                            <option value="2">2nd Semester</option>
                        </select>
                        {!formData.Semester && (
                            <p className="text-xs text-blue-600 mt-1">
                                <Calendar size={14} className="inline mr-1" />
                                Please select a semester first to filter available courses
                            </p>
                        )}
                    </div>

                    <div id="course-dropdown-container" className="space-y-1.5 relative">
                        <label className="block text-sm font-medium text-gray-700">Course <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            placeholder={isCourseSelectionDisabled ? "Select a semester first" : "Search for a course..."}
                            className={`w-full p-2.5 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${
                                isCourseSelectionDisabled ? "bg-gray-100 border-gray-200 cursor-not-allowed" : "border-gray-300"
                            }`}
                            value={courseSearch}
                            onChange={handleCourseSearchChange}
                            onFocus={() => {
                                if (!isCourseSelectionDisabled) {
                                    setShowCourseDropdown(true);
                                }
                            }}
                            disabled={isCourseSelectionDisabled}
                        />

                        {selectedCourseName && (
                            <div className="mt-2 text-white bg-blue-600 rounded p-2 flex justify-between items-center">
                                <span>{selectedCourseName}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedCourseName("");
                                        setFormData({ ...formData, CourseId: "" });
                                    }}
                                    className="text-white hover:text-gray-300"
                                >
                                    ×
                                </button>
                            </div>
                        )}

                        {showCourseDropdown && !isCourseSelectionDisabled && (
                            <div className="absolute mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                                {filteredCourses.length > 0 ? (
                                    filteredCourses.map(course => (
                                        <div
                                            key={course.id}
                                            className="p-2 hover:bg-gray-100 cursor-pointer"
                                            onClick={() => handleCourseSelect(course)}
                                        >
                                            {course.Code} - {course.Description} ({course.Units} units)
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-2 text-gray-500">
                                        {formData.Semester
                                            ? "No available courses for this semester"
                                            : "Please select a semester first"}
                                    </div>
                                )}
                            </div>
                        )}

                        <input
                            type="hidden"
                            name="CourseId"
                            value={formData.CourseId}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Professor <span className="text-red-500">*</span></label>
                        <select
                            name="ProfessorId"
                            className={`w-full p-2.5 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${willOverload ? 'border-yellow-500' : 'border-gray-300'}`}
                            value={formData.ProfessorId}
                            onChange={handleInputChange}
                            required
                            disabled={professorId !== undefined}
                        >
                            <option value="" disabled>
                                Select Professor
                            </option>
                            {professors.map((professor) => (
                                <option key={professor.id} value={professor.id}>
                                    {professor.Name} ({professor.Status})
                                </option>
                            ))}
                        </select>

                        {willOverload && formData.ProfessorId && formData.CourseId && (
                            <div className="mt-2 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded flex items-start space-x-2">
                                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                                <p className="text-sm">
                                    This will overload the professor ({selectedProfessorLoad} + {selectedCourseUnits} = {newTotalLoad} units, exceeds {maxAllowedUnits})
                                </p>
                            </div>
                        )}
                    </div>

                    {formData.CourseId && (
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700">Sections</label>
                            
                            <div className="border border-gray-300 rounded p-2">
                                {filteredSections.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {filteredSections.map(section => (
                                            <div key={section.id} className="flex items-center p-1">
                                                <input
                                                    type="checkbox"
                                                    id={`section-${section.id}`}
                                                    value={section.id}
                                                    checked={selectedSectionIds.includes(section.id)}
                                                    onChange={() => handleSectionToggle(section.id)}
                                                    className="mr-2"
                                                />
                                                <label htmlFor={`section-${section.id}`} className="text-sm truncate">
                                                    {section.Program?.Code || "N/A"} {section.Year}-{section.Section}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 p-1">
                                        {formData.CourseId 
                                            ? "No available sections for this course" 
                                            : "Select a course to see available sections"}
                                    </p>
                                )}
                            </div>
                            
                            {selectedSectionIds.length > 0 && (
                                <p className="text-sm text-blue-600 mt-1">
                                    {selectedSectionIds.length} section(s) selected
                                </p>
                            )}
                            
                            <p className="text-xs text-gray-500 mt-1">
                                Leave empty for tutorial courses or courses without specific sections
                            </p>
                        </div>
                    )}

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

                    {warningMessage && (
                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded flex items-start space-x-2">
                            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                            <p className="text-sm">{warningMessage}</p>
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            className="px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded hover:bg-gray-200 transition duration-200"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-4 py-2.5 bg-blue-600 text-white font-medium rounded shadow-md hover:bg-blue-700 transition duration-200 flex items-center space-x-2 ${isSubmitting ? "opacity-75 cursor-not-allowed" : ""}`}
                        >
                            {isSubmitting ? "Adding..." : "Add Assignation"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

AddAssignationModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onAssignationAdded: PropTypes.func,
    professorId: PropTypes.number,
    schoolYearId: PropTypes.number
};

export default AddAssignationModal;