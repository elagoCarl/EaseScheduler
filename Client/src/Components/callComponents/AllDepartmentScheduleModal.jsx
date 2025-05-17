// AllDepartmentScheduleModal.jsx
import { useState, useEffect } from 'react';
import axios from '../../axiosConfig.js';
import './modalStyles.css';

const AllDepartmentScheduleModal = ({ 
  show, 
  onHide, 
  schoolYearId,
  semester,
  onComplete
}) => {
  const [isAutomating, setIsAutomating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [activeScheduleView, setActiveScheduleView] = useState(false);
  const [departmentSchedules, setDepartmentSchedules] = useState([]);
  const [viewingDepartmentName, setViewingDepartmentName] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [calendarView, setCalendarView] = useState([]);

  // Constants for days
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Fetch departments when the modal is shown
  useEffect(() => {
    if (show) {
      fetchDepartments();
    }
  }, [show]);

  // Process schedule data into calendar format when department schedules change
  useEffect(() => {
    if (departmentSchedules && departmentSchedules.length > 0) {
      generateCalendarData(departmentSchedules);
      
      // Extract all unique rooms
      const rooms = new Set();
      
      departmentSchedules.forEach(schedule => {
        if (schedule.Room) {
          rooms.add(schedule.Room);
        }
      });
      
      const roomsArray = Array.from(rooms);
      setAvailableRooms(roomsArray);
      
      // Set default selected room to the first room in the list
      if (roomsArray.length > 0 && !selectedRoom) {
        setSelectedRoom(roomsArray[0]);
      }
    }
  }, [departmentSchedules]);

  // Generate calendar view data from schedules
  const generateCalendarData = (schedules) => {
    if (!schedules || schedules.length === 0) {
      setCalendarView([]);
      return;
    }

    // Get all unique time slots
    const allTimeSlots = new Set();
    schedules.forEach(schedule => {
      const startHour = parseInt(schedule.Start_time.split(':')[0]);
      const endHour = parseInt(schedule.End_time.split(':')[0]);
      
      for (let hour = startHour; hour <= endHour; hour++) {
        allTimeSlots.add(hour);
      }
    });

    // Sort times
    const sortedTimes = Array.from(allTimeSlots).sort((a, b) => a - b);
    
    // Generate time slots with 1-hour increments
    const timeSlots = [];
    for (let i = Math.max(7, sortedTimes[0] - 1); i <= Math.min(21, sortedTimes[sortedTimes.length - 1] + 1); i++) {
      timeSlots.push(i);
    }

    setCalendarView(timeSlots);
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/dept/getAllDept');
      if (response.data.successful) {
        setDepartments(response.data.data);
        setProgress({ current: 0, total: response.data.data.length });
      } else {
        setNotification({
          show: true,
          message: `Failed to fetch departments: ${response.data.message}`,
          type: 'error'
        });
      }
    } catch (error) {
      setNotification({
        show: true,
        message: 'Error fetching departments',
        type: 'error'
      });
    }
  };

  const handleStartAutomation = async () => {
    if (!schoolYearId || !semester) {
      setNotification({
        show: true,
        message: 'School year and semester must be selected',
        type: 'error'
      });
      return;
    }

    setIsAutomating(true);
    setResults(null);
    setNotification({ show: false });

    try {
      const response = await axios.post('/schedule/generateAllDepartmentSchedule', {
        semester,
        SchoolYearId: parseInt(schoolYearId),
        variantCount: 1
      });

      if (response.data.successful) {
        setResults(response.data);
        setNotification({
          show: true,
          message: `Successfully generated schedules for all departments. Total: ${response.data.totalSchedules} schedules.`,
          type: 'success'
        });
      } else {
        setNotification({
          show: true,
          message: `Failed to generate schedules: ${response.data.message}`,
          type: 'error'
        });
      }
    } catch (error) {
      setNotification({
        show: true,
        message: error.response?.data?.message || 'An error occurred while generating schedules',
        type: 'error'
      });
    } finally {
      setIsAutomating(false);
    }
  };

  const handleSaveAllSchedules = async () => {
    if (!results) return;

    setIsSaving(true);
    try {
      const response = await axios.post('/schedule/saveAllDepartmentSchedule', {
        departmentSchedules: results.departmentSchedules,
        semester
      });

      if (response.data.successful) {
        setNotification({
          show: true,
          message: `Successfully saved ${response.data.totalSaved} schedules across all departments.`,
          type: 'success'
        });
        
        // Wait a moment to show the success message before closing
        setTimeout(() => {
          onComplete && onComplete();
          onHide();
        }, 2000);
      } else {
        setNotification({
          show: true,
          message: `Failed to save schedules: ${response.data.message}`,
          type: 'error'
        });
      }
    } catch (error) {
      setNotification({
        show: true,
        message: error.response?.data?.message || 'An error occurred while saving schedules',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewDepartmentSchedules = (deptId) => {
    if (!results || !results.departmentSchedules) return;
    
    // Get department name
    const dept = departments.find(d => d.id.toString() === deptId);
    setViewingDepartmentName(dept ? dept.Name : `Department ${deptId}`);
    
    // Get schedules for the selected department
    const schedules = deptId === 'all' 
      ? Object.values(results.departmentSchedules).flat() 
      : results.departmentSchedules[deptId] || [];
    
    setDepartmentSchedules(schedules);
    setActiveScheduleView(true);
    setSelectedRoom(''); // Reset selected room when viewing new department
  };

  const handleChangeDepartment = (e) => {
    setSelectedDepartment(e.target.value);
  };

  const handleBackToResults = () => {
    setActiveScheduleView(false);
    setDepartmentSchedules([]);
    setViewingDepartmentName('');
    setSelectedRoom('');
    setAvailableRooms([]);
  };

  // Format time (24-hour format)
  const formatTime = (hour) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  // Get schedules for specific day and time
  const getSchedulesForSlot = (day, timeSlot) => {
    if (!departmentSchedules || departmentSchedules.length === 0) {
      return [];
    }
    
    return departmentSchedules.filter(schedule => {
      const scheduleDay = getDayName(schedule.Day);
      const startHour = parseInt(schedule.Start_time.split(':')[0]);
      const endHour = parseInt(schedule.End_time.split(':')[0]);
      const matchesRoom = !selectedRoom || schedule.Room === selectedRoom;
      
      return scheduleDay === day && startHour <= timeSlot && endHour > timeSlot && matchesRoom;
    });
  };

  // Get class duration in hours
  const getClassDuration = (startTime, endTime) => {
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);
    return endHour - startHour;
  };

  // Determines if a schedule item is the first hour of a multi-hour class
  const isFirstHourOfClass = (schedule, timeSlot) => {
    const startHour = parseInt(schedule.Start_time.split(':')[0]);
    return startHour === timeSlot;
  };

  // Helper function to convert day number to name
  const getDayName = (dayNum) => {
    const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[dayNum] || dayNum;
  };

  if (!show) return null;

  return (
    <div className="modalOverlay">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modalHeader">
          <h5 className="modalTitle">All Department Schedule Automation</h5>
          <button className="closeButton" onClick={onHide}>&times;</button>
        </div>
        
        <div className="modalBody">
          {notification.show && (
            <div className={`notification ${notification.type === 'success' ? 'successNotification' : notification.type === 'error' ? 'errorNotification' : 'infoNotification'}`}>
              <span>{notification.message}</span>
              <button className="closeNotification" onClick={() => setNotification({ ...notification, show: false })}>&times;</button>
            </div>
          )}
          
          {activeScheduleView ? (
            // View showing department schedules with timetable
            <div className="max-h-[70vh] overflow-y-auto px-2">
              <div className="flex items-center mb-4 pb-2 border-b border-gray-200">
                <button 
                  onClick={handleBackToResults} 
                  className="px-3 py-1 bg-gray-100 border border-gray-300 rounded-md text-sm mr-4 hover:bg-gray-200 transition-colors"
                >
                  &larr; Back to Results
                </button>
                <h3 className="text-lg font-semibold text-gray-700 m-0">{viewingDepartmentName} Schedules</h3>
              </div>
              
              {departmentSchedules.length === 0 ? (
                <div className="text-center py-8 text-gray-500 italic">
                  No schedules generated for this department.
                </div>
              ) : (
                <div>
                  {/* Stats badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      {departmentSchedules.length} Scheduled Classes
                    </span>
                  </div>
                  
                  {/* Room Filter */}
                  {availableRooms.length > 0 && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-sm font-medium text-gray-700 mb-2">Room Filter:</div>
                      <div className="flex flex-wrap gap-2">
                        <button 
                          className={`px-2 py-1 text-xs rounded-md transition-colors ${!selectedRoom 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          onClick={() => setSelectedRoom('')}
                        >
                          All Rooms
                        </button>
                        {availableRooms.map(room => (
                          <button 
                            key={room}
                            className={`px-2 py-1 text-xs rounded-md transition-colors ${selectedRoom === room 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                            onClick={() => setSelectedRoom(room)}
                          >
                            {room}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Calendar View */}
                  <div className="w-full overflow-x-auto border border-gray-200 rounded-lg">
                    <div className="min-w-[800px]">
                      {/* Calendar Header */}
                      <div className="flex border-b border-gray-200">
                        <div className="w-20 bg-gray-50 p-3 font-medium text-gray-700 border-r border-gray-200">
                          Time
                        </div>
                        {days.map(day => (
                          <div key={day} className="flex-1 p-3 bg-gray-50 font-medium text-gray-700 border-r border-gray-200 text-center">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      {/* Calendar Body */}
                      {calendarView.map(timeSlot => (
                        <div key={timeSlot} className="flex border-b border-gray-200">
                          <div className="w-20 p-2 text-sm font-medium text-gray-600 border-r border-gray-200 flex-shrink-0">
                            {formatTime(timeSlot)}
                          </div>
                          
                          {days.map(day => {
                            const schedules = getSchedulesForSlot(day, timeSlot);
                            return (
                              <div key={`${day}-${timeSlot}`} className="flex-1 p-1 border-r border-gray-200 min-h-[60px] relative">
                                {schedules.map((schedule, i) => (
                                  isFirstHourOfClass(schedule, timeSlot) && (
                                    <div 
                                      key={i} 
                                      className="absolute left-0 right-0 mx-1 p-1 bg-blue-100 border border-blue-300 rounded text-xs overflow-hidden"
                                      style={{
                                        height: `${getClassDuration(schedule.Start_time, schedule.End_time) * 60 - 2}px`,
                                        zIndex: 10
                                      }}
                                    >
                                      <div className="font-bold text-blue-800">
                                        {schedule.Start_time.substring(0, 5)} - {schedule.End_time.substring(0, 5)}
                                      </div>
                                      <div className="text-blue-800 truncate">
                                        {Array.isArray(schedule.Sections) 
                                          ? schedule.Sections.join(", ")
                                          : schedule.Sections}
                                      </div>
                                      <div className="font-medium text-blue-900 truncate">{schedule.Course}</div>
                                      <div className="text-blue-800 truncate">{schedule.Professor}</div>
                                      <div className="text-blue-700 truncate">Room: {schedule.Room}</div>
                                    </div>
                                  )
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Main view
            <div>
              <div className="automationDescription">
                <p>This tool will automatically generate schedules for all departments in the following steps:</p>
                <ol className="automationSteps">
                  <li>Schedule each department one by one</li>
                  <li>Store assignations that fail due to room constraints</li>
                  <li>After all departments are processed, try to schedule failed assignations with relaxed room constraints</li>
                </ol>
                
                <div className="warningBox">
                  <div className="warningIcon">⚠️</div>
                  <div className="warningText">
                    <strong>Important:</strong> This process may take several minutes depending on the number of departments and assignations.
                    <br />
                    Make sure you have selected the correct school year and semester.
                  </div>
                </div>
              </div>
              
              {isAutomating ? (
                <div className="loadingContainer">
                  <div className="spinner"></div>
                  <p className="loadingText">Generating schedules for all departments...</p>
                  <div className="progressTracker">
                    <div className="progressText">
                      Processing departments: {progress.current}/{progress.total}
                    </div>
                    <div className="progressBar">
                      <div 
                        className="progressFill" 
                        style={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ) : results ? (
                <div className="resultsContainer">
                  <h6 className="resultsSummary">
                    Successfully generated {results.totalSchedules} schedules across {Object.keys(results.departmentSchedules).length} departments
                  </h6>
                  
                  <div className="flex flex-col gap-3 mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <label htmlFor="departmentSelect" className="font-medium text-gray-700">Select Department to View Schedules:</label>
                    <select 
                      id="departmentSelect" 
                      value={selectedDepartment}
                      onChange={handleChangeDepartment}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="all">All Departments</option>
                      {Object.entries(results.departmentSchedules).map(([deptId, schedules]) => {
                        const department = departments.find(d => d.id.toString() === deptId);
                        return (
                          <option key={deptId} value={deptId}>
                            {department?.Name || `Department ${deptId}`} ({schedules.length} schedules)
                          </option>
                        );
                      })}
                    </select>
                    
                    <button 
                      onClick={() => handleViewDepartmentSchedules(selectedDepartment)}
                      className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm transition-colors"
                    >
                      View Schedules
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="bg-gray-100 text-left py-2 px-3 text-gray-700 font-medium">Department</th>
                          <th className="bg-gray-100 text-left py-2 px-3 text-gray-700 font-medium">Schedules Generated</th>
                          <th className="bg-gray-100 text-left py-2 px-3 text-gray-700 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(results.departmentSchedules).map(([deptId, schedules]) => {
                          const department = departments.find(d => d.id.toString() === deptId);
                          return (
                            <tr key={deptId}>
                              <td className="py-2 px-3 border-b border-gray-200">{department?.Name || `Department ${deptId}`}</td>
                              <td className="py-2 px-3 border-b border-gray-200">{schedules.length}</td>
                              <td className="py-2 px-3 border-b border-gray-200">
                                <button 
                                  onClick={() => handleViewDepartmentSchedules(deptId)} 
                                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md transition-colors"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="startMessage">
                  <p>Click "Start Automation" to begin scheduling all departments.</p>
                  <p className="selectedInfo">
                    Selected School Year: <strong>{schoolYearId ? `ID: ${schoolYearId}` : "None"}</strong><br />
                    Selected Semester: <strong>{semester || "None"}</strong>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="modalFooter">
          <button 
            className="cancelButton"
            onClick={onHide}
            disabled={isAutomating}
          >
            Close
          </button>
          
          {!activeScheduleView && (
            !results ? (
              <button
                className={`automateButton ${isAutomating || !schoolYearId || !semester ? 'disabledButton' : ''}`}
                onClick={handleStartAutomation}
                disabled={isAutomating || !schoolYearId || !semester}
              >
                {isAutomating ? 'Processing...' : 'Start Automation'}
              </button>
            ) : (
              <button
                className={`saveButton ${isSaving ? 'disabledButton' : ''}`}
                onClick={handleSaveAllSchedules}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save All Generated Schedules'}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default AllDepartmentScheduleModal;