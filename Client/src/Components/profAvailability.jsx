import { useState, useEffect } from 'react';
import axios from 'axios';
import Image3 from './Img/3.jpg';
import TopMenu from "./callComponents/topMenu.jsx";
import Sidebar from './callComponents/sideBar.jsx';

const ProfAvailability = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({ day: "", professor: "", timeIn: "", timeOut: "" });
  const [scheduleData, setScheduleData] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingAvailability, setFetchingAvailability] = useState(false);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hours = Array.from({ length: 15 }, (_, i) => 7 + i);
  const apiBase = 'http://localhost:8080';

  // Fetch professors
  useEffect(() => {
    const fetchProfessors = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${apiBase}/prof/getAllProf`);
        if (response.data.successful) {
          setProfessors(response.data.data);
        } else {
          setErrorMessage("Failed to load professors. Please try again later.");
        }
      } catch (error) {
        setErrorMessage("Network error. Please check your connection.");
        console.error("Error fetching professors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfessors();
  }, []);

  // Fetch professor availability
  useEffect(() => {
    if (!formData.professor) return;

    const fetchProfessorAvailability = async () => {
      setFetchingAvailability(true);
      try {
        const response = await axios.get(`${apiBase}/profAvail/getProfAvailByProf/${formData.professor}`);
        if (response.data.successful) {
          const availabilityData = response.data.data;

          // Clear existing schedule data for this professor
          setScheduleData(prevData => prevData.filter(item =>
            item.professorId !== formData.professor && !item.isExisting
          ));

          if (availabilityData) {
            const processedData = Array.isArray(availabilityData) ? availabilityData : [availabilityData];
            const formattedAvailability = processedData.map(avail => {
              const selectedProfessor = professors.find(prof => prof.id === parseInt(formData.professor));
              return {
                id: `existing-${avail.id}`,
                professorId: formData.professor,
                professorName: selectedProfessor?.Name || "Unknown Professor",
                day: avail.Day,
                timeIn: avail.Start_time.split(':')[0],
                timeOut: avail.End_time.split(':')[0],
                isExisting: true
              };
            });

            setScheduleData(prev => [...prev, ...formattedAvailability]);
          }
        }
      } catch (error) {
        if (!(error.response && error.response.status === 404)) {
          setErrorMessage("Failed to load professor availability. Please try again.");
          console.error("Error fetching availability:", error);
        }
      } finally {
        setFetchingAvailability(false);
      }
    };

    fetchProfessorAvailability();
  }, [formData.professor, professors]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrorMessage("");
  };

  const resetForm = () => {
    setFormData({ professor: "", day: "", timeIn: "", timeOut: "" });
    setErrorMessage("");
  };

  const validateForm = () => {
    const { professor, day, timeIn, timeOut } = formData;

    if (!professor || !day || !timeIn || !timeOut) {
      setErrorMessage("Please fill all fields");
      return false;
    }

    const startHour = parseInt(timeIn);
    const endHour = parseInt(timeOut);

    if (startHour >= endHour) {
      setErrorMessage("End time must be after start time");
      return false;
    }

    // Check for time slot conflicts
    const conflict = scheduleData.some(slot =>
      slot.day === day &&
      slot.professorId === professor &&
      ((parseInt(slot.timeIn) <= startHour && parseInt(slot.timeOut) > startHour) ||
        (parseInt(slot.timeIn) < endHour && parseInt(slot.timeOut) >= endHour) ||
        (startHour <= parseInt(slot.timeIn) && endHour >= parseInt(slot.timeOut)))
    );

    if (conflict) {
      setErrorMessage("Time slot conflicts with existing schedule");
      return false;
    }

    return true;
  };

  const handleAdd = async () => {
    if (!validateForm()) return;

    const selectedProfessor = professors.find(prof => prof.id === parseInt(formData.professor));
    if (!selectedProfessor) {
      setErrorMessage("Invalid professor selection");
      return;
    }

    try {
      const startHour = parseInt(formData.timeIn);
      const endHour = parseInt(formData.timeOut);

      const availabilityData = {
        ProfessorId: parseInt(formData.professor),
        Day: formData.day,
        Start_time: `${startHour.toString().padStart(2, '0')}:00:00`,
        End_time: `${endHour.toString().padStart(2, '0')}:00:00`
      };

      setLoading(true);
      const response = await axios.post(`${apiBase}/profAvail/addProfAvail`, availabilityData);

      // Debug the response structure
      console.log("Server response:", response.data);

      if (response.data.successful) {
        // Try to extract ID from the response, with fallbacks
        let newId;

        if (response.data.data && typeof response.data.data === 'object' && response.data.data.id) {
          // Case 1: ID is in data.id
          newId = `existing-${response.data.data.id}`;
        } else if (response.data.id) {
          // Case 2: ID might be directly in response.data.id
          newId = `existing-${response.data.id}`;
        } else if (typeof response.data.data === 'number') {
          // Case 3: The data itself might be the ID
          newId = `existing-${response.data.data}`;
        } else {
          // Fallback: Use timestamp if no ID available
          console.warn("No ID format found in server response:", response.data);
          newId = `existing-temp-${Date.now()}`;
        }

        // Create new schedule entry
        const newSchedule = {
          id: newId,
          professorId: formData.professor,
          professorName: selectedProfessor.Name,
          day: formData.day,
          timeIn: startHour.toString(),
          timeOut: endHour.toString(),
          isExisting: true
        };

        setScheduleData([...scheduleData, newSchedule]);
        resetForm();

        // After adding, refresh the professor's availability data to ensure sync
        fetchProfessorAvailability(formData.professor);
      } else {
        setErrorMessage(`Failed to add: ${response.data.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error adding availability:", error);
      const errorMsg = error.response?.data?.message || "Failed to add availability. Please try again.";
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to fetch a specific professor's availability
  const fetchProfessorAvailability = async (professorId) => {
    try {
      const response = await axios.get(`${apiBase}/profAvail/getProfAvailByProf/${professorId}`);
      if (response.data.successful) {
        const availabilityData = response.data.data;

        // Clear existing schedule data for this professor
        setScheduleData(prevData => prevData.filter(item =>
          item.professorId !== professorId || !item.isExisting
        ));

        if (availabilityData) {
          const processedData = Array.isArray(availabilityData) ? availabilityData : [availabilityData];
          const formattedAvailability = processedData.map(avail => {
            const selectedProfessor = professors.find(prof => prof.id === parseInt(professorId));
            return {
              id: `existing-${avail.id}`,
              professorId: professorId,
              professorName: selectedProfessor?.Name || "Unknown Professor",
              day: avail.Day,
              timeIn: avail.Start_time.split(':')[0],
              timeOut: avail.End_time.split(':')[0],
              isExisting: true
            };
          });

          setScheduleData(prev => [...prev, ...formattedAvailability]);
        }
      }
    } catch (error) {
      console.error("Error refreshing availability:", error);
    }
  };

  const handleDelete = async (id, isExisting) => {
    if (isExisting) {
      if (!window.confirm("Are you sure you want to delete this existing availability?")) return;

      // Extract the actual ID from the format "existing-{id}"
      // Check if it's a temporary ID first (for newly added items that might not have a server ID yet)
      if (id.includes('existing-temp-')) {
        // This is a temporary ID, just remove from UI
        setScheduleData(scheduleData.filter(item => item.id !== id));
        return;
      }

      const actualId = id.split('-')[1];

      try {
        setLoading(true);
        const response = await axios.delete(`${apiBase}/profAvail/deleteProfAvail/${actualId}`);
        if (response.data.successful) {
          // Update local state on success
          setScheduleData(scheduleData.filter(item => item.id !== id));
        } else {
          setErrorMessage(`Failed to delete: ${response.data.message || "Unknown error"}`);
        }
      } catch (error) {
        console.error("Delete error:", error);

        // Special handling for 404 errors (item not found)
        if (error.response && error.response.status === 404) {
          // Item not found in database - update UI anyway to keep in sync
          setScheduleData(scheduleData.filter(item => item.id !== id));
          setErrorMessage("Item was already deleted on the server or could not be found. UI has been updated.");
        } else {
          setErrorMessage(error.response?.data?.message || "Failed to delete availability. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Non-existing items (local only) - just remove from state
      setScheduleData(scheduleData.filter(item => item.id !== id));
    }
  };

  const getScheduleForCell = (day, hour) => {
    return scheduleData.filter(schedule =>
      schedule.day === day &&
      parseInt(schedule.timeIn) <= hour &&
      parseInt(schedule.timeOut) > hour
    );
  };

  const getProfessorColor = (profId, isExisting) => {
    const colors = ['blue', 'green', 'purple', 'yellow', 'red', 'indigo', 'pink', 'teal'];
    const index = profId % colors.length;
    const shade = isExisting ? '300' : '200';
    return `bg-${colors[index]}-${shade}`;
  };

  return (
    <div className="main bg-cover bg-no-repeat min-h-screen flex justify-center items-center xs:h-full" style={{ backgroundImage: `url(${Image3})` }}>
      <div className='fixed top-0 h-full z-50'>
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      </div>

      <TopMenu toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />

      <div className="flex flex-col items-center text-center w-full">
        <h1 className="font-bold text-white text-xl md:text-3xl mt-20 mb-6 text-center">Professor Availability</h1>

        <div className="flex flex-wrap md:flex-nowrap gap-5 w-full max-w-6xl justify-center items-start px-5 xs:px-15 mt-4">
          {/* Form Section */}
          <div className="bg-white mr-0 md:mr-8 text-gray-900 p-6 rounded-lg shadow-lg w-full max-w-md md:w-1/3">
            <h2 className="text-lg font-semibold mb-4 text-center">Add Availability</h2>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{errorMessage}</div>
            )}

            <div className="mb-4">
              <label htmlFor="professor" className="block text-md font-medium mb-1 text-start ml-2">Professor:</label>
              <select
                id="professor"
                name="professor"
                value={formData.professor}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Select Professor</option>
                {loading ? (
                  <option value="" disabled>Loading professors...</option>
                ) : (
                  professors.map(prof => (
                    <option key={prof.id} value={prof.id}>
                      {prof.Name} {prof.Status ? `(${prof.Status})` : ''}
                    </option>
                  ))
                )}
              </select>
              {fetchingAvailability && <p className="text-xs text-blue-600 ml-2 mt-1">Loading availability data...</p>}
            </div>

            <div className="mb-4">
              <label htmlFor="day" className="block text-md font-medium mb-1 text-start ml-2">Day:</label>
              <select
                id="day"
                name="day"
                value={formData.day}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Day</option>
                {days.map(day => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="timeIn" className="block text-md font-medium mb-1 text-start ml-2">Time in:</label>
              <select
                id="timeIn"
                name="timeIn"
                value={formData.timeIn}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Time</option>
                {hours.map(hour => <option key={hour} value={hour}>{hour}:00</option>)}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="timeOut" className="block text-md font-medium mb-1 text-start ml-2">Time out:</label>
              <select
                id="timeOut"
                name="timeOut"
                value={formData.timeOut}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Time</option>
                {hours.map(hour => <option key={hour + 1} value={hour + 1}>{hour + 1}:00</option>)}
              </select>
            </div>

            <div className="flex justify-end space-x-4 mt-5">
              <button
                onClick={resetForm}
                className="bg-gray-300 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-400 transition duration-200"
              >
                Reset
              </button>
              <button
                onClick={handleAdd}
                disabled={loading || fetchingAvailability || !formData.professor || !formData.day || !formData.timeIn || !formData.timeOut}
                className={`${loading || fetchingAvailability || !formData.professor || !formData.day || !formData.timeIn || !formData.timeOut
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'} text-white px-8 py-2 rounded-lg transition duration-200`}
              >
                {loading || fetchingAvailability ? 'Loading...' : 'Add'}
              </button>
            </div>
          </div>

          {/* Timetable Section */}
          <div className="bg-white w-full md:w-2/3 p-4 rounded-lg shadow-lg overflow-x-auto mt-5 md:mt-0">
            <h2 className="text-lg font-semibold mb-4">Weekly Schedule</h2>
            {fetchingAvailability ? (
              <div className="text-center py-10"><p>Loading professor availability...</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-auto w-full text-left border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100 text-center">
                      <th className="p-2 border border-gray-300 bg-blue-50">Time</th>
                      {days.map(day => <th key={day} className="p-2 border border-gray-300 bg-blue-50">{day}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {hours.map(hour => (
                      <tr key={hour}>
                        <td className="p-2 border border-gray-300 text-center font-medium">{hour}:00</td>
                        {days.map(day => {
                          const schedules = getScheduleForCell(day, hour);
                          return (
                            <td key={day} className="p-0 border border-gray-300 relative h-12">
                              {schedules.map(schedule => (
                                <div
                                  key={schedule.id}
                                  className={`absolute inset-0 m-px flex items-center justify-center ${getProfessorColor(parseInt(schedule.professorId), schedule.isExisting)}`}
                                  onClick={() => handleDelete(schedule.id, schedule.isExisting)}
                                  title={`${schedule.professorName} (${schedule.isExisting ? 'Existing' : 'New'}) - Click to remove`}
                                >
                                  <span className="text-xs font-medium overflow-hidden text-ellipsis whitespace-nowrap px-1">
                                    {schedule.professorName}
                                  </span>
                                </div>
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {scheduleData.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Professor Legend:</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(scheduleData.map(item => item.professorId))).map(profId => {
                    const prof = professors.find(p => p.id === parseInt(profId));
                    const hasExisting = scheduleData.some(s => s.professorId === profId && s.isExisting);
                    const hasNew = scheduleData.some(s => s.professorId === profId && !s.isExisting);

                    return prof ? (
                      <div key={profId} className="flex flex-col">
                        <span className="text-xs font-medium mb-1">{prof.Name}:</span>
                        <div className="flex gap-1">
                          {hasExisting && (
                            <span className={`inline-block px-3 py-1 rounded-full text-xs ${getProfessorColor(parseInt(profId), true)}`}>
                              Existing
                            </span>
                          )}
                          {hasNew && (
                            <span className={`inline-block px-3 py-1 rounded-full text-xs ${getProfessorColor(parseInt(profId), false)}`}>
                              New
                            </span>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
                <p className="text-xs mt-2 italic">(Click on a schedule item to remove it)</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfAvailability;