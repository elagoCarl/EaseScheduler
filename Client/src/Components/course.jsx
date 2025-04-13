import { useState, useEffect, useMemo } from "react";
import Background from "./Img/5.jpg";
import Sidebar from "./callComponents/sideBar.jsx";
import TopMenu from "./callComponents/topMenu.jsx";
import AddCourseModal from "./callComponents/addCourseModal.jsx";
import EditCourseModal from "./callComponents/editCourseModal.jsx";
import DelCourseWarn from "./callComponents/deleteWarning.jsx";
import Book from "./Img/Book.png";
import addBtn from "./Img/addBtn.png";
import editBtn from "./Img/editBtn.png";
import delBtn from "./Img/delBtn.png";
import Axios from '../axiosConfig.js';
import { useAuth } from '../Components/authContext.jsx';


const Course = () => {
  const { user } = useAuth();
  console.log("UUUUUUUUUUUUUSSSSERR: ", user);
  console.log("useridDDDDDDDDDDDDDDept: ", user.DepartmentId);
  const deptId = user.DepartmentId;
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [checkboxes, setCheckboxes] = useState(Array(50).fill(false)); // Example for multiple rows
  const [isAllChecked, setAllChecked] = useState(false);

  const [searchTerm, setSearchTerm] = useState(""); // Search term state
  const [yearFilter, setYearFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false); // Add CourseModal state
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false); // Edit CourseModal state
  const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false); // Delete Warning state
  const [courseToEdit, setCourseToEdit] = useState(null); // Course to edit state
  const [error, setError] = useState(null);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [courses, setCourses] = useState([]); // Initialize as an empty array
  const [updateTrigger, setUpdateTrigger] = useState(false); // 🔹 Trigger refetch

  // Move these inside the component and use useMemo for performance
  const uniqueYears = useMemo(() => {
    const yearsArray = [...new Set(courses.map(c => c.Year).filter(Boolean))];
    yearsArray.sort((a, b) => parseInt(a) - parseInt(b));
    return ["All", ...yearsArray];
  }, [courses]);

  const uniqueTypes = useMemo(() => {
    // Normalize all type strings
    const typesArray = courses
      .map(c => c.Type && c.Type.trim())  // => 'core' or 'professional'
      .filter(Boolean);

    // Make them unique
    const uniqueSet = new Set(typesArray); // => { 'core', 'professional' }

    return ["All", ...uniqueSet];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesSearch = !searchTerm ||
        (course.Code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.Description?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesYear =
        yearFilter === "All" ||
        parseInt(course.Year) === parseInt(yearFilter);

      const matchesType =
        typeFilter === "All" ||
        course.Type?.trim() === typeFilter.trim();


      return matchesSearch && matchesYear && matchesType;
    });
  }, [courses, searchTerm, yearFilter, typeFilter]);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const fetchCourse = async (deptId) => {
    try {
      const response = await Axios.get(`/course/getCoursesByDept/${deptId}`);
      console.log('API Response:', response.data);
      if (response.data.successful) {
        setCourses(response.data.data);
        console.log("response.data.data: ", response.data.data);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(`Error fetching courses: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchCourse(deptId);
    console.log("Fetching courses...");
  }, [deptId, updateTrigger]);

  useEffect(() => {
    if (courses.length > 0) {
      const allTypes = new Set(courses.map(c => c.Type));
      console.log("Available course types:", [...allTypes]);
    }
  }, [courses]);

  useEffect(() => {
    console.log("Courses after adding new one:", courses);
  }, [courses]);

  const handleMasterCheckboxChange = () => {
    const newState = !isAllChecked;
    setAllChecked(newState);
    setCheckboxes(Array(courses.length).fill(newState)); // Adjust to match courses length
  };

  const handleCheckboxChange = (index) => {
    const updatedCheckboxes = [...checkboxes];
    updatedCheckboxes[index] = !updatedCheckboxes[index];
    setCheckboxes(updatedCheckboxes);
    setAllChecked(updatedCheckboxes.every((isChecked) => isChecked));
  };

  const handleAddCourseClick = () => {
    setIsAddCourseModalOpen(true); // Open the add course modal when add button is clicked
  };

  const handleAddCourseCloseModal = () => {
    setIsAddCourseModalOpen(false); // Close the add course modal
  };

  const handleEditCourse = (course) => {
    setIsEditCourseModalOpen(true);
    if (!course) {
      console.error("No course selected for editing.");
      return;
    }

    setCourseToEdit(course); // ✅ Store the selected course
    setIsEditCourseModalOpen(true); // ✅ Open edit modal
  };

  const [warningMessage, setWarningMessage] = useState("");

  const handleDeleteClick = () => {
    const selectedCourses = courses.filter((_, index) => checkboxes[index]);

    if (selectedCourses.length === 0) {
      setWarningMessage("Please select at least one course to delete!");
      setTimeout(() => setWarningMessage(""), 3000); // Hide message after 3 seconds
      return;
    }

    console.log("Selected courses for deletion:", selectedCourses); // Debugging

    setCourseToDelete(selectedCourses);
    setIsDeleteWarningOpen(true);
  };


  const handleConfirmDelete = async () => {
    if (!courseToDelete || courseToDelete.length === 0) {
      console.error("No courses selected for deletion.");
      return;
    }

    try {
      console.log("Deleting courses:", courseToDelete);

      await Promise.all(
        courseToDelete.map((course) =>
          Axios.delete(`/course/deleteCourse/${course.id}`)
        )
      );

      console.log("Selected courses deleted successfully!");

      setCourses((prevCourses) =>
        prevCourses.filter((course) => !courseToDelete.some((del) => del.id === course.id))
      );

      // Reset states
      setCheckboxes(Array(courses.length).fill(false));
      setCourseToDelete([]);
      setIsDeleteWarningOpen(false);

    } catch (error) {
      console.error("Error deleting courses:", error.message);
    }
  };

  return (
    <div
      className="bg-cover bg-no-repeat min-h-screen flex justify-between items-center overflow-y-auto"
      style={{ backgroundImage: `url(${Background})` }}>
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Top Menu */}
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border rounded text-sm md:text-base"
            />

            {/* Year Filter */}
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-4 py-2 border rounded text-sm md:text-base">
              {uniqueYears.map((year, index) => (
                <option key={index} value={year}>
                  {year === "All" ? "Year Level" : year}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border rounded text-sm md:text-base">
              {uniqueTypes.map((type, index) => (
                <option key={index} value={type}>
                  {type === "All" ? "Select Type" : type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white p-4 pt-6 pb-12 rounded-lg flex flex-col items-center w-10/12 max-h-[60vh]">
          <div className="flex items-center bg-blue-600 text-white px-4 md:px-10 py-8 rounded-t-lg w-full">
            <img src={Book} className="w-12 h-12 md:w-25 md:h-25" alt="Course img" />
            <h2 className="text-sm md:text-lg font-semibold flex-grow text-center">
              Course Configuration
            </h2>
          </div>
          {/* Scrollable Table */}
          <div className="overflow-auto w-full h-full flex-grow pt-4 mb-10">
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
                        checked={checkboxes[index]}
                        onChange={() => handleCheckboxChange(index)} />
                    </td>
                    <td className="py-2 border border-gray-300">
                      <button className=" text-white rounded "
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
          </div>
        </div>
      </div>
      {/* Vertical Buttons Container */}
      <div className="fixed top-1/4 right-4 border border-gray-900 bg-customWhite rounded p-4 flex flex-col gap-4">
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
          onClick={() => handleDeleteClick(courseToDelete)}>
          <img
            src={delBtn}
            className="w-12 h-12 md:w-25 md:h-25 hover:scale-110"
            alt="Delete Course"
          />
        </button>

        {/* Warning Message */}
        {warningMessage && (
          <div className="fixed bottom-10 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-md">
            {warningMessage}
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      <AddCourseModal
        isOpen={isAddCourseModalOpen}
        onClose={handleAddCourseCloseModal}
        fetchCourse={fetchCourse} // Refresh courses after adding
      />
      {/* Edit Course Modal */}
      <EditCourseModal
        isOpen={isEditCourseModalOpen}
        onClose={() => {
          setIsEditCourseModalOpen(false);
          setCourseToEdit(null);
        }}
        course={courseToEdit} // Pass the course to edit
        fetchCourse={fetchCourse} // Refresh courses after editing
        onUpdateSuccess={fetchCourse}
      />
      {/* Delete Warning Modal */}
      <DelCourseWarn
        isOpen={isDeleteWarningOpen}
        onClose={() => setIsDeleteWarningOpen(false)}
        onConfirm={handleConfirmDelete}
        coursesToDelete={courseToDelete} // Pass selected courses for context
        fetchCourse={fetchCourse} // Refresh courses after deleting
      />
    </div>
  );
};

export default Course;