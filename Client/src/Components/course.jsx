import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Plus, X, BookOpen, Edit, Trash2, Filter, ChevronRight, ChevronLeft, User, Clock } from 'lucide-react';
import Axios from '../axiosConfig';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Sidebar from "./callComponents/sideBar";
import TopMenu from "./callComponents/topMenu";
import AddCourseModal from "./callComponents/addCourseModal";
import EditCourseModal from "./callComponents/editCourseModal";
import DeleteWarning from "./callComponents/deleteWarning";
import { useAuth } from '../Components/authContext';
import { useNavigate } from 'react-router-dom';

const CourseManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const deptId = user?.DepartmentId;
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [yearFilter, setYearFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courseTypes, setCourseTypes] = useState(['All']);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [assignations, setAssignations] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [courseActiveTabs, setCourseActiveTabs] = useState({});
  const [programCourses, setProgramCourses] = useState({});
  const coursesPerPage = 8;

  const uniqueYears = ['All', ...new Set(courses.map(c => c.Year).filter(Boolean))].sort((a, b) => a - b);
  const showNotification = (message, type = "info") => toast[type](message);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await Axios.get(`/course/getCoursesByDept/${deptId}`);
      if (response.data.successful) {
        const courseData = response.data.data;
        const types = ['All', ...new Set(courseData.map(course => course.Type?.trim()).filter(Boolean))];
        setCourseTypes(types);

        const transformedData = courseData.map(course => ({
          id: course.id,
          code: course.Code,
          description: course.Description,
          units: course.Units,
          type: course.Type,
          year: course.Year,
          details: {
            duration: course.Duration,
            department: course.DepartmentId || deptId,
          },
          minimized: false,
          rawData: course
        }));
        setCourses(transformedData);
        setFilteredCourses(transformedData);

        const tabs = {};
        transformedData.forEach(course => {
          tabs[course.id] = 'programs';
        });
        setCourseActiveTabs(tabs);
      } else {
        setError(response.data.message);
        showNotification("Failed to fetch courses", "error");
      }
    } catch (error) {
      setError(`Error: ${error.message}`);
      showNotification("Failed to fetch courses", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignations = async () => {
    try {
      const response = await Axios.get(`/assignation/getAllAssignationsByDeptInclude/${deptId}`);
      if (response.data.successful) setAssignations(response.data.data);
      else showNotification("Failed to fetch professor assignations", "error");
    } catch (error) {
      showNotification("Error fetching professor assignations", "error");
    }
  };

  const fetchCoursesByProgram = async (programId) => {
    try {
      const response = await Axios.get(`/course/getCoursesByProg/${programId}`);
      if (response.data.successful) {
        setProgramCourses(prev => ({
          ...prev,
          [programId]: response.data.data
        }));
      } else {
        showNotification(`Failed to fetch courses for program`, "error");
      }
    } catch (error) {
      showNotification(`Error fetching program courses: ${error.message}`, "error");
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await Axios.get(`/program/getAllProgByDept/${deptId}`);
      if (response.data.successful) setPrograms(response.data.data);
      else showNotification("Failed to fetch programs", "error");
    } catch (error) {
      showNotification("Error fetching programs", "error");
    }
  };

  const getProfessorsByCourse = (courseId) => {
    if (!assignations || assignations.length === 0) return [];

    const uniqueProfessors = [];
    const professorMap = new Map();

    assignations.filter(a => a.CourseId === courseId && a.ProfessorId).forEach(assignation => {
      if (assignation.Professor) {
        const key = `${assignation.ProfessorId}-${assignation.Semester}`;
        if (!professorMap.has(key)) {
          professorMap.set(key, true);
          const professorName = assignation.Professor.Name ||
            `${assignation.Professor.FirstName || ''} ${assignation.Professor.LastName || ''}`.trim();
          uniqueProfessors.push({
            id: assignation.Professor.id || assignation.ProfessorId,
            name: professorName,
            email: assignation.Professor.Email,
            semester: assignation.Semester
          });
        }
      }
    });
    return uniqueProfessors;
  };

  const getProgramsByCourse = (courseId) => {
    return programs
      .filter(program => program.Courses?.some(course => course.id === courseId))
      .map(program => ({
        id: program.id,
        name: program.Name || program.Title || "Unnamed Program",
        code: program.Code || "",
        description: program.Description || "",
        courses: programCourses[program.id] || []
      }));
  };
  const toggleMinimize = (id) => {
    setCourses(courses.map(course =>
      course.id === id ? { ...course, minimized: !course.minimized } : course
    ));
  };

  const toggleCourseTab = (courseId, tab) => {
    setCourseActiveTabs(prev => ({ ...prev, [courseId]: tab }));
  };

  const handleEditClick = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
      setSelectedCourse(course.rawData);
      setIsEditModalOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedCourseIds.length === 0) return;
    try {
      for (const id of selectedCourseIds) {
        await Axios.delete(`/course/deleteCourse/${id}`);
      }
      fetchCourses();
      setIsDeleteWarningOpen(false);
      showNotification(`${selectedCourseIds.length > 1 ? 'Courses' : 'Course'} deleted successfully`, "success");
      setSelectedCourseIds([]);
    } catch (error) {
      showNotification("Error deleting courses", "error");
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "Major": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "General": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Elective": return "bg-purple-100 text-purple-800 border-purple-200";
      case "Professional": return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  useEffect(() => {
    if (deptId) {
      fetchCourses();
      fetchAssignations();
      fetchPrograms();
    }
  }, [deptId]);

  useEffect(() => {
    if (programs.length > 0) {
      programs.forEach(program => {
        fetchCoursesByProgram(program.id);
      });
    }
  }, [programs]);

  useEffect(() => {
    const filtered = courses.filter(course => {
      const searchMatch = searchTerm.toLowerCase() === '' ||
        course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(course.units).includes(searchTerm) ||
        (course.type && course.type.toLowerCase().includes(searchTerm.toLowerCase()));

      const yearMatch = yearFilter === 'All' || String(course.year) === String(yearFilter);
      const typeMatch = typeFilter === 'All' || (course.type && course.type.trim() === typeFilter.trim());

      return searchMatch && yearMatch && typeMatch;
    });
    setFilteredCourses(filtered);
    setCurrentPage(1);
  }, [searchTerm, yearFilter, typeFilter, courses]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  const indexOfLastCourse = currentPage * coursesPerPage;
  const indexOfFirstCourse = indexOfLastCourse - coursesPerPage;
  const currentCourses = filteredCourses.slice(indexOfFirstCourse, indexOfLastCourse);
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);

  return (
    <div className="bg-gray-800 min-h-screen flex flex-col">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      <TopMenu toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="flex-grow flex justify-center items-center pt-20 pb-8 px-4">
        <div className="w-full max-w-7xl my-50">
          {/* Header */}
          <div className="mb-6 flex flex-col md:flex-row justify-between items-center">
            <h1 className="text-xl sm:text-3xl font-bold text-white mb-2">Course Management</h1>
            <div className="bg-white px-4 py-2 rounded shadow-md">
            <button
                onClick={() => navigate('/addConfigSchedule')}
                className="bg-blue-500 text-white rounded-full p-3 mr-5 hover:bg-blue-200 duration-300 transition"
                title="Go Back"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-gray-800 font-medium">Total Courses: <span className="text-blue-600">{courses.length}</span></span>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white p-12 rounded shadow-md mb-6">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-3 pl-11 border rounded shadow-sm border-gray-300 hover:border-gray-400"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setYearFilter('All');
                    setTypeFilter('All');
                    setActiveTab('all');
                  }}
                  className={`px-4 py-2.5 rounded text-sm font-medium ${activeTab === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  All
                </button>
                <div className="relative ml-1">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2.5 rounded text-sm font-medium flex items-center gap-2 ${showFilters ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <Filter size={16} />
                    Filters
                  </button>

                  {showFilters && (
                    <div className="absolute right-0 mt-2 rounded bg-white shadow-xl z-10 w-80">
                      <div className="p-4 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Year Level</label>
                          <select
                            value={yearFilter}
                            onChange={(e) => {
                              setYearFilter(e.target.value);
                              setActiveTab('filtered');
                            }}
                            className="w-full border border-gray-300 rounded p-2 text-sm"
                          >
                            {uniqueYears.map((year) => (
                              <option key={year} value={year}>
                                {year === "All" ? "All Years" : `Year ${year}`}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Course Type</label>
                          <select
                            value={typeFilter}
                            onChange={(e) => {
                              setTypeFilter(e.target.value);
                              setActiveTab('filtered');
                            }}
                            className="w-full border border-gray-300 rounded p-2 text-sm"
                          >
                            {courseTypes.map((type) => (
                              <option key={type} value={type}>
                                {type === "All" ? "All Types" : type}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-4 border-t border-gray-100 pt-4">
              <button onClick={() => setCourses(courses.map(course => ({ ...course, minimized: false })))}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition duration-200 flex items-center gap-2 shadow-md">
                <ChevronDown size={16} />
                Expand All
              </button>
              <button onClick={() => setCourses(courses.map(course => ({ ...course, minimized: true })))}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition duration-200 flex items-center gap-2">
                <ChevronUp size={16} />
                Collapse All
              </button>
              <button onClick={() => setIsAddCourseModalOpen(true)}
                className="ml-auto px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition duration-200 flex items-center gap-2 shadow-md">
                <Plus size={16} />
                Add Course
              </button>
            </div>
          </div>

          {/* Course Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-15">
            {currentCourses.length > 0 ? (
              currentCourses.map(course => (
                <div key={course.id} className="bg-white rounded shadow-md overflow-hidden hover:shadow-lg transition duration-300">
                  <div className="bg-blue-600 p-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-white">{course.code}</h2>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {course.type && (
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${getTypeColor(course.type)}`}>
                              {course.type}
                            </span>
                          )}
                          {course.year && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-md border bg-blue-100 text-blue-800 border-blue-200">
                              Year {course.year}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleMinimize(course.id)}
                        className="p-1.5 bg-white bg-opacity-20 text-white rounded-md hover:bg-opacity-30 transition-all"
                      >
                        {course.minimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      </button>
                    </div>

                    <div className="mt-3 pt-2 border-t border-blue-500 border-opacity-30 text-white text-sm flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <span>{course.description}</span>
                      </div>
                      <div className="flex items-center gap-1 mr-3">
                        <BookOpen size={14} className="text-blue-200" />
                        <span>{course.units} Units</span>
                      </div>
                      {course.details.duration && (
                        <div className="flex items-center gap-1">
                          <Clock size={14} className="text-blue-200" />
                          <span>{course.details.duration}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`transition-all duration-300 ${course.minimized ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-screen opacity-100'}`}>
                    <div className="flex border-b border-gray-200">
                      <button
                        onClick={() => toggleCourseTab(course.id, 'programs')}
                        className={`px-4 py-2 text-sm font-medium ${courseActiveTabs[course.id] === 'programs' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
                      >
                        <BookOpen size={16} className="inline mr-1" />
                        Programs
                      </button>
                      <button
                        onClick={() => toggleCourseTab(course.id, 'professors')}
                        className={`px-4 py-2 text-sm font-medium ${courseActiveTabs[course.id] === 'professors' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
                      >
                        <User size={16} className="inline mr-1" />
                        Professors
                      </button>
                    </div>

                    <div className="p-8 max-h-200 overflow-y-auto">
                      {courseActiveTabs[course.id] === 'programs' ? (
                        <>
                          <h3 className="font-medium text-gray-800 mb-2">Associated Programs</h3>
                          {getProgramsByCourse(course.id).length > 0 ? (
                            <div className="space-y-3">
                              {getProgramsByCourse(course.id).map(program => (
                                <div key={`${course.id}-${program.id}`} className="bg-gray-50 p-3 rounded border border-gray-100">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-800">{program.name}</h4>
                                      {program.code && <p className="text-xs text-gray-500">{program.code}</p>}
                                    </div>
                                  </div>
                                  {program.description && <p className="text-xs text-gray-600 mt-2">{program.description}</p>}

                                  {/* Added section to display courses in this program */}
                                  <div className="mt-3 pt-2 border-t border-gray-200">
                                    <h5 className="text-xs font-medium text-gray-700 mb-1">Other Courses in this Program:</h5>
                                    {program.courses && program.courses.length > 0 ? (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {program.courses
                                          .filter(programCourse => programCourse.id !== course.id) // Filter out current course
                                          .slice(0, 3) // Show only up to 3 courses
                                          .map(programCourse => (
                                            <span key={programCourse.id} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-md">
                                              {programCourse.Code}
                                            </span>
                                          ))}
                                        {program.courses.length > 4 && (
                                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-md">
                                            +{program.courses.length - 4} more
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-500">No other courses in this program</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-gray-50 rounded border border-dashed border-gray-200">
                              <p className="text-gray-500 text-sm">No programs associated</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <h3 className="font-medium text-gray-800 mb-2">Assigned Professors</h3>
                          {getProfessorsByCourse(course.id).length > 0 ? (
                            <div className="space-y-3">
                              {getProfessorsByCourse(course.id).map(professor => (
                                <div key={`${course.id}-${professor.id}-${professor.semester}`} className="flex items-start bg-gray-50 p-3 rounded border border-gray-100">
                                  <div className="flex-shrink-0 mr-3">
                                    <div className="bg-blue-100 p-2 rounded-full">
                                      <User size={18} className="text-blue-600" />
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-800">{professor.name}</h4>
                                    <p className="text-xs text-gray-500">Semester {professor.semester}</p>
                                    {professor.email && <p className="text-xs text-gray-500">{professor.email}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-gray-50 rounded border border-dashed border-gray-200">
                              <p className="text-gray-500 text-sm">No professors assigned</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end items-center">
                    <div className="flex gap-1">
                      <button
                        className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded"
                        onClick={() => handleEditClick(course.id)}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded"
                        onClick={() => {
                          setSelectedCourseIds([course.id]);
                          setIsDeleteWarningOpen(true);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-1 md:col-span-2 text-center py-12 bg-white rounded shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No courses found</h3>
                <p className="text-gray-500 mb-4">No courses match your current search or filters.</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setYearFilter('All');
                    setTypeFilter('All');
                    setActiveTab('all');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 shadow-md"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {filteredCourses.length > 0 && (
            <div className="mt-8 bg-white rounded shadow-md p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {indexOfFirstCourse + 1} to {Math.min(indexOfLastCourse, filteredCourses.length)} of {filteredCourses.length} courses
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded border border-gray-300 ${currentPage === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded border border-gray-300 ${currentPage === totalPages ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isAddCourseModalOpen && (
        <AddCourseModal
          isOpen={isAddCourseModalOpen}
          onClose={() => setIsAddCourseModalOpen(false)}
          fetchCourse={fetchCourses}
        />
      )}

      {isEditModalOpen && selectedCourse && (
        <EditCourseModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          course={selectedCourse}
          fetchCourse={fetchCourses}
          onUpdateSuccess={() => {
            setIsEditModalOpen(false);
            fetchCourses();
          }}
        />
      )}

      {isDeleteWarningOpen && (
        <DeleteWarning
          isOpen={isDeleteWarningOpen}
          onClose={() => setIsDeleteWarningOpen(false)}
          onConfirm={handleConfirmDelete}
          coursesToDelete={selectedCourseIds.length > 0 ? filteredCourses.filter(course => selectedCourseIds.includes(course.id)) : []}
        />
      )}
    </div>
  );
}

export default CourseManagement;