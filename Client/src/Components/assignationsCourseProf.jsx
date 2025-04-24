import { useState, useEffect } from "react";
import axios from "../axiosConfig.js";
import Background from "./Img/5.jpg";
import Sidebar from "./callComponents/sideBar.jsx";
import TopMenu from "./callComponents/topMenu.jsx";
import profV from "./Img/profV.png";
import addBtn from "./Img/addBtn.png";
import editBtn from "./Img/editBtn.png";
import delBtn from "./Img/delBtn.png";
import AddAssignationModal from "./callComponents/addAssignationModal.jsx";
import EditAssignmentModal from "./callComponents/editAssignmentModal.jsx";
import DeleteWarning from "./callComponents/deleteWarning.jsx";
import { useAuth } from '../Components/authContext.jsx';

const AssignationsCourseProf = () => {
    const { user } = useAuth();
    console.log("UUUUUUUUUUUUUSSSSERR: ", user);
    console.log("useridDDDDDDDDDDDDDDept: ", user.DepartmentId);
    const DEPARTMENT_ID = user.DepartmentId;

    const [department, setDepartment] = useState(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [filters, setFilters] = useState({
        professor: "",
        schoolYear: "",
        semester: "",
        roomType: "" // New filter for room type
    });
    const [modals, setModals] = useState({
        add: false,
        edit: false,
        delete: false
    });
    const [checkboxes, setCheckboxes] = useState([]);
    const [isAllChecked, setAllChecked] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);

    // State for assignations and filter values
    const [assignedCourses, setAssignedCourses] = useState([]);
    const [professors, setProfessors] = useState([]); // for the dropdown filter
    const [semesters, setSemesters] = useState([]);
    const [schoolYears, setSchoolYears] = useState([]);
    const [roomTypes, setRoomTypes] = useState([]); // New state for room types
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [warningMessage, setWarningMessage] = useState(null);

    // State for detailed professor info (from getProf)
    // This will be a mapping: { professorId: { ...professorData } }
    const [professorDetails, setProfessorDetails] = useState({});

    // State for detailed course info (from getCourse)
    // Mapping: { courseId: { ...courseData } }
    const [courseDetails, setCourseDetails] = useState({});

    // State for room type details
    // Mapping: { roomTypeId: { ...roomTypeData } }
    const [roomTypeDetails, setRoomTypeDetails] = useState({});

    // Fetch the current department using the getDept API
    useEffect(() => {
        const fetchDepartment = async () => {
            try {
                const response = await axios.get(`/dept/getDept/${DEPARTMENT_ID}`);
                if (response.data.successful) {
                    setDepartment(response.data.data);
                } else {
                    console.error("Failed to fetch department.");
                }
            } catch (err) {
                console.error("Error fetching department:", err);
            }
        };
        fetchDepartment();
    }, [DEPARTMENT_ID]);

    useEffect(() => {
        let timer;
        if (warningMessage) {
          timer = setTimeout(() => {
            setWarningMessage(null);
          }, 3000); // Warning disappears after 3 seconds
        }
        return () => clearTimeout(timer);
      }, [warningMessage]);

    // Fetch all room types
    useEffect(() => {
        const fetchRoomTypes = async () => {
            try {
                const response = await axios.get('/roomType/getAllRoomTypes');
                if (response.data.successful) {
                    const roomTypesData = response.data.data;
                    setRoomTypes(roomTypesData);

                    // Create a mapping for quick access
                    const roomTypeMap = {};
                    roomTypesData.forEach(type => {
                        roomTypeMap[type.id] = type;
                    });
                    setRoomTypeDetails(roomTypeMap);
                }
            } catch (err) {
                console.error("Error fetching room types:", err);
            }
        };

        fetchRoomTypes();
    }, []);

    // Fetch assignations for the department using getAllAssignationsByDept
    useEffect(() => {
        const fetchAssignations = async () => {
            try {
                const response = await axios.get(`/assignation/getAllAssignationsByDept/${DEPARTMENT_ID}`);
                if (response.data.successful) {
                    const data = response.data.data;
                    setAssignedCourses(data);
                    setSemesters([...new Set(data.map(a => a.Semester))]);
                    setSchoolYears([...new Set(data.map(a => a.School_Year))]);
                    setCheckboxes(new Array(data.length).fill(false));
                }
            } catch (err) {
                console.error("Error fetching assignations:", err);
                setError("Failed to fetch assigned courses");
            } finally {
                setLoading(false);
            }
        };

        fetchAssignations();
    }, [DEPARTMENT_ID]);

    // Once assignations are loaded, fetch detailed professor info via getProf
    useEffect(() => {
        const fetchProfessorDetails = async () => {
            // Build a unique list of professor IDs from assignations using ProfessorId
            const professorIds = [
                ...new Set(
                    assignedCourses.map(a => a.ProfessorId).filter(id => id != null)
                )
            ];

            try {
                const responses = await Promise.all(
                    professorIds.map(id =>
                        axios.get(`/prof/getProf/${id}`)
                    )
                );
                const detailsMap = {};
                responses.forEach(response => {
                    if (response.data.successful) {
                        const prof = response.data.data;
                        detailsMap[prof.id] = prof;
                    }
                });
                setProfessorDetails(detailsMap);
            } catch (err) {
                console.error("Error fetching professor details:", err);
            }
        };

        if (assignedCourses.length > 0) {
            fetchProfessorDetails();
        }
    }, [assignedCourses]);

    // Once assignations are loaded, fetch detailed course info via getCourse
    useEffect(() => {
        const fetchCourseDetails = async () => {
            // Build a unique list of course IDs from assignations using CourseId
            const courseIds = [
                ...new Set(
                    assignedCourses.map(a => a.CourseId).filter(id => id != null)
                )
            ];

            try {
                const responses = await Promise.all(
                    courseIds.map(id =>
                        axios.get(`/course/getCourse/${id}`)
                    )
                );
                const detailsMap = {};
                responses.forEach(response => {
                    if (response.data.successful) {
                        const course = response.data.data;
                        detailsMap[course.id] = course;
                    }
                });
                setCourseDetails(detailsMap);
            } catch (err) {
                console.error("Error fetching course details:", err);
            }
        };

        if (assignedCourses.length > 0) {
            fetchCourseDetails();
        }
    }, [assignedCourses]);

    // Update professor filter options once detailed professor info is available
    useEffect(() => {
        // professorDetails is an object; we take its values to create filter options
        const uniqueProfessors = Object.values(professorDetails);
        setProfessors(uniqueProfessors);
    }, [professorDetails]);

    const handleEditClick = (assignmentId) => {
        const assignment = assignedCourses.find(a => a.id === assignmentId);
        if (assignment) {
            setSelectedAssignment(assignment);
            toggleModal('edit', true);
        }
    };

    const handleUpdateAssignment = (updatedAssignment) => {
        setAssignedCourses(prev =>
            prev.map(assignment => (assignment.id === updatedAssignment.id ? updatedAssignment : assignment))
        );
        toggleModal('edit', false);
    };

    const handleCheckboxChange = (index, isMaster = false) => {
        if (isMaster) {
            const newState = !isAllChecked;
            setAllChecked(newState);
            setCheckboxes(new Array(assignedCourses.length).fill(newState));
            return;
        }

        const updatedCheckboxes = [...checkboxes];
        updatedCheckboxes[index] = !updatedCheckboxes[index];
        setCheckboxes(updatedCheckboxes);
        setAllChecked(updatedCheckboxes.every(isChecked => isChecked));
    };

    const handleConfirmDelete = async () => {
        try {
            const selectedCourseIds = assignedCourses
                .filter((_, index) => checkboxes[index])
                .map(course => course.id);

            if (selectedCourseIds.length === 0) {
                console.error("No courses selected for deletion");
                return;
            }

            // Track deletion results
            const results = [];

            // Delete each assignation individually using the backend API
            for (const id of selectedCourseIds) {
                try {
                    const response = await axios.delete(`/assignation/deleteAssignation/${id}`);
                    results.push({
                        id,
                        success: response.data.successful,
                        message: response.data.message
                    });
                } catch (err) {
                    results.push({
                        id,
                        success: false,
                        message: err.response?.data?.message || "Failed to delete"
                    });
                }
            }

            // Check if any deletions failed
            const failedDeletions = results.filter(result => !result.success);
            if (failedDeletions.length > 0) {
                console.error("Some deletions failed:", failedDeletions);
                // Optional: Display error message to user
            }

            // Refresh the assignations list
            const response = await axios.get(`/assignation/getAllAssignationsByDept/${DEPARTMENT_ID}`);
            if (response.data.successful) {
                setAssignedCourses(response.data.data);
                setCheckboxes(new Array(response.data.data.length).fill(false));
                setAllChecked(false);
            }

            toggleModal('delete', false);
        } catch (error) {
            console.error("Error processing deletions:", error);
        }
    };

    const handleDeleteClick = () => {
        if (!checkboxes.some(Boolean)) {
          setWarningMessage("Please select at least one course to delete");
        } else {
          toggleModal('delete', true);
        }
      };

    const toggleModal = (modalName, isOpen) => {
        setModals(prev => ({ ...prev, [modalName]: isOpen }));
    };

    const handleFilterChange = (filterName, value) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    };

    // Filter assignations based on selected criteria
    const filteredCourses = assignedCourses.filter(course => {
        // For professor filter, compare against the professor's name from professorDetails
        if (filters.professor) {
            const profDetail = professorDetails[course.ProfessorId];
            if (!profDetail || profDetail.Name !== filters.professor) return false;
        }
        if (filters.schoolYear && course.School_Year !== filters.schoolYear) return false;
        if (filters.semester && course.Semester !== filters.semester) return false;

        // New filter for room type
        if (filters.roomType && course.RoomTypeId) {
            const roomType = roomTypeDetails[course.RoomTypeId];
            if (!roomType || roomType.Type !== filters.roomType) return false;
        } else if (filters.roomType && !course.RoomTypeId) {
            return false; // If a room type is selected but the course has none
        }

        return true;
    });

    if (loading)
        return <div className="flex justify-center items-center h-screen">Loading assigned courses...</div>;
    if (error)
        return <div className="flex justify-center items-center h-screen text-red-500">Error: {error}</div>;

    return (
        <div
            className="bg-cover bg-no-repeat min-h-screen flex justify-between items-center overflow-y-auto"
            style={{ backgroundImage: `url(${Background})` }}
        >
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
            <TopMenu toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />

            <div className="flex flex-col justify-center items-center h-screen w-full px-8">
                {/* Display the current department */}
                <div className="text-xl p-10 font-semibold text-white">
                    Current Department: {department ? department.Name : "Loading..."}
                </div>

                <div className="flex justify-end w-10/12 mb-4">
                    <div className="flex flex-wrap gap-4">
                        <select
                            value={filters.professor}
                            onChange={(e) => handleFilterChange('professor', e.target.value)}
                            className="px-4 py-2 border rounded text-sm md:text-base"
                        >
                            <option value="">Select Professor</option>
                            {professors.map(prof => (
                                <option key={`prof-${prof.id}`} value={prof.Name}>
                                    {prof.Name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filters.schoolYear}
                            onChange={(e) => handleFilterChange('schoolYear', e.target.value)}
                            className="px-4 py-2 border rounded text-sm md:text-base"
                        >
                            <option value="">All School Years</option>
                            {schoolYears.map(year => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filters.semester}
                            onChange={(e) => handleFilterChange('semester', e.target.value)}
                            className="px-4 py-2 border rounded text-sm md:text-base"
                        >
                            <option value="">All Semesters</option>
                            {semesters.map(sem => (
                                <option key={sem} value={sem}>
                                    {sem}
                                </option>
                            ))}
                        </select>

                        {/* New Room Type filter */}
                        <select
                            value={filters.roomType}
                            onChange={(e) => handleFilterChange('roomType', e.target.value)}
                            className="px-4 py-2 border rounded text-sm md:text-base"
                        >
                            <option value="">All Room Types</option>
                            {roomTypes.map(type => (
                                <option key={type.id} value={type.Type}>
                                    {type.Type}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center w-10/12 max-h-[70vh]">
                    <div className="flex items-center bg-blue-600 text-white px-4 md:px-10 py-4 rounded-t-lg w-full mb-3">
                        <img
                            src={profV}
                            className="w-12 h-12 md:w-25 md:h-25"
                            alt="Professor Icon"
                        />
                        <h2 className="text-sm md:text-lg font-semibold flex-grow text-center">
                            Assigned Courses To Professors
                        </h2>
                    </div>
                    {warningMessage && (
              <div className="sticky text-center mb-5 w-full mt-3 font-medium bg-red-600 text-white px-4 py-5 rounded shadow-md">
                {warningMessage}
              </div>
            )}
                    <div className="overflow-auto w-full h-full flex-grow">
                        <table className="text-center w-full border-collapse">
                            <thead>
                                <tr className="bg-blue-600">
                                    <th className="px-4 py-2 text-white font-medium border">Code</th>
                                    <th className="px-4 py-2 text-white font-medium border">Description</th>
                                    <th className="px-4 py-2 text-white font-medium border">School Year</th>
                                    <th className="px-4 py-2 text-white font-medium border">Semester</th>
                                    <th className="px-4 py-2 text-white font-medium border">Professor</th>
                                    <th className="px-4 py-2 text-white font-medium border">Room Type</th> {/* New header */}
                                    <th className="px-4 py-2 text-white font-medium border">
                                        <input
                                            type="checkbox"
                                            checked={isAllChecked}
                                            onChange={() => handleCheckboxChange(0, true)}
                                        />
                                    </th>
                                    <th className="px-4 py-2 text-gray-600 border"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCourses.length > 0 ? (
                                    filteredCourses.map((assignment) => {
                                        const originalIndex = assignedCourses.findIndex(
                                            (c) => c.id === assignment.id
                                        );
                                        // Use detailed professor info based on ProfessorId
                                        const profDetail = professorDetails[assignment.ProfessorId];
                                        const professorDisplay = profDetail
                                            ? `${profDetail.Name} (${profDetail.ProfStatus?.Status || "No Status"})`
                                            : 'N/A';
                                        // Use detailed course info based on CourseId
                                        const courseDetail = courseDetails[assignment.CourseId];
                                        // Use detailed room type info
                                        const roomTypeDetail = roomTypeDetails[assignment.RoomTypeId];
                                        const roomTypeDisplay = roomTypeDetail ? roomTypeDetail.Type : 'Not Specified';

                                        return (
                                            <tr
                                                key={assignment.id}
                                                className="hover:bg-customLightBlue2 border-t border-gray-300"
                                            >
                                                <td className="px-4 py-2 border">
                                                    {courseDetail?.Code || 'N/A'}
                                                </td>
                                                <td className="px-4 py-2 border">
                                                    {courseDetail?.Description || 'N/A'}
                                                </td>
                                                <td className="px-4 py-2 border">
                                                    {assignment.School_Year}
                                                </td>
                                                <td className="px-4 py-2 border">
                                                    {assignment.Semester}
                                                </td>
                                                <td className="px-4 py-2 border">{professorDisplay}</td>
                                                <td className="px-4 py-2 border">{roomTypeDisplay}</td> {/* New cell */}
                                                <td className="py-2 border">
                                                    <input
                                                        type="checkbox"
                                                        checked={checkboxes[originalIndex] || false}
                                                        onChange={() => handleCheckboxChange(originalIndex)}
                                                    />
                                                </td>
                                                <td className="py-2 border">
                                                    <button onClick={() => handleEditClick(assignment.id)}>
                                                        <img
                                                            src={editBtn}
                                                            className="w-9 h-9 md:w-15 md:h-15 hover:scale-110"
                                                            alt="Edit"
                                                        />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="px-4 py-2 text-center border">
                                            No assignations found with the selected filters
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="fixed top-1/4 right-4 border border-gray-900 bg-customWhite rounded p-7 mr-5 flex flex-col gap-4">
                <button onClick={() => toggleModal('add', true)}>
                    <img
                        src={addBtn}
                        className="w-12 h-12 md:w-25 md:h-25 hover:scale-110"
                        alt="Add"
                    />
                </button>
                <button onClick={handleDeleteClick}>
                <img
                    src={delBtn}
                    className="w-12 h-12 md:w-25 md:h-25 hover:scale-110"
                    alt="Delete"
                />
                </button>
            </div>

            {/* Note: You'll need to update AddAssignationModal to include room type selection */}
            <AddAssignationModal
                isOpen={modals.add}
                onClose={() => toggleModal('add', false)}
                roomTypes={roomTypes}
            />

            {modals.edit && selectedAssignment && (
                <EditAssignmentModal
                    assignment={selectedAssignment}
                    onClose={() => toggleModal('edit', false)}
                    onUpdate={handleUpdateAssignment}
                    professors={professors}
                    departments={[]} // Department filter removed
                    schoolYears={schoolYears}
                    semesters={semesters}
                    roomTypes={roomTypes} // Pass room types to the edit modal
                />
            )}

            <DeleteWarning
                isOpen={modals.delete}
                onClose={() => toggleModal('delete', false)}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
};

export default AssignationsCourseProf;