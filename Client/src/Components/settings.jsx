import { useState, useEffect, useRef } from "react";
import Axios from '../axiosConfig.js';
import { useAuth } from '../Components/authContext.jsx';

const SettingsModal = ({ isOpen, closeSettingsModal }) => {
  const modalRef = useRef();
  const { user } = useAuth();
  const deptId = user?.DepartmentId;

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

  useEffect(() => {
    if (deptId && isOpen) {
      fetchSettings();
    }
  }, [deptId, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        closeSettingsModal();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, closeSettingsModal]);

  const fetchSettings = async () => {
    try {
      const response = await Axios.get(`/settings/getSettings`);
      if (response.data.successful) {
        setSettings(response.data.data);
        setOriginalSettings(JSON.parse(JSON.stringify(response.data.data))); // Deep copy
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(`Error fetching settings: ${err.message}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettings(prevSettings => ({
      ...prevSettings,
      [name]: parseFloat(value)
    }));
  };

  const hasUnsavedChanges = () => {
    if (!originalSettings) return false;
    
    // Compare each property
    return Object.keys(settings).some(key => {
      return settings[key] !== originalSettings[key];
    });
  };

  const handleSaveClick = () => {
    if (hasUnsavedChanges()) {
      setShowSaveModal(true);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancelClick = () => {
    if (hasUnsavedChanges()) {
      setShowCancelModal(true);
    } else {
      setIsEditing(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const response = await Axios.put(`/settings/updateSettings`, settings);
      if (response.data.successful) {
        setSuccessMessage("Department settings updated successfully!");
        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
        setOriginalSettings(JSON.parse(JSON.stringify(settings))); // Deep copy
        setIsEditing(false);
        setShowSaveModal(false);
      } else {
        setError(response.data.message || "Failed to update settings");
        setShowSaveModal(false);
      }
    } catch (err) {
      setError(`Error updating settings: ${err.response?.data?.message || err.message}`);
      setShowSaveModal(false);
    }
  };

  const handleCancelConfirm = () => {
    setSettings(JSON.parse(JSON.stringify(originalSettings))); // Deep copy
    setIsEditing(false);
    setShowCancelModal(false);
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50 overflow-auto">
      <div 
        ref={modalRef} 
        className="bg-gray-100 rounded-lg w-full max-w-4xl p-8 relative"
      >
        {/* Close button */}
        <button 
          onClick={closeSettingsModal} 
          className="absolute top-4 right-4 text-gray-900 hover:text-gray-700 text-2xl"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold text-center mb-6">Department Settings</h2>
        
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 p-3 rounded mb-4">
            {successMessage}
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Settings Form */}
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 rounded-md bg-white">
            
            {/* Start and End Hour */}
            <div>
              <label className="block mb-1 text-gray-700">Start Hour</label>
              <select
                name="StartHour"
                value={settings.StartHour}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full border p-2 rounded"
              >
                {generateTimeOptions(0, 12)}
              </select>
            </div>
            <div>
              <label className="block mb-1 text-gray-700">End Hour</label>
              <select
                name="EndHour"
                value={settings.EndHour}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full border p-2 rounded"
              >
                {generateTimeOptions(13, 24)}
              </select>
            </div>

            {/* Other Settings */}
            <div>
              <label className="block mb-1 text-gray-700">Professor Max Hours</label>
              <input
                type="number"
                name="ProfessorMaxHours"
                value={settings.ProfessorMaxHours}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full border p-2 rounded pl-4"
                min="1"
                max="24"
              />
            </div>
            <div>
              <label className="block mb-1 text-gray-700">Professor Break</label>
              <input
                type="number"
                name="ProfessorBreak"
                value={settings.ProfessorBreak}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full border p-2 rounded pl-4"
                min="0"
                step="0.5"
              />
            </div>

            <div>
              <label className="block mb-1 text-gray-700">Student Max Hours</label>
              <input
                type="number"
                name="StudentMaxHours"
                value={settings.StudentMaxHours}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full border p-2 rounded pl-4"
                min="1"
                max="24"
              />
            </div>

            <div>
              <label className="block mb-1 text-gray-700">Max Allowed Gap</label>
              <input
                type="number"
                name="MaxAllowedGap"
                value={settings.MaxAllowedGap}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full border p-2 rounded pl-4"
                min="0"
                max="12"
              />
            </div>

            <div>
              <label className="block mb-1 text-gray-700">Next Schedule Break</label>
              <input
                type="number"
                name="nextScheduleBreak"
                value={settings.nextScheduleBreak}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full border p-2 rounded pl-4"
                min="0"
                step="0.5"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-start mt-8 pb-4 gap-4">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveClick}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 duration-300"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelClick}
                  className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 duration-300"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 duration-300"
              >
                Edit Settings
              </button>
            )}
          </div>
        </form>

        {/* Save Confirmation Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Save Changes</h3>
              <p className="mb-6">Are you sure you want to save these changes?</p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                >
                  No
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Yes, Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Discard Changes</h3>
              <p className="mb-6">Are you sure you want to discard your changes?</p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                >
                  No
                </button>
                <button
                  onClick={handleCancelConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Yes, Discard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;