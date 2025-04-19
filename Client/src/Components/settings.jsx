import { useState, useEffect } from "react";
import Background from "./Img/5.jpg";
import Sidebar from "./callComponents/sideBar.jsx";
import TopMenu from "./callComponents/topMenu.jsx";
import Axios from '../axiosConfig.js';
import { useAuth } from '../Components/authContext.jsx';

const Settings = () => {
  const { user } = useAuth();
  const deptId = user?.DepartmentId;
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [settings, setSettings] = useState({
    StartHour: 7,
    EndHour: 19,
    ProfessorMaxHours: 12,
    StudentMaxHours: 12,
    ProfessorBreak: 1,
    MaxAllowedGap: 5,
    nextScheduleBreak: 0.5
  });
  const [originalSettings, setOriginalSettings] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const fetchSettings = async () => {
    try {
      // Use the new department-specific endpoint
      const response = await Axios.get(`/settings/getSettingsByDept/${deptId}`);
      console.log('API Response:', response.data);
      if (response.data.successful) {
        setSettings(response.data.data);
        setOriginalSettings(response.data.data); // Store original settings for comparison
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(`Error fetching settings: ${err.message}`);
    }
  };

  useEffect(() => {
    // Only fetch settings if we have a valid department ID
    if (deptId) {
      fetchSettings();
    } else {
      setError("No department ID found. Please ensure you're logged in with department access.");
    }
  }, [deptId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettings({
      ...settings,
      [name]: parseFloat(value)
    });
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    // Check if there are changes
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    if (hasChanges) {
      setShowSaveModal(true);
    } else {
      // If no changes, just exit edit mode
      setIsEditing(false);
    }
  };

  const handleCancelClick = () => {
    // Check if there are changes
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    if (hasChanges) {
      setShowCancelModal(true);
    } else {
      // If no changes, just exit edit mode
      setIsEditing(false);
    }
  };

  const handleSubmit = async () => {
    try {
      // Use the new department-specific update endpoint
      const response = await Axios.put(`/settings/updateSettingsByDept/${deptId}`, settings);
      if (response.data.successful) {
        setSuccessMessage("Department settings updated successfully!");
        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
        setOriginalSettings({ ...settings });
        setIsEditing(false);
        setShowSaveModal(false);
      } else {
        setError(response.data.data.message);
        setShowSaveModal(false);
      }
    } catch (err) {
      setError(`Error updating settings: ${err.response.data.message}`);
      setShowSaveModal(false);
    }
  };

  const handleCancelConfirm = () => {
    // Reset to original values
    setSettings({ ...originalSettings });
    setIsEditing(false);
    setShowCancelModal(false);
  };

  // Generate time options for dropdowns
  const generateTimeOptions = (start, end) => {
    const options = [];
    for (let i = start; i <= end; i++) {
      options.push(
        <option key={i} value={i}>
          {i < 10 ? `0${i}:00` : `${i}:00`}
        </option>
      );
    }
    return options;
  };

  // Modal component for Save confirmation
  const SaveConfirmationModal = () => {
    if (!showSaveModal) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <h3 className="text-lg font-semibold mb-4">Confirm Changes</h3>
          <p className="mb-6">Are you sure you want to save these changes to department settings?</p>
          <div className="flex justify-end gap-4">
            <button
              onClick={() => setShowSaveModal(false)}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-customBlue1 text-white rounded hover:bg-blue-700"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  const CancelConfirmationModal = () => {
    if (!showCancelModal) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <h3 className="text-lg font-semibold mb-4">Discard Changes</h3>
          <p className="mb-6">Are you sure you want to discard your changes?</p>
          <div className="flex justify-end gap-4">
            <button
              onClick={() => setShowCancelModal(false)}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Keep Editing
            </button>
            <button
              onClick={handleCancelConfirm}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Discard
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="bg-cover bg-no-repeat min-h-screen flex justify-between items-center overflow-y-auto"
      style={{ backgroundImage: `url(${Background})` }}
    >
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Top Menu */}
      <TopMenu toggleSidebar={toggleSidebar} />

      {/* Modals */}
      <SaveConfirmationModal />
      <CancelConfirmationModal />

      {/* Main Content */}
      <div className="flex flex-col justify-center items-center h-screen w-full px-20">
        {/* Settings Container */}
        <div className="bg-white rounded-lg flex flex-col items-center w-8/12 max-h-[80vh]">
          <div className="flex items-center bg-blue-500 text-white px-4 md:px-10 py-8 rounded-t-lg w-full">
            <h2 className="text-sm md:text-lg font-semibold flex-grow text-center">
              Department Settings Configuration
            </h2>
          </div>

          {!deptId && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mt-4 w-full">
              <span className="block sm:inline">No department ID found. Department-specific settings may not be available.</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mt-4 w-full">
              <span className="block sm:inline">{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4 w-full">
              <span className="block sm:inline">{error}</span>
              <button
                className="absolute top-0 bottom-0 right-0 px-4 py-3"
                onClick={() => setError(null)}
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>
          )}

          <div className="w-full p-6">
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* School Hours Section */}
                <div className="bg-blue-200/60 p-4 rounded-lg">
                  <h3 className="text-customBlue1 font-semibold mb-4">School Hours</h3>

                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Start Hour
                    </label>
                    <select
                      name="StartHour"
                      value={settings.StartHour}
                      onChange={handleInputChange}
                      disabled={!isEditing || !deptId}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-500 leading-tight focus:outline-none focus:shadow-outline"
                    >
                      {generateTimeOptions(0, 12)}
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      End Hour
                    </label>
                    <select
                      name="EndHour"
                      value={settings.EndHour}
                      onChange={handleInputChange}
                      disabled={!isEditing || !deptId}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-500 leading-tight focus:outline-none focus:shadow-outline"
                    >
                      {generateTimeOptions(13, 24)}
                    </select>
                  </div>
                </div>

                {/* Professor Settings */}
                <div className="bg-blue-200/60 p-4 rounded-lg">
                  <h3 className="text-customBlue1 font-semibold mb-4">Professor Settings</h3>

                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Max Hours per Day
                    </label>
                    <input
                      type="number"
                      name="ProfessorMaxHours"
                      value={settings.ProfessorMaxHours}
                      onChange={handleInputChange}
                      disabled={!isEditing || !deptId}
                      min="1"
                      max="24"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Break Hours (per continuous hours)
                    </label>
                    <input
                      type="number"
                      name="ProfessorBreak"
                      value={settings.ProfessorBreak}
                      onChange={handleInputChange}
                      disabled={!isEditing || !deptId}
                      min="0"
                      max="12"
                      step="0.5"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                  </div>
                </div>

                <div className="bg-blue-200/60 p-4 rounded-lg">
                  <h3 className="text-customBlue1 font-semibold mb-4">Student Settings</h3>

                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Max Hours per Day
                    </label>
                    <input
                      type="number"
                      name="StudentMaxHours"
                      value={settings.StudentMaxHours}
                      onChange={handleInputChange}
                      disabled={!isEditing || !deptId}
                      min="1"
                      max="24"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                  </div>
                </div>

                <div className="bg-blue-200/60 p-4 rounded-lg">
                  <h3 className="text-customBlue1 font-semibold mb-4">Schedule Settings</h3>

                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Max Allowed Gap (hours)
                    </label>
                    <input
                      type="number"
                      name="MaxAllowedGap"
                      value={settings.MaxAllowedGap}
                      onChange={handleInputChange}
                      disabled={!isEditing || !deptId}
                      min="0"
                      max="12"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Break Between Schedules (hours)
                    </label>
                    <input
                      type="number"
                      name="nextScheduleBreak"
                      value={settings.nextScheduleBreak}
                      onChange={handleInputChange}
                      disabled={!isEditing || !deptId}
                      min="0"
                      max="5"
                      step="0.5"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-start mt-6 gap-4">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveClick}
                      className="bg-blue-500 hover:bg-blue-800 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline transition duration-300 cursor-pointer"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelClick}
                      className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline transition duration-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    disabled={!deptId}
                    className="bg-blue-500 hover:bg-blue-800 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline transition duration-300 disabled:bg-blue-300 disabled:cursor-not-allowed"
                  >
                    Edit Settings
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;