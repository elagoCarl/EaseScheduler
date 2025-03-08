import React, { useState, useEffect } from "react";
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
import Axios from 'axios';

const deptId = 1;

const Course = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [checkboxes, setCheckboxes] = useState(Array(50).fill(false)); // Example for multiple rows
  const [isAllChecked, setAllChecked] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState("Select Campus");

  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false); // Add CourseModal state
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false); // Edit CourseModal state
  const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false); // Delete Warning state
  const [courseToEdit, setCourseToEdit] = useState(null); // Course to edit state
  const campuses = ["Campus A", "Campus B", "Campus C"];

  const [successMessage, setSuccessMessage] = useState("");
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [courses, setCourses] = useState([]); // Initialize as an empty array
  const [updateTrigger, setUpdateTrigger] = useState(false); // 🔹 Trigger refetch

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const fetchCourse = async () => {
    try {
      const response = await Axios.get('http://localhost:8080/course/getAllCourses');
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
  fetchCourse();
  console.log("Fetching courses...");
}, [updateTrigger]);


useEffect(() => {
  if (courses.length > 0) {
    setCheckboxes(Array(courses.length).fill(false)); // Reset checkboxes
  }
}, [courses]); // 🔹 Removed success message here

const handleDeleteCourse = async (courseId) => {
  if (!courseId) return;

  try {
    const response = await Axios.delete(`http://localhost:8080/course/deleteCourse/${courseId}`);
    if (response.data.successful) {
      setUpdateTrigger((prev) => !prev); // ✅ Trigger re-fetch
    }
  } catch (error) {
    console.error("Error deleting course:", error);
  }
};

  const handleAddCourse = async (newCourse) => {
  try {
    const response = await Axios.post("http://localhost:8080/course/addCourse", newCourse);
    if (response.data.successful) {
      setUpdateTrigger((prev) => !prev); // ✅ Trigger re-fetch
    }
  } catch (error) {
    console.error("Error adding course:", error);
  }
};


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

const handleEditCourseClick = (course) => {
  if (!course) {
    console.error("No course selected for editing.");
    return;
  }
  
  setCourseToEdit(course); // ✅ Store the selected course
  setIsEditCourseModalOpen(true); // ✅ Open edit modal
};


  const handleEditCourseCloseModal = () => {
    setIsEditCourseModalOpen(false); // Close the edit course modal
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
        Axios.delete(`http://localhost:8080/course/deleteCourse/${course.id}`)
      )
    );

    console.log("Selected courses deleted successfully!");

    // ✅ Update state directly without calling fetchCourse()
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
          <div className="flex gap-4">
            {/* Campus Dropdown */}
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="px-4 py-2 border rounded text-sm md:text-base">
              <option disabled>Select Campus</option>
              {campuses.map((campus, index) => (
                <option key={index} value={campus}>
                  {campus}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Table Container */}
        <div className="bg-white p-4 rounded-lg flex flex-col items-center w-10/12 max-h-[60vh]">
          <div className="flex items-center bg-customBlue1 text-white px-4 md:px-10 py-8 rounded-t-lg w-full">
            <img src={Book} className="w-12 h-12 md:w-25 md:h-25 hover:scale-110" alt="Course img" />
            <h2 className="text-sm md:text-lg font-semibold flex-grow text-center">
              Course Configuration
            </h2>
          </div>
          {/* Scrollable Table */}
          <div className="overflow-auto w-full h-full flex-grow">
            <table className="text-center w-full border-collapse">
              <thead>
                <tr className="bg-customLightBlue2">
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-gray-600 border border-gray-300">
                    Code
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-gray-600 border border-gray-300">
                    Description
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-gray-600 border border-gray-300">
                    Duration
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-gray-600 border border-gray-300">
                    Units
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-gray-600 border border-gray-300">
                    Type
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-gray-600 border border-gray-300">
                    Year Level
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-gray-600 border border-gray-300">
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
                {courses.map((course, index) => (
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
                        onClick={() => handleEditCourseClick(course)}
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
        onClose={handleEditCourseCloseModal}
        course={courseToEdit} // Pass the course to edit
        fetchCourse={fetchCourse} // Refresh courses after editing
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
