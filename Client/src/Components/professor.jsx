import { useEffect, useState, useCallback } from "react";
import Background from "./Img/5.jpg";
import axios from "../axiosConfig"; // Updated: using configured Axios instance
import Sidebar from "./callComponents/sideBar.jsx";
import TopMenu from "./callComponents/topMenu.jsx";
import AddProfModal from "./callComponents/addProfModal.jsx";
import EditProfModal from "./callComponents/editProfModal.jsx";
import DeleteWarning from "./callComponents/deleteWarning.jsx";
import ProfessorSearchFilter from "./callComponents/professorSearchFilter.jsx";
import profV from "./Img/profV.png";
import addBtn from "./Img/addBtn.png";
import editBtn from "./Img/editBtn.png";
import delBtn from "./Img/delBtn.png";
import LoadingSpinner from "./callComponents/loadingSpinner.jsx";
import ErrorDisplay from "./callComponents/errDisplay.jsx";

const Professor = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [checkboxes, setCheckboxes] = useState([]);
  const [isAllChecked, setAllChecked] = useState(false);
  const [isAddProfModalOpen, setIsAddProfModalOpen] = useState(false);
  const [selectedProf, setSelectedProf] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false);
  const [professors, setProfessors] = useState([]);
  const [filteredProfessors, setFilteredProfessors] = useState([]); // State for filtered professors
  const [isDeleteBtnDisabled, setDeleteBtnDisabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch professors. The axios instance automatically sends cookies.
  const fetchProfessors = async () => {
    try {
      const response = await axios.get("/prof/getAllProf");
      if (response.data.successful) {
        const professorData = response.data.data;
        setProfessors(professorData);
        setFilteredProfessors(professorData); // Initialize filtered professors with all professors
        setCheckboxes(new Array(professorData.length).fill(false)); // Initialize checkboxes
      }
    } catch (error) {
      console.error("Failed to fetch professors:", error.message);
      setError("Error fetching professors: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Memoize the handleFilterChange function to prevent recreating it on every render
  const handleFilterChange = useCallback((filtered) => {
    setFilteredProfessors(filtered);
    // Reset checkboxes when filters change
    setCheckboxes(new Array(filtered.length).fill(false));
    setAllChecked(false);
    setDeleteBtnDisabled(true);
  }, []);

  // Open edit modal and fetch specific professor's data
  const handleEditClick = async (profId) => {
    try {
      const response = await axios.get(`/prof/getProf/${profId}`);
      const professorData = response.data.data;

      if (professorData && professorData.Name && professorData.Email) {
        setSelectedProf({
          ...professorData,
          StatusId: professorData.StatusId, // Store Status ID for editing
        });
        setIsEditModalOpen(true);
      } else {
        console.error("Invalid professor data:", professorData);
      }
    } catch (error) {
      console.error("Error fetching professor details:", error);
    }
  };

  // Log selectedProf after it has been updated
  useEffect(() => {
    if (selectedProf) {
      console.log("Selected Professor:", selectedProf);
    }
  }, [selectedProf]);

  // Handle updating professor details
  const handleUpdateProf = (updatedProf) => {
    setProfessors((prev) =>
      prev.map((prof) => (prof.id === updatedProf.id ? updatedProf : prof))
    );
    setIsEditModalOpen(false);
    fetchProfessors(); // Refresh the list after update
  };

  // Handle deleting professors
  const handleConfirmDelete = async () => {
    const selectedProfessors = filteredProfessors.filter((_, index) => checkboxes[index]);
    const idsToDelete = selectedProfessors.map((prof) => prof.id);

    if (idsToDelete.length === 0) {
      console.error("No professors selected for deletion.");
      return;
    }

    try {
      for (const id of idsToDelete) {
        await axios.delete(`/prof/deleteProf/${id}`);
      }
      // Refresh the professor list
      fetchProfessors();
      setIsDeleteWarningOpen(false); // Close the delete warning modal
      console.log("Deleted professors:", idsToDelete);
    } catch (error) {
      console.error("Error deleting professors:", error.message);
    }
  };

  useEffect(() => {
    fetchProfessors();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const handleMasterCheckboxChange = () => {
    const newState = !isAllChecked;
    setAllChecked(newState);
    setCheckboxes(new Array(filteredProfessors.length).fill(newState));
    setDeleteBtnDisabled(!newState);
  };

  const handleCheckboxChange = (index) => {
    const updatedCheckboxes = [...checkboxes];
    updatedCheckboxes[index] = !updatedCheckboxes[index];
    setCheckboxes(updatedCheckboxes);

    // Only check "All" if all visible checkboxes are checked
    const visibleCheckboxes = updatedCheckboxes.slice(0, filteredProfessors.length);
    setAllChecked(visibleCheckboxes.every((isChecked) => isChecked) && visibleCheckboxes.length > 0);

    const anyChecked = updatedCheckboxes.some((isChecked) => isChecked);
    setDeleteBtnDisabled(!anyChecked);
  };

  const handleAddProfClick = () => {
    setIsAddProfModalOpen(true);
  };

  const handleAddProfCloseModal = () => {
    setIsAddProfModalOpen(false);
    fetchProfessors(); // Refresh the list after adding
  };

  const handleDeleteClick = () => {
    setIsDeleteWarningOpen(true);
  };

  const handleCloseDelWarning = () => {
    setIsDeleteWarningOpen(false);
  };

  return (
    <div
      className="bg-cover bg-no-repeat min-h-screen flex justify-between items-center overflow-y-auto"
      style={{ backgroundImage: `url(${Background})` }}
    >
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <TopMenu toggleSidebar={toggleSidebar} />

      <div className="flex flex-col justify-center items-center h-screen w-full px-8">
        <div className="flex justify-end w-10/12 mb-4"></div>

        <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center w-10/12 max-h-[80vh]">
          <div className="flex items-center bg-blue-500 text-white px-4 md:px-10 py-4 rounded-t-lg w-full">
            <img src={profV} className="w-12 h-12 md:w-25 md:h-25" alt="Professor Icon" />
            <h2 className="text-sm md:text-lg font-semibold flex-grow text-center">Professors</h2>
          </div>

          {/* Add the search filter component */}
          <div className="w-full mt-4">
            <ProfessorSearchFilter professors={professors} onFilterChange={handleFilterChange} />
          </div>

          <div className="overflow-auto w-full h-full flex-grow">
            <table className="text-center w-full border-collapse">
              <thead>
                <tr className="bg-blue-600">
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white font-medium border border-gray-300">Name</th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white font-medium border border-gray-300">Email</th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white font-medium border border-gray-300">Total Units</th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white font-medium border border-gray-300">Teaching Status</th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white font-medium border border-gray-300">
                    <input type="checkbox" checked={isAllChecked} onChange={handleMasterCheckboxChange} />
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-gray-600 border border-gray-300"></th>
                </tr>
              </thead>
              <tbody>
                {filteredProfessors.map((professor, index) => (
                  <tr key={professor.id} className="hover:bg-customLightBlue2 border-t border-gray-300">
                    <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">{professor.Name}</td>
                    <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">{professor.Email}</td>
                    <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">{professor.Total_units}</td>
                    <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">{professor.Status}</td>
                    <td className="py-2 border border-gray-300">
                      <input
                        type="checkbox"
                        checked={checkboxes[index] || false}
                        onChange={() => handleCheckboxChange(index)}
                      />
                    </td>
                    <td className="py-2 border border-gray-300">
                      <button className="text-white rounded" onClick={() => handleEditClick(professor.id)}>
                        <img src={editBtn} className="w-9 h-9 md:w-15 md:h-15 hover:scale-110" alt="Edit Professor" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Display "No professors found" message when filtered list is empty */}
            {filteredProfessors.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No professors found matching your search criteria.
              </div>
            )}

            {isEditModalOpen && selectedProf && (
              <EditProfModal
                professor={selectedProf}
                onClose={() => setIsEditModalOpen(false)}
                onUpdate={handleUpdateProf}
              />
            )}
          </div>
        </div>
      </div>

      <div className="fixed top-1/4 right-4 border border-gray-900 bg-customWhite rounded p-4 flex flex-col gap-4">
        <button className="py-2 px-4 text-white rounded" onClick={handleAddProfClick}>
          <img src={addBtn} className="w-12 h-12 md:w-25 md:h-25 hover:scale-110" alt="Add Professor" />
        </button>
        <button className="py-2 px-4 text-white rounded" onClick={handleDeleteClick} disabled={isDeleteBtnDisabled}>
          <img src={delBtn} className="w-12 h-12 md:w-25 md:h-25 hover:scale-110" alt="Delete Professor" />
        </button>
      </div>

      <AddProfModal isOpen={isAddProfModalOpen} onClose={handleAddProfCloseModal} />
      <DeleteWarning isOpen={isDeleteWarningOpen} onClose={handleCloseDelWarning} onConfirm={handleConfirmDelete} />
    </div>
  );
};

export default Professor;
