import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Plus, X, BookOpen, Edit, Trash2, Filter, ChevronRight, ChevronLeft, User, Clock } from 'lucide-react';
import Axios from '../axiosConfig';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Sidebar from "./callComponents/sideBar";
import TopMenu from "./callComponents/topMenu";
import AddCourseModal from "./callComponents/courseManagement/addCourseModal";
import EditCourseModal from "./callComponents/courseManagement/editCourseModal";
import DeleteWarning from "./callComponents/deleteWarning";
import ViewProgramsModal from "./callComponents/courseManagement/courseProgModal";
import { useAuth } from '../Components/authContext';

const CourseManagement = () => {
  const { user } = useAuth();
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
  const [isProgramsModalOpen, setIsProgramsModalOpen] = useState(false);
  const [selectedCourseForPrograms, setSelectedCourseForPrograms] = useState(null);
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYears, setSelectedSchoolYears] = useState({});
  const coursesPerPage = 8;

  const uniqueYears = ['All', ...new Set(courses.map(c => c.year).filter(Boolean))].sort((a, b) => a - b);
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

  const fetchAssignations = async (courseId = null, schoolYearId = null) => {
    try {
      let url = `/assignation/getAllAssignationsByDeptInclude/${deptId}`;
      let params = {};

      if (schoolYearId) {
        params.SchoolYearId = schoolYearId;
      }

      const response = await Axios.get(url, { params });

      if (response.data.successful) {
        setAssignations(response.data.data);
        return response.data.data;
      } else {
        showNotification("Failed to fetch course assignations", "error");
        return [];
      }
    } catch (error) {
      showNotification("Error fetching course assignations", "error");
      return [];
    }
  };

  const fetchSchoolYears = async () => {
    try {
      const response = await Axios.get("/schoolYear/getAllSchoolYears");
      if (response.data.successful) {
        const years = response.data.data;
        setSchoolYears(years);

        if (years.length > 0 && courses.length > 0) {
          const defaultSchoolYear = years[0];
          const initialSelectedYears = { ...selectedSchoolYears };
          let shouldUpdateState = false;

          courses.forEach(course => {
            if (!initialSelectedYears[course.id]) {
              initialSelectedYears[course.id] = defaultSchoolYear.id;
              shouldUpdateState = true;
            }
          });

          if (shouldUpdateState) {
            setSelectedSchoolYears(initialSelectedYears);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch school years:", error);
      showNotification("Failed to fetch school years", "error");
    }
  };

  // Replace the old getProfessorsByCourse function with this
  const getProfessorsByCourse = (courseId) => {
    const courseDetails = getCourseDetailsForSchoolYear(courseId, selectedSchoolYears[courseId]);
    return courseDetails.professors;
  };

  const getCourseDetailsForSchoolYear = (courseId, schoolYearId) => {
    if (!assignations || assignations.length === 0) return [];

    // Filter assignations for this course and school year
    const relevantAssignations = assignations.filter(a =>
      a.CourseId === courseId &&
      (schoolYearId ? a.SchoolYearId === parseInt(schoolYearId) : true)
    );

    // Create professor-based structure with their assigned sections
    const professorsWithSections = relevantAssignations.map(assignation => {
      if (!assignation.Professor) return null;

      const professorName = assignation.Professor.Name ||
        `${assignation.Professor.FirstName || ''} ${assignation.Professor.LastName || ''}`.trim();

      // Process sections for this assignation
      const sections = assignation.ProgYrSecs ? assignation.ProgYrSecs.map(section => ({
        id: section.id,
        year: section.Year,
        section: section.Section,
        program: section.Program ? {
          code: section.Program.Code,
          name: section.Program.Name
        } : { code: 'Unknown', name: 'Unknown' }
      })) : [];

      return {
        assignationId: assignation.id,
        professorId: assignation.ProfessorId,
        professorName: professorName,
        professorEmail: assignation.Professor.Email,
        semester: assignation.Semester,
        sections: sections
      };
    }).filter(item => item !== null);

    return professorsWithSections;
  };

  const toggleMinimize = (id) => {
    setCourses(prevCourses => prevCourses.map(course =>
      course.id === id ? { ...course, minimized: !course.minimized } : course
    ));
  };

  const handleEditClick = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
      setSelectedCourse(course.rawData);
      setIsEditModalOpen(true);
    }
  };

  const handleViewPrograms = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (course && !course.rawData.isTutorial) {
      setSelectedCourseForPrograms({
        id: courseId,
        name: course.code
      });
      setIsProgramsModalOpen(true);
    } else if (course && course.rawData.isTutorial) {
      showNotification("Tutorial courses do not have associated programs", "info");
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

  const handleSchoolYearChange = (courseId, schoolYearId) => {
    setSelectedSchoolYears(prev => ({
      ...prev,
      [courseId]: schoolYearId
    }));

    // Refetch assignations with the new school year ID
    fetchAssignations(null, schoolYearId);
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
      Promise.all([
        fetchCourses(),
        fetchAssignations(),
        fetchSchoolYears()
      ]);
    }
  }, [deptId]);

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
    // Remove the setCurrentPage(1) here - we don't want to reset page when just collapsing
  }, [searchTerm, yearFilter, typeFilter, courses]);

  useEffect(() => {
    if (courses.length > 0 && schoolYears.length > 0) {
      const updatedSelectedYears = { ...selectedSchoolYears };
      let shouldUpdateState = false;

      courses.forEach(course => {
        if (!updatedSelectedYears[course.id] && schoolYears.length > 0) {
          updatedSelectedYears[course.id] = schoolYears[0].id;
          shouldUpdateState = true;
        }
      });

      if (shouldUpdateState) {
        setSelectedSchoolYears(updatedSelectedYears);
      }
    }
  }, [courses, schoolYears]);

  // Add this useEffect to update assignations when selected school year changes
  useEffect(() => {
    // Check if we have any selected school years
    if (Object.keys(selectedSchoolYears).length > 0) {
      fetchAssignations(null, Object.values(selectedSchoolYears)[0]);
    }
  }, [selectedSchoolYears]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, yearFilter, typeFilter])


  // Calculate pagination values
  const indexOfLastCourse = currentPage * coursesPerPage;
  const indexOfFirstCourse = indexOfLastCourse - coursesPerPage;
  const currentCourses = filteredCourses.slice(indexOfFirstCourse, indexOfLastCourse);
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="bg-slate-900 min-h-screen flex flex-col">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      <TopMenu toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="flex-grow flex justify-center items-center pt-20 pb-8 px-4">
        <div className="w-full max-w-7xl my-50">
          {/* Header */}
          <div className="mb-6 flex flex-col md:flex-row justify-between items-center">
            <h1 className="text-xl sm:text-3xl font-bold text-white mb-2">Course Management</h1>
            <div className="bg-white px-4 py-2 rounded shadow-md">
              <span className="text-gray-800 font-medium">Total Courses: <span className="text-blue-600">{courses.length}</span></span>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white p-4 rounded shadow-md mb-6">
            <div className="flex flex-col md:flex-row gap-4 p-4">
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
                <button onClick={() => {
                  setYearFilter('All');
                  setTypeFilter('All');
                  setActiveTab('all');
                }}
                  className={`px-4 rounded text-sm font-medium ${activeTab === 'all' ? 'bg-blue-600 hover:bg-blue-700 duration-300 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  All
                </button>
                <div className="relative ml-1">
                  <button onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 ${showFilters ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-black hover:bg-gray-300'}`}
                  >
                    <Filter size={16} />
                    Filters
                  </button>

                  {showFilters && (
                    <div className="absolute right-0 mt-2 rounded bg-white shadow-xl z-10 w-64">
                      <div className="p-4 space-y-3">
                        {/* <div>
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
                        </div> */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-10">
            {currentCourses.length > 0 ? (
              currentCourses.map(course => (
                <div key={course.id} className="bg-white rounded shadow-md overflow-hidden hover:shadow-lg transition duration-300">
                  <div className="bg-blue-600 p-12">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-white">{course.code}</h2>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {course.type && (
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${getTypeColor(course.type)}`}>
                              {course.type}
                            </span>
                          )}
                          {course.rawData.RoomType.Type && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-md border bg-blue-100 text-blue-800 border-blue-200">
                              {course.rawData.RoomType.Type}
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => toggleMinimize(course.id)}
                        className="p-1.5 bg-white bg-opacity-20 text-white rounded-md hover:bg-opacity-30 transition-all"
                      >
                        {course.minimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      </button>
                    </div>

                    <div className="mt-3 pt-2 border-t border-blue-500 border-opacity-30 text-white text-sm flex flex-wrap gap-4">
                      {/* Existing course info */}
                      <div className="flex items-center gap-6 tracking-tight">
                        <span>{course.description}</span>
                      </div>
                      <div className="flex items-center ml-8 gap-2 mr-3">
                        <BookOpen size={15} className="text-blue-200" />
                        <span>{course.units} Units</span>
                      </div>
                      {course.details.duration && (
                        <div className="flex items-center ml-5 gap-1">
                          <Clock size={15} className="text-blue-200" />
                          <span>Course Duration: {course.details.duration}</span>
                        </div>
                      )}

                      {/* Add school year dropdown */}
                      <div className="w-full mt-3">
                        <label htmlFor={`schoolYear-${course.id}`} className="block text-xs font-medium text-blue-100 mb-1">
                          School Year
                        </label>
                        <select
                          id={`schoolYear-${course.id}`}
                          value={selectedSchoolYears[course.id] || ''}
                          onChange={(e) => handleSchoolYearChange(course.id, e.target.value)}
                          className="w-full bg-white bg-opacity-10 border border-blue-400 border-opacity-30 rounded py-1 px-2 text-white text-sm"
                        >
                          {schoolYears.length > 0 ? (
                            schoolYears.map((year) => (
                              <option key={year.id} value={year.id} className="bg-blue-700 text-white">
                                {year.SY_Name}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled className="bg-blue-700 text-white">
                              No school years available
                            </option>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Add this to the course card display section, after the professors section */}
                  {/* Replace the previous professors and sections display with this */}
                  <div className={`transition-all duration-300 ${course.minimized ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-screen opacity-100'}`}>
                    <div className="p-8 overflow-y-auto max-h-200">
                      {!course.rawData.isTutorial && (
                        <div className="mb-4">
                          <button
                            onClick={() => handleViewPrograms(course.id)}
                            className="w-full gap-8 py-1.5 bg-blue-50 text-blue-600 rounded font-medium flex items-center justify-center hover:bg-blue-200 transition-colors"
                          >
                            <BookOpen size={16} />
                            View Associated Programs
                          </button>
                        </div>
                      )}

                      {/* Professors and their Sections */}
                      <h3 className="font-medium text-gray-800 mb-2">Assigned Professors & Sections</h3>
                      {(() => {
                        const professorsWithSections = getCourseDetailsForSchoolYear(course.id, selectedSchoolYears[course.id]);

                        if (professorsWithSections.length > 0) {
                          return (
                            <div className="space-y-6">
                              {professorsWithSections.map(assignment => (
                                <div key={`${assignment.assignationId}`} className="bg-gray-50 p-4 rounded border border-gray-200">
                                  {/* Professor Info */}
                                  <div className="flex items-start mb-3">
                                    <div className="flex-shrink-0 mr-3">
                                      <div className="bg-blue-100 p-2 rounded-full">
                                        <User size={18} className="text-blue-600" />
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-800">{assignment.professorName}</h4>
                                      <p className="text-xs text-gray-500">Semester {assignment.semester}</p>
                                      {assignment.professorEmail && <p className="text-xs text-gray-500">{assignment.professorEmail}</p>}
                                    </div>
                                  </div>

                                  {/* Sections taught by this professor */}
                                  <div className="pl-10">
                                    <h5 className="text-xs font-medium text-gray-600 mb-2">Teaching Sections:</h5>
                                    {assignment.sections.length > 0 ? (
                                      <div className="space-y-2">
                                        {assignment.sections.map(section => (
                                          <div key={`section-${section.id}`} className="flex items-center bg-white p-2 rounded border border-gray-100">
                                            <div className="flex-shrink-0 mr-2">
                                              <div className="bg-green-50 p-1 rounded-full">

                                              </div>
                                            </div>
                                            <div>
                                              <p className="text-xs font-medium">
                                                {section.program.code} {section.year}-{section.section}
                                              </p>
                                              <p className="text-xs text-gray-500">{section.program.name}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-500 italic">No specific sections assigned</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        } else {
                          return (
                            <div className="text-center py-6 bg-gray-50 rounded border border-dashed border-gray-200">
                              <p className="text-gray-500 text-sm">No assignments for this course in the selected school year</p>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>

                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end items-center">
                    <div className="flex gap-1">
                      <button className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded" onClick={() => handleEditClick(course.id)}
                      >
                        <Edit size={16} />
                      </button>
                      <button className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded" onClick={() => {
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
                <button onClick={() => {
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
                  <button onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)} disabled={currentPage === 1}
                    className={`p-2 rounded border border-gray-300 ${currentPage === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                  >
                    <ChevronLeft size={18} />
                  </button>

                  {/* Page number buttons */}
                  <div className="flex items-center space-x-5">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Logic to show current page +/- 2 pages
                      let pageToShow;
                      if (totalPages <= 5) {
                        pageToShow = i + 1;
                      } else if (currentPage <= 3) {
                        pageToShow = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageToShow = totalPages - 4 + i;
                      } else {
                        pageToShow = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageToShow}
                          onClick={() => setCurrentPage(pageToShow)}
                          className={`w-20 h-20 flex items-center justify-center rounded ${currentPage === pageToShow
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                            }`}
                        >
                          {pageToShow}
                        </button>
                      );
                    })}
                  </div>

                  <button onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}
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

      {/* Modals */}
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

      {isProgramsModalOpen && selectedCourseForPrograms && (
        <ViewProgramsModal
          isOpen={isProgramsModalOpen}
          onClose={() => setIsProgramsModalOpen(false)}
          courseId={selectedCourseForPrograms.id}
          courseName={selectedCourseForPrograms.name}
        />
      )}
    </div>
  );
}

export default CourseManagement;