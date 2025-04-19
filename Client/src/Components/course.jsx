import { useEffect, useState, useCallback } from "react";
import Background from "./Img/5.jpg";
import Sidebar from "./callComponents/sideBar.jsx";
import TopMenu from "./callComponents/topMenu.jsx";
import AddCourseModal from "./callComponents/addCourseModal.jsx";
import EditCourseModal from "./callComponents/editCourseModal.jsx";
import DelCourseWarn from "./callComponents/deleteWarning.jsx"
import addBtn from "./Img/addBtn.png";
import editBtn from "./Img/editBtn.png";
import delBtn from "./Img/delBtn.png";
import Axios from '../axiosConfig.js';
import { useAuth } from '../Components/authContext.jsx';

const Course = () => {
  const { user } = useAuth();
  const deptId = user.DepartmentId;

  // UI States
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  // Data States
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [checkboxes, setCheckboxes] = useState([]);
  const [isAllChecked, setAllChecked] = useState(false);
  const [error, setError] = useState(null);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  // Modal States
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false);
  const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState(null);
  const [courseToDelete, setCourseToDelete] = useState(null);

  // Extract unique years and types from courses for filters
  const uniqueYears = ["All", ...new Set(courses.map(c => c.Year).filter(Boolean))].sort((a, b) => a - b);
  const uniqueTypes = ["All", ...new Set(courses.map(c => c.Type?.trim()).filter(Boolean))];

  // Fetch courses data
  const fetchCourse = async () => {
    try {
      const response = await Axios.get(`/course/getCoursesByDept/${ deptId }`);
      if (response.data.successful) {
        const courseData = response.data.data;
        setCourses(courseData);
        applyFilters(courseData); // Initial filter application
        setCheckboxes(Array(courseData.length).fill(false));
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(`Error fetching courses: ${ err.message }`);
    }
  };

  // Apply filters to courses
  const applyFilters = useCallback((courseData = courses) => {
    const filtered = courseData.filter(course => {
      const matchesSearch = !searchTerm ||
        (course.Code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.Description?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesYear =
        yearFilter === "All" ||
        String(course.Year) === String(yearFilter);

      const matchesType =
        typeFilter === "All" ||
        course.Type?.trim() === typeFilter.trim();

      return matchesSearch && matchesYear && matchesType;
    });

    setFilteredCourses(filtered);
    // Reset checkboxes when filters change
    setCheckboxes(Array(filtered.length).fill(false));
    setAllChecked(false);
  }, [searchTerm, yearFilter, typeFilter, courses]);

  // Initialize data on component mount
  useEffect(() => {
    fetchCourse();
  }, [deptId]);

  // Apply filters when filter criteria change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Auto-hide warning message after 3 seconds
  useEffect(() => {
    let timeout;
    if (warningMessage) {
      timeout = setTimeout(() => {
        setWarningMessage("");
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [warningMessage]);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const handleMasterCheckboxChange = () => {
    const newState = !isAllChecked;
    setAllChecked(newState);
    setCheckboxes(Array(filteredCourses.length).fill(newState));
  };

  const handleCheckboxChange = (index) => {
    const updatedCheckboxes = [...checkboxes];
    updatedCheckboxes[index] = !updatedCheckboxes[index];
    setCheckboxes(updatedCheckboxes);

    // Update master checkbox state based on individual checkboxes
    const visibleCheckboxes = updatedCheckboxes.slice(0, filteredCourses.length);
    setAllChecked(visibleCheckboxes.every(Boolean) && visibleCheckboxes.length > 0);
  };

  const handleAddCourseClick = () => {
    setIsAddCourseModalOpen(true);
  };

  const handleAddCourseCloseModal = () => {
    setIsAddCourseModalOpen(false);
    fetchCourse(); // Refresh courses after adding
  };

  const handleEditCourse = (course) => {
    if (!course) {
      console.error("No course selected for editing.");
      return;
    }

    setCourseToEdit(course);
    setIsEditCourseModalOpen(true);
  };

  const handleDeleteClick = () => {
    const selectedCourses = filteredCourses.filter((_, index) => checkboxes[index]);

    if (selectedCourses.length === 0) {
      setWarningMessage("Please select at least one course to delete!");
      return;
    }

    setCourseToDelete(selectedCourses);
    setIsDeleteWarningOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete || courseToDelete.length === 0) {
      console.error("No courses selected for deletion.");
      return;
    }

    try {
      await Promise.all(
        courseToDelete.map((course) =>
          Axios.delete(`/course/deleteCourse/${ course.id }`)
        )
      );

      // Refresh the course list after deletion
      fetchCourse();
      setIsDeleteWarningOpen(false);
    } catch (error) {
      console.error("Error deleting courses:", error.message);
      setError(`Error deleting courses: ${ error.message }`);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleYearFilterChange = (e) => {
    setYearFilter(e.target.value);
  };

  const handleTypeFilterChange = (e) => {
    setTypeFilter(e.target.value);
  };

  return (
    <div
      className="bg-cover bg-no-repeat min-h-screen flex justify-between items-center overflow-y-auto"
      style={{ backgroundImage: `url(${ Background })` }}
    >
      {/* Sidebar & Top Menu */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <TopMenu toggleSidebar={toggleSidebar} />

      {/* Main Content */}
      <div className="flex flex-col justify-center items-center h-screen w-full px-20">
        {/* Filters */}
        <div className="flex justify-end w-10/12 mb-4">
          <div className="flex gap-4 flex-wrap">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search by code or description"
              value={searchTerm}
              onChange={handleSearchChange}
              className="px-4 py-2 border rounded text-sm md:text-base"
            />

            {/* Year Filter */}
            <select
              value={yearFilter}
              onChange={handleYearFilterChange}
              className="px-4 py-2 border rounded text-sm md:text-base"
            >
              {uniqueYears.map((year) => (
                <option key={year} value={year}>
                  {year === "All" ? "All Year Level" : year}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={handleTypeFilterChange}
              className="px-4 py-2 border rounded text-sm md:text-base"
            >
              {uniqueTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "All" ? "All Type" : type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white p-6 rounded-lg flex flex-col items-center w-10/12 max-h-[60vh]">
          <div className="flex items-center bg-blue-600 text-white px-4 md:px-10 py-8 rounded-t-lg w-full">
            <h2 className="text-sm md:text-lg font-semibold flex-grow text-center">
              Course Configuration
            </h2>
          </div>

          {/* Scrollable Table */}
          <div className="overflow-auto w-full h-full flex-grow pt-6">
            <table className="text-center w-full border-collapse">
              <thead>
                <tr className="bg-blue-600/90">
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white border border-gray-300">
                    Code
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white border border-gray-300">
                    Description
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white border border-gray-300">
                    Duration
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white border border-gray-300">
                    Units
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white border border-gray-300">
                    Type
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white border border-gray-300">
                    Year Level
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white border border-gray-300">
                    <input
                      type="checkbox"
                      checked={isAllChecked}
                      onChange={handleMasterCheckboxChange}
                    />
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-gray-600 border border-gray-300">
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((course, index) => (
                  <tr
                    key={course.id}
                    className="hover:bg-customLightBlue2 border-t border-gray-300"
                  >
                    <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">
                      {course.Code}
                    </td>
                    <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">
                      {course.Description}
                    </td>
                    <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">
                      {course.Duration}
                    </td>
                    <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">
                      {course.Units}
                    </td>
                    <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">
                      {course.Type}
                    </td>
                    <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">
                      {course.Year}
                    </td>
                    <td className="py-2 border border-gray-300">
                      <input
                        type="checkbox"
                        checked={checkboxes[index] || false}
                        onChange={() => handleCheckboxChange(index)}
                      />
                    </td>
                    <td className="py-2 border border-gray-300">
                      <button
                        className="text-white rounded"
                        onClick={() => handleEditCourse(course)}
                      >
                        <img
                          src={editBtn}
                          className="w-9 h-9 md:w-15 md:h-15 hover:scale-110"
                          alt="Edit Course"
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Display "No courses found" message when filtered list is empty */}
            {filteredCourses.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No courses found matching your search criteria.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="fixed top-1/4 right-4 border border-gray-900 bg-customWhite rounded p-4 mr-5 flex flex-col gap-4">
        <button
          className="py-2 px-4 text-white rounded"
          onClick={handleAddCourseClick}
        >
          <img
            src={addBtn}
            className="w-12 h-12 md:w-25 md:h-25 hover:scale-110"
            alt="Add Course"
          />
        </button>
        <button
          className="py-2 px-4 text-white rounded"
          onClick={handleDeleteClick}
        >
          <img
            src={delBtn}
            className="w-12 h-12 md:w-25 md:h-25 hover:scale-110"
            alt="Delete Course"
          />
        </button>
      </div>

      {/* Warning Message */}
      {warningMessage && (
        <div className="fixed bottom-10 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-md">
          {warningMessage}
        </div>
      )}

      {/* Modals */}
      <AddCourseModal
        isOpen={isAddCourseModalOpen}
        onClose={handleAddCourseCloseModal}
        fetchCourse={fetchCourse}
      />

      <EditCourseModal
        isOpen={isEditCourseModalOpen}
        onClose={() => setIsEditCourseModalOpen(false)}
        course={courseToEdit}
        fetchCourse={fetchCourse}
        onUpdateSuccess={fetchCourse}
      />

      <DelCourseWarn
        isOpen={isDeleteWarningOpen}
        onClose={() => setIsDeleteWarningOpen(false)}
        onConfirm={handleConfirmDelete}
        coursesToDelete={courseToDelete}
        fetchCourse={fetchCourse}
      />
    </div>
  );
};

export default Course;