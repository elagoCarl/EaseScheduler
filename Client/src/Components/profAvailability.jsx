import { useState, useEffect } from 'react';
import axios from '../axiosConfig.js';
import bg from './Img/bg.jpg';
import TopMenu from "./callComponents/topMenu.jsx";
import Sidebar from './callComponents/sideBar.jsx';
import DeleteWarning from './callComponents/deleteWarning.jsx';

const ProfAvailability = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({ day: "", professor: "", timeIn: "", timeOut: "" });
  const [scheduleData, setScheduleData] = useState([]);
  const [notification, setNotification] = useState(null);
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingAvailability, setFetchingAvailability] = useState(false);
  const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false);
  const [selectedAvailabilityId, setSelectedAvailabilityId] = useState(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hours = Array.from({ length: 15 }, (_, i) => 7 + i);
  const professorColors = ['bg-blue-300', 'bg-green-300', 'bg-purple-300', 'bg-yellow-300', 'bg-red-300', 'bg-indigo-300', 'bg-pink-300', 'bg-teal-300'];

  // Effects
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const fetchProfessors = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/prof/getAllProf`);
        if (response.data.successful) {
          setProfessors(response.data.data);
        } else {
          setNotification({ type: 'error', message: "Failed to load professors." });
        }
      } catch (error) {
        setNotification({ type: 'error', message: "Network error. Please check your connection." });
      } finally {
        setLoading(false);
      }
    };

    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    fetchProfessors();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!formData.professor) return;

    const fetchProfessorAvailability = async () => {
      setFetchingAvailability(true);
      try {
        const response = await axios.get(`/profAvail/getProfAvailByProf/${formData.professor}`);
        if (response.data.successful) {
          const availabilityData = response.data.data;
          setScheduleData(prevData => prevData.filter(item => item.professorId !== formData.professor && !item.isExisting));

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
          setNotification({ type: 'error', message: "Failed to load professor availability." });
        }
      } finally {
        setFetchingAvailability(false);
      }
    };
    fetchProfessorAvailability();
  }, [formData.professor, professors]);

  // Handlers
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (notification) setNotification(null);
  };

  const resetForm = () => {
    setFormData({ professor: "", day: "", timeIn: "", timeOut: "" });
    if (notification) setNotification(null);
  };

  const validateForm = () => {
    const { professor, day, timeIn, timeOut } = formData;
    if (!professor || !day || !timeIn || !timeOut) {
      setNotification({ type: 'error', message: "Please fill all fields" });
      return false;
    }

    const startHour = parseInt(timeIn);
    const endHour = parseInt(timeOut);
    if (startHour >= endHour) {
      setNotification({ type: 'error', message: "End time must be after start time" });
      return false;
    }

    const conflict = scheduleData.some(slot =>
      slot.day === day && slot.professorId === professor &&
      ((parseInt(slot.timeIn) <= startHour && parseInt(slot.timeOut) > startHour) ||
        (parseInt(slot.timeIn) < endHour && parseInt(slot.timeOut) >= endHour) ||
        (startHour <= parseInt(slot.timeIn) && endHour >= parseInt(slot.timeOut)))
    );

    if (conflict) {
      setNotification({ type: 'error', message: "Time slot conflicts with existing schedule" });
      return false;
    }
    return true;
  };

  const handleAdd = async () => {
    if (!validateForm()) return;

    const selectedProfessor = professors.find(prof => prof.id === parseInt(formData.professor));
    if (!selectedProfessor) {
      setNotification({ type: 'error', message: "Invalid professor selection" });
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
      const response = await axios.post(`/profAvail/addProfAvail`, availabilityData);

      if (response.data.successful) {
        let newId = response.data.data?.id
          ? `existing-${response.data.data.id}`
          : (response.data.id ? `existing-${response.data.id}` : (typeof response.data.data === 'number'
            ? `existing-${response.data.data}` : `existing-temp-${Date.now()}`));

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
        setNotification({ type: 'success', message: "Availability added successfully!" });
        resetForm();
      } else {
        setNotification({ type: 'error', message: `Failed to add: ${response.data.message || "Unknown error"}` });
      }
    } catch (error) {
      setNotification({ type: 'error', message: error.response?.data?.message || "Failed to add availability." });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const actualId = id.split('-')[1];
    setSelectedAvailabilityId(actualId);
    setIsDeleteWarningOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedAvailabilityId) return;

    try {
      setLoading(true);
      const response = await axios.delete(`/profAvail/deleteProfAvail/${selectedAvailabilityId}`);
      if (response.data.successful) {
        setScheduleData(scheduleData.filter(item => {
          const itemId = item.id.split('-')[1];
          return itemId !== selectedAvailabilityId;
        }));
        setNotification({ type: 'success', message: "Availability deleted successfully!" });
      } else {
        setNotification({ type: 'error', message: `Failed to delete: ${response.data.message || "Unknown error"}` });
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        setScheduleData(scheduleData.filter(item => {
          const itemId = item.id.split('-')[1];
          return itemId !== selectedAvailabilityId;
        }));
        setNotification({ type: 'error', message: "Item was already deleted on the server." });
      } else {
        setNotification({ type: 'error', message: error.response?.data?.message || "Failed to delete availability." });
      }
    } finally {
      setLoading(false);
      setIsDeleteWarningOpen(false);
      setSelectedAvailabilityId(null);
    }
  };

  // Helper functions
  const getScheduleForCell = (day, hour) => {
    return scheduleData.filter(schedule =>
      schedule.day === day &&
      parseInt(schedule.timeIn) <= hour &&
      parseInt(schedule.timeOut) > hour
    );
  };

  const getProfessorColor = (profId) => {
    const index = (parseInt(profId) - 1) % professorColors.length;
    return professorColors[index];
  };

  const formatTimeRange = (start, end) => `${start}:00 - ${end}:00`;

  // Components
  const ScheduleEvent = ({ schedule, day, hour }) => {
    const [hovered, setHovered] = useState(false);
    const isStartHour = parseInt(schedule.timeIn) === hour;

    if (!isStartHour) return null;

    const duration = parseInt(schedule.timeOut) - parseInt(schedule.timeIn);
    const heightClass = `h-${Math.min(duration * 24, 24)}`;

    return (
      <div
        onClick={() => handleDelete(schedule.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`absolute ${getProfessorColor(schedule.professorId)} p-2 rounded-lg shadow-sm border border-gray-200 left-0 right-0 mx-2 mb-1 transition-all cursor-pointer ${hovered ? 'z-50 scale-105' : 'z-10'}`}
        style={{
          top: '0',
          height: `${duration * 100}%`,
          maxHeight: hovered ? 'none' : `${duration * 100}%`
        }}
        title="Click to delete this availability"
      >
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium">{formatTimeRange(schedule.timeIn, schedule.timeOut)}</span>
        </div>
        <div className="text-sm font-semibold">{schedule.professorName}</div>
      </div>
    );
  };

  const renderMobileSchedule = (event) => (
    <div
      key={event.id}
      className="mb-3 relative cursor-pointer"
      onClick={() => handleDelete(event.id)}
    >
      <div className={`${getProfessorColor(event.professorId)} text-xs p-2 m-1 rounded shadow`}>
        <div className="flex justify-between items-center">
          <div className="font-bold">
            {event.professorName}
          </div>
        </div>
        <div>
          {formatTimeRange(event.timeIn, event.timeOut)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="fixed top-0 h-full z-50">
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      </div>

      <TopMenu toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />

      <div className="container mx-auto my-50 px-2 sm:px-4 pt-20 sm:pt-54 pb-6 sm:pb-10 flex-1 flex justify-center items-center">
        <div className="bg-white rounded-lg sm:rounded-xl shadow-lg sm:shadow-xl overflow-hidden w-full max-w-full">
          <div className="bg-blue-600 p-3 sm:p-5">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white ml-4">Professor Availability</h1>
            <p className="text-blue-100 mt-1 text-md sm:text-sm ml-4">Manage professor availability schedules</p>
          </div>

          {notification && (
            <div className={`mx-4 my-4 p-3 rounded-lg text-sm font-medium border ${notification.type === 'error' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-green-100 text-green-700 border-green-300'}`}>
              {notification.message}
            </div>
          )}

          <div className="flex flex-col lg:flex-row p-2">
            <div className="lg:w-1/4 p-3 sm:p-5 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-200">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label htmlFor="professor" className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">Professor:</label>
                  <select
                    id="professor"
                    name="professor"
                    value={formData.professor}
                    onChange={handleInputChange}
                    className="w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  {fetchingAvailability && <p className="text-xs text-blue-600 ml-1 mt-1">Loading availability data...</p>}
                </div>

                <div>
                  <label htmlFor="day" className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">Day:</label>
                  <select
                    id="day"
                    name="day"
                    value={formData.day}
                    onChange={handleInputChange}
                    className="w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Day</option>
                    {days.map(day => <option key={day} value={day}>{day}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="timeIn" className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">Time in:</label>
                    <select
                      id="timeIn"
                      name="timeIn"
                      value={formData.timeIn}
                      onChange={handleInputChange}
                      className="w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Time</option>
                      {hours.map(hour => <option key={hour} value={hour}>{hour}:00</option>)}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="timeOut" className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">Time out:</label>
                    <select
                      id="timeOut"
                      name="timeOut"
                      value={formData.timeOut}
                      onChange={handleInputChange}
                      className="w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Time</option>
                      {hours.map(hour => <option key={hour + 1} value={hour + 1}>{hour + 1}:00</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex pt-3 sm:pt-4 gap-2">
                  <button
                    onClick={resetForm}
                    className="flex flex-1 justify-center bg-red-500 text-white px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={loading || fetchingAvailability || !formData.professor || !formData.day || !formData.timeIn || !formData.timeOut}
                    className={`flex flex-1 justify-center ${loading || fetchingAvailability || !formData.professor || !formData.day || !formData.timeIn || !formData.timeOut
                      ? 'bg-blue-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-colors`}
                  >
                    {loading || fetchingAvailability ? 'Loading...' : 'Add Availability'}
                  </button>
                </div>
              </div>

              {scheduleData.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium mb-2 text-gray-700">Professor Legend:</h3>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(scheduleData.map(item => item.professorId))).map(profId => {
                      const prof = professors.find(p => p.id === parseInt(profId));
                      return prof ? (
                        <div key={profId} className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full ${getProfessorColor(profId)}`}></div>
                          <span className="text-xs font-medium">{prof.Name}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 italic">Click on any availability slot to delete it</p>
              </div>
            </div>

            <div className="lg:w-3/4 p-2 sm:p-4">
              <div className="w-full overflow-x-auto">
                {isMobileView ? (
                  <>
                    <div className="flex justify-between items-center bg-gray-50 border-b-2 border-gray-200 p-2 sticky top-0 z-10">
                      <span className="text-gray-700 font-medium text-xs sm:text-sm">Availability Schedule</span>
                      <select
                        className="rounded-lg px-2 py-1 text-xs bg-white border border-gray-200"
                        value={selectedDay}
                        onChange={e => setSelectedDay(parseInt(e.target.value, 10))}
                      >
                        {days.map((d, idx) => (
                          <option key={d} value={idx}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="p-2">
                      {(!scheduleData.length || !scheduleData.filter(event => event.day === days[selectedDay]).length) ? (
                        <div className="text-center py-8 text-gray-500">No availability schedules for this day</div>
                      ) : (
                        scheduleData
                          .filter(event => event.day === days[selectedDay])
                          .map(event => renderMobileSchedule(event))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="overflow-x-auto" style={{ minWidth: "100%" }}>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 sm:p-3 border-b-2 border-gray-200 bg-gray-50 text-gray-700 font-medium text-xs sm:text-sm text-left w-16 sm:w-20">
                            Time
                          </th>
                          {days.map(d => (
                            <th key={d} className="p-2 sm:p-3 border-b-2 text-center border-gray-200 bg-gray-50 text-gray-700 font-medium text-xs sm:text-sm">
                              {d}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hours.map(hour => (
                          <tr key={hour} className="hover:bg-gray-50">
                            <td className="p-2 sm:p-3 border-b border-gray-200 text-gray-700 font-medium text-xs sm:text-sm w-16 sm:w-20">
                              {`${hour.toString().padStart(2, '0')}:00`}
                            </td>
                            {days.map((day) => (
                              <td key={day} className="p-0 border-b border-gray-200 relative h-16 sm:h-20">
                                {getScheduleForCell(day, hour).map(schedule => (
                                  <ScheduleEvent
                                    key={`${schedule.id}-${hour}`}
                                    schedule={schedule}
                                    day={day}
                                    hour={hour}
                                  />
                                ))}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DeleteWarning
        isOpen={isDeleteWarningOpen}
        onClose={() => {
          setIsDeleteWarningOpen(false);
          setSelectedAvailabilityId(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default ProfAvailability;