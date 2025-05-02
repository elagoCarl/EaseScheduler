import { useState, useEffect } from 'react';
import './modalStyles.css';

const ScheduleVariantModal = ({ 
  show, 
  onHide, 
  variants, 
  loading, 
  onSelectVariant, 
  departmentId 
}) => {
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [calendarView, setCalendarView] = useState([]); // For the calendar view data
  const [availableRooms, setAvailableRooms] = useState([]);
  
  // Process schedule data into calendar format when variant changes
  useEffect(() => {
    if (variants && variants.length > 0 && selectedVariant < variants.length) {
      generateCalendarData(variants[selectedVariant].schedules);
      
      // Extract all unique rooms
      const rooms = new Set();
      
      variants[selectedVariant].schedules.forEach(schedule => {
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
  }, [selectedVariant, variants]);

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

  const handleSaveVariant = async () => {
    if (variants && variants.length > 0) {
      setIsSaving(true);
      try {
        await onSelectVariant(selectedVariant);
        setNotification({ 
          show: true, 
          message: "Schedule variant saved successfully", 
          type: "success" 
        });
        
        // Auto-hide notification after 3 seconds
        setTimeout(() => {
          setNotification({ ...notification, show: false });
        }, 3000);
      } catch (error) {
        console.error("Error saving variant:", error);
        setNotification({ 
          show: true, 
          message: "Failed to save the selected schedule variant", 
          type: "error" 
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const closeNotification = () => {
    setNotification({ ...notification, show: false });
  };

  // Format time (24-hour format)
  const formatTime = (hour) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  // Get schedules for specific day and time
  const getSchedulesForSlot = (day, timeSlot) => {
    if (!variants || variants.length === 0 || !variants[selectedVariant]?.schedules) {
      return [];
    }
    
    return variants[selectedVariant].schedules.filter(schedule => {
      const scheduleDay = getDayName(schedule.Day);
      const startHour = parseInt(schedule.Start_time.split(':')[0]);
      const endHour = parseInt(schedule.End_time.split(':')[0]);
      const matchesRoom = schedule.Room === selectedRoom;
      
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

  if (!show) return null;

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="modalOverlay">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modalHeader">
          <h5 className="modalTitle">Schedule Variants</h5>
          <button className="closeButton" onClick={onHide}>&times;</button>
        </div>
        
        <div className="modalBody">
          {notification.show && (
            <div className={`notification ${notification.type === 'success' ? 'successNotification' : 'errorNotification'}`}>
              <span>{notification.message}</span>
              <button className="closeNotification" onClick={closeNotification}>&times;</button>
            </div>
          )}
          
          {loading ? (
            <div className="loadingContainer">
              <div className="spinner"></div>
              <p className="loadingText">Generating schedule variants...</p>
            </div>
          ) : variants && variants.length > 0 ? (
            <>
              <div className="variantTabs">
                {variants.map((variant, idx) => (
                  <button 
                    key={idx} 
                    className={`variantTab ${selectedVariant === idx ? 'activeTab' : ''}`}
                    onClick={() => setSelectedVariant(idx)}
                  >
                    {variant.variantName}
                  </button>
                ))}
              </div>
              
              <div className="variantContent">
                {variants.map((variant, idx) => (
                  selectedVariant === idx && (
                    <div key={idx} className="variantDetails">
                      <div className="variantStats">
                        <span className="statBadge successBadge">
                          {variant.schedules.length} Scheduled Classes
                        </span>
                        <span className="statBadge dangerBadge">
                          {variant.failedAssignations?.length || 0} Failed Assignments
                        </span>
                      </div>
                      
                      {/* Room Filter */}
                      {availableRooms.length > 0 && (
                        <div className="roomFilterContainer">
                          <div className="roomFilterLabel">Room Filter:</div>
                          <div className="roomFilterOptions">
                            {availableRooms.map(room => (
                              <button 
                                key={room}
                                className={`roomFilterBtn ${selectedRoom === room ? 'selectedRoom' : ''}`}
                                onClick={() => setSelectedRoom(room)}
                              >
                                {room}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Calendar View */}
                      <div className="calendarWrapper">
                        <div className="calendarContainer">
                          {/* Calendar Header */}
                          <div className="calendarHeader">
                            <div className="timeColumn">Time</div>
                            {days.map(day => (
                              <div key={day} className="dayColumn">
                                {day}
                              </div>
                            ))}
                          </div>
                          
                          {/* Calendar Body */}
                          <div className="calendarBody">
                            {calendarView.map(timeSlot => (
                              <div key={timeSlot} className="timeRow">
                                <div className="timeCell">
                                  {formatTime(timeSlot)}
                                </div>
                                
                                {days.map(day => {
                                  const schedules = getSchedulesForSlot(day, timeSlot);
                                  
                                  return (
                                    <div key={`${day}-${timeSlot}`} className="dayCell">
                                      {schedules.map((schedule, i) => (
                                        isFirstHourOfClass(schedule, timeSlot) && (
                                          <div 
                                            key={i} 
                                            className="scheduleBlock"
                                            style={{
                                              height: `${getClassDuration(schedule.Start_time, schedule.End_time) * 60}px`
                                            }}
                                          >
                                            <div className="scheduleTime">
                                              {schedule.Start_time} - {schedule.End_time}
                                            </div>
                                            <div className="scheduleSections">
                                              {Array.isArray(schedule.Sections) 
                                                ? schedule.Sections.join(", ")
                                                : schedule.Sections}
                                            </div>
                                            <div className="scheduleCourse">{schedule.Course}</div>
                                            <div className="scheduleProfessor">{schedule.Professor}</div>
                                            <div className="scheduleRoom">Room: {schedule.Room}</div>
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
                      
                      {variant.failedAssignations?.length > 0 && (
                        <div className="failedAssignments">
                          <h6 className="sectionTitle">Failed Assignments</h6>
                          <div className="tableContainer">
                            <table className="assignmentsTable">
                              <thead>
                                <tr>
                                  <th>Course</th>
                                  <th>Professor</th>
                                  <th>Reason</th>
                                </tr>
                              </thead>
                              <tbody>
                                {variant.failedAssignations.map((failed, i) => (
                                  <tr key={i}>
                                    <td>{failed.Course}</td>
                                    <td>{failed.Professor}</td>
                                    <td>{failed.reason}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                ))}
              </div>
            </>
          ) : (
            <p className="emptyMessage">No schedule variants available. Generate variants first.</p>
          )}
        </div>
        
        <div className="modalFooter">
          <button 
            className="cancelButton"
            onClick={onHide}
          >
            Close
          </button>
          <button
            className={`saveButton ${(!variants || variants.length === 0 || isSaving) ? 'disabledButton' : ''}`}
            onClick={handleSaveVariant}
            disabled={!variants || variants.length === 0 || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Selected Variant'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to convert day number to name
const getDayName = (dayNum) => {
  const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNum] || dayNum;
};

export default ScheduleVariantModal;