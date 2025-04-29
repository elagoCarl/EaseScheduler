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

const CourseManagement = () => {
  const { user } = useAuth();
  const deptId = user?.DepartmentId;

  // UI states
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [yearFilter, setYearFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Data states
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const coursesPerPage = 8;

  // Simplified professor data
  const professorsByCourse = {
    '1': [{ id: 101, name: 'Dr. Sarah Johnson' }, { id: 102, name: 'Prof. Michael Chen' }],
    '38': [{ id: 103, name: 'Dr. James Wilson' }],
    '39': [{ id: 104, name: 'Dr. Elizabeth Taylor' }, { id: 105, name: 'Prof. Robert Brown' }],
    '4': [{ id: 106, name: 'Dr. Thomas Martinez' }],
    '5': [{ id: 107, name: 'Dr. Lisa Anderson' }],
    '6': [{ id: 108, name: 'Prof. David Miller' }, { id: 109, name: 'Dr. Emily Clark' }],
    '7': [{ id: 110, name: 'Dr. Patricia White' }],
    '8': [{ id: 111, name: 'Prof. Daniel Garcia' }],
    '9': [{ id: 112, name: 'Dr. Rachel Lee' }, { id: 113, name: 'Prof. John Thompson' }],
    '10': [{ id: 114, name: 'Dr. Steven Harris' }],
  };

  const uniqueYears = ['All', ...new Set(courses.map(c => c.Year).filter(Boolean))].sort((a, b) => a - b);
  const uniqueTypes = ['All', ...new Set(courses.map(c => c.Type?.trim()).filter(Boolean))];

  const showNotification = (message, type = "info") => toast[type](message);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await Axios.get(`/course/getCoursesByDept/${deptId}`);
      if (response.data.successful) {
        const courseData = response.data.data;
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
            professors: professorsByCourse[course.id] || []
          },
          minimized: true,
          rawData: course
        }));
        setCourses(transformedData);
        setFilteredCourses(transformedData);
        setCurrentPage(1);
      } else {
        setError(response.data.message);
        showNotification("Failed to fetch courses", "error");
      }
    } catch (error) {
      setError(`Error fetching courses: ${error.message}`);
      showNotification("Failed to fetch courses", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleMinimize = (id) => {
    setCourses(courses.map(course =>
      course.id === id ? { ...course, minimized: !course.minimized } : course
    ));
  };

  const handleEditClick = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
      setSelectedCourse(course.rawData);
      setIsEditModalOpen(true);
    } else {
      showNotification("Could not retrieve course details", "error");
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedCourseIds.length === 0) {
      showNotification("No courses selected for deletion", "error");
      return;
    }
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
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  useEffect(() => {
    if (deptId) fetchCourses();
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
    setCurrentPage(1);
  }, [searchTerm, yearFilter, typeFilter, courses]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  const indexOfLastCourse = currentPage * coursesPerPage;
  const indexOfFirstCourse = indexOfLastCourse - coursesPerPage;
  const currentCourses = filteredCourses.slice(indexOfFirstCourse, indexOfLastCourse);

  return (
    <div className="bg-slate-900 min-h-screen flex flex-col">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      <TopMenu toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="flex-grow flex justify-center items-center pt-20 pb-8 px-4">
        <div className="w-full max-w-7xl my-50">
          <div className="mb-6 flex flex-col md:flex-row justify-between items-center">
            <h1 className="text-xl sm:text-3xl font-bold text-white mb-2">Course Management</h1>
            <div className="bg-white px-4 py-2 rounded shadow-md">
              <span className="text-gray-800 font-medium">Total Courses: <span className="text-blue-600">{courses.length}</span></span>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow-md mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search courses by code, description or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-3 pl-11 border rounded shadow-sm transition duration-200 border-gray-300 hover:border-gray-400"
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
                  className={`px-4 py-2.5 rounded text-sm font-medium transition duration-200 ${activeTab === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  All
                </button>
                <div className="relative ml-1">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2.5 rounded text-sm font-medium transition duration-200 flex items-center gap-2 ${showFilters ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <Filter size={16} />
                    Filters
                  </button>

                  {showFilters && (
                    <div className="absolute right-0 mt-2 rounded bg-white shadow-xl z-10 w-64">
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
                            {uniqueTypes.map((type) => (
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-10">
            {currentCourses.length > 0 ? (
              currentCourses.map(course => (
                <div key={course.id} className="bg-white rounded shadow-md overflow-hidden hover:shadow-lg transition duration-300">
                  <div className="bg-blue-600 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-white">{course.code}</h2>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${getTypeColor(course.type)}`}>
                            {course.type}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-medium rounded-md border bg-blue-100 text-blue-800 border-blue-200">
                            Year {course.year}
                          </span>
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
                      <div className="flex items-center gap-1">
                        <Clock size={14} className="text-blue-200" />
                        <span>{course.details.duration}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`transition-all duration-300 ${course.minimized ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-screen opacity-100'}`}>
                    <div className="p-4">
                      {/* Assigned Professors Section - Simplified */}
                      <div className="mt-2">
                        <h3 className="font-medium text-gray-800 mb-2">Assigned Professors</h3>
                        {professorsByCourse[course.id] && professorsByCourse[course.id].length > 0 ? (
                          <div className="space-y-3">
                            {professorsByCourse[course.id].map(professor => (
                              <div key={professor.id} className="flex items-start bg-gray-50 p-3 rounded border border-gray-100">
                                <div className="flex-shrink-0 mr-3">
                                  <div className="bg-blue-100 p-2 rounded-full">
                                    <User size={18} className="text-blue-600" />
                                  </div>
                                </div>
                                <div className="flex-grow">
                                  <h4 className="text-sm font-medium text-gray-800">{professor.name}</h4>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 bg-gray-50 rounded border border-dashed border-gray-200">
                            <p className="text-gray-500 text-sm">No professors assigned</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end items-center">
                    <div className="flex gap-1">
                      <button
                        className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition duration-150"
                        onClick={() => handleEditClick(course.id)}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded transition duration-150"
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
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition duration-200 shadow-md"
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
                  Showing <span className="font-medium">{indexOfFirstCourse + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastCourse, filteredCourses.length)}
                  </span>{" "}
                  of <span className="font-medium">{filteredCourses.length}</span> courses
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded border border-gray-300 ${currentPage === 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  {Array.from({ length: Math.ceil(filteredCourses.length / coursesPerPage) }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPage(index + 1)}
                      className={`px-3 py-1 rounded ${currentPage === index + 1
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                        }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => currentPage < Math.ceil(filteredCourses.length / coursesPerPage) && setCurrentPage(currentPage + 1)}
                    disabled={currentPage === Math.ceil(filteredCourses.length / coursesPerPage)}
                    className={`p-2 rounded border border-gray-300 ${currentPage === Math.ceil(filteredCourses.length / coursesPerPage)
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
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
          onClose={() => {
            setIsAddCourseModalOpen(false);
            fetchCourses();
          }}
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