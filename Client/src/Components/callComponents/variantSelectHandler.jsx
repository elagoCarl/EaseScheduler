import React, { useState, useEffect } from 'react';

const ScheduleVariantModal = ({ 
  show, 
  onHide, 
  variants, 
  loading, 
  onSelectVariant, 
  departmentId 
}) => {
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState('All Rooms');
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [calendarView, setCalendarView] = useState([]); // For the calendar view data
  const [availableRooms, setAvailableRooms] = useState(['All Rooms']);
  
  // Process schedule data into calendar format when variant changes
  useEffect(() => {
    if (variants && variants.length > 0 && selectedVariant < variants.length) {
      generateCalendarData(variants[selectedVariant].schedules);
      
      // Extract all unique rooms
      const rooms = new Set();
      rooms.add('All Rooms');
      
      variants[selectedVariant].schedules.forEach(schedule => {
        if (schedule.Room) {
          rooms.add(schedule.Room);
        }
      });
      
      setAvailableRooms(Array.from(rooms));
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
      const matchesRoom = selectedRoom === 'All Rooms' || schedule.Room === selectedRoom;
      
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

  const modalStyles = {
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '4px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
      width: '90%',
      maxWidth: '1200px',
      maxHeight: '90vh',
      overflow: 'auto',
      position: 'relative'
    },
    modalHeader: {
      padding: '1rem',
      borderBottom: '1px solid #e9ecef',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    modalBody: {
      padding: '1rem',
      maxHeight: 'calc(90vh - 130px)',
      overflow: 'auto'
    },
    modalFooter: {
      padding: '1rem',
      borderTop: '1px solid #e9ecef',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '0.5rem'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      cursor: 'pointer'
    },
    button: {
      padding: '0.375rem 0.75rem',
      borderRadius: '0.25rem',
      border: '1px solid transparent',
      cursor: 'pointer',
      fontWeight: 400,
      textAlign: 'center',
      userSelect: 'none'
    },
    primaryButton: {
      backgroundColor: '#0d6efd',
      borderColor: '#0d6efd',
      color: 'white'
    },
    secondaryButton: {
      backgroundColor: '#6c757d',
      borderColor: '#6c757d',
      color: 'white'
    },
    disabledButton: {
      opacity: 0.65,
      pointerEvents: 'none'
    },
    tabs: {
      display: 'flex',
      borderBottom: '1px solid #dee2e6',
      marginBottom: '1rem'
    },
    tab: {
      padding: '0.5rem 1rem',
      cursor: 'pointer',
      borderBottom: '2px solid transparent'
    },
    activeTab: {
      borderBottomColor: '#0d6efd',
      color: '#0d6efd'
    },
    calendarContainer: {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      overflow: 'hidden'
    },
    calendarHeader: {
      display: 'flex',
      borderBottom: '1px solid #e9ecef',
      backgroundColor: '#f8f9fa'
    },
    calendarHeaderCell: {
      flex: 1,
      padding: '0.75rem',
      fontWeight: 'bold',
      textAlign: 'center',
      borderRight: '1px solid #e9ecef'
    },
    calendarTimeColumn: {
      width: '80px',
      minWidth: '80px',
      textAlign: 'right',
      paddingRight: '10px',
      borderRight: '1px solid #e9ecef',
      fontWeight: 'bold'
    },
    calendarRow: {
      display: 'flex',
      borderBottom: '1px solid #e9ecef',
      minHeight: '50px'
    },
    calendarCell: {
      flex: 1,
      padding: '4px',
      borderRight: '1px solid #e9ecef',
      position: 'relative',
      minHeight: '50px'
    },
    classBlock: {
      backgroundColor: '#e3f2fd',
      borderRadius: '4px',
      padding: '4px 8px',
      fontSize: '0.85rem',
      marginBottom: '4px',
      overflow: 'hidden',
      border: '1px solid #90caf9',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    },
    badge: {
      padding: '0.25em 0.4em',
      fontSize: '0.75em',
      fontWeight: 700,
      borderRadius: '0.25rem',
      display: 'inline-block',
      marginRight: '0.5rem'
    },
    successBadge: {
      backgroundColor: '#198754',
      color: 'white'
    },
    dangerBadge: {
      backgroundColor: '#dc3545',
      color: 'white'
    },
    infoBadge: {
      backgroundColor: '#0dcaf0',
      color: 'white'
    },
    secondaryBadge: {
      backgroundColor: '#6c757d',
      color: 'white'
    },
    notification: {
      padding: '0.75rem 1.25rem',
      marginBottom: '1rem',
      borderRadius: '0.25rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    successNotification: {
      backgroundColor: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb'
    },
    errorNotification: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb'
    },
    spinner: {
      display: 'inline-block',
      width: '2rem',
      height: '2rem',
      border: '0.25em solid rgba(0, 0, 0, 0.1)',
      borderRightColor: '#0d6efd',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    },
    viewToggle: {
      display: 'flex',
      justifyContent: 'flex-end',
      marginBottom: '1rem'
    },
    viewToggleButton: {
      padding: '0.25rem 0.5rem',
      marginLeft: '0.5rem',
      borderRadius: '0.25rem',
      border: '1px solid #dee2e6',
      backgroundColor: '#fff',
      cursor: 'pointer'
    },
    viewToggleButtonActive: {
      backgroundColor: '#e9ecef',
      fontWeight: 'bold'
    },
    tableView: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '1rem'
    },
    tableHeader: {
      backgroundColor: '#f8f9fa',
      borderBottom: '2px solid #dee2e6'
    },
    tableCell: {
      padding: '0.75rem',
      borderTop: '1px solid #dee2e6',
      borderBottom: '1px solid #dee2e6'
    },
    roomFilter: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '1rem',
      gap: '0.5rem'
    },
    select: {
      padding: '0.375rem 0.75rem',
      fontSize: '1rem',
      lineHeight: 1.5,
      color: '#495057',
      backgroundColor: '#fff',
      backgroundClip: 'padding-box',
      border: '1px solid #ced4da',
      borderRadius: '0.25rem',
      transition: 'border-color .15s ease-in-out,box-shadow .15s ease-in-out'
    },
    roomBadge: {
      fontSize: '0.75rem',
      padding: '0.25rem 0.5rem',
      borderRadius: '2rem',
      backgroundColor: '#e9ecef',
      display: 'inline-block',
      cursor: 'pointer',
      margin: '0.25rem',
      border: '1px solid transparent'
    },
    activeRoomBadge: {
      backgroundColor: '#0d6efd',
      color: 'white',
      borderColor: '#0d6efd'
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div style={modalStyles.modalOverlay} onClick={onHide}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.modalHeader}>
          <h5 style={{ margin: 0 }}>Schedule Variants</h5>
          <button style={modalStyles.closeButton} onClick={onHide}>&times;</button>
        </div>
        <div style={modalStyles.modalBody}>
          {notification.show && (
            <div 
              style={{
                ...modalStyles.notification, 
                ...(notification.type === 'success' 
                  ? modalStyles.successNotification 
                  : modalStyles.errorNotification)
              }}
            >
              <span>{notification.message}</span>
              <button 
                style={modalStyles.closeButton} 
                onClick={closeNotification}
              >
                &times;
              </button>
            </div>
          )}
          
          {loading ? (
            <div style={modalStyles.loadingContainer}>
              <div style={modalStyles.spinner}></div>
              <p style={{ marginTop: '1rem' }}>Generating schedule variants...</p>
            </div>
          ) : variants && variants.length > 0 ? (
            <>
              <div style={modalStyles.tabs}>
                {variants.map((variant, idx) => (
                  <div 
                    key={idx} 
                    style={{
                      ...modalStyles.tab,
                      ...(selectedVariant === idx ? modalStyles.activeTab : {})
                    }}
                    onClick={() => setSelectedVariant(idx)}
                  >
                    {variant.variantName}
                  </div>
                ))}
              </div>
              
              <div>
                {variants.map((variant, idx) => (
                  selectedVariant === idx && (
                    <div key={idx}>
                      <div style={{ marginBottom: '1rem' }}>
                        <span style={{ ...modalStyles.badge, ...modalStyles.successBadge }}>
                          {variant.schedules.length} Scheduled Classes
                        </span>
                        <span style={{ ...modalStyles.badge, ...modalStyles.dangerBadge }}>
                          {variant.failedAssignations?.length || 0} Failed Assignments
                        </span>
                      </div>
                      
                      {/* Room Filter */}
                      <div style={modalStyles.roomFilter}>
                        <label htmlFor="roomFilter">Room Filter:</label>
                        <div>
                          {availableRooms.map(room => (
                            <span 
                              key={room}
                              style={{
                                ...modalStyles.roomBadge,
                                ...(selectedRoom === room ? modalStyles.activeRoomBadge : {})
                              }}
                              onClick={() => setSelectedRoom(room)}
                            >
                              {room}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Calendar View */}
                      <div style={modalStyles.calendarContainer}>
                        {/* Calendar Header */}
                        <div style={modalStyles.calendarHeader}>
                          <div style={modalStyles.calendarTimeColumn}>Time</div>
                          {days.map(day => (
                            <div key={day} style={modalStyles.calendarHeaderCell}>
                              {day}
                            </div>
                          ))}
                        </div>
                        
                        {/* Calendar Body */}
                        {calendarView.map(timeSlot => (
                          <div key={timeSlot} style={modalStyles.calendarRow}>
                            <div style={modalStyles.calendarTimeColumn}>
                              {formatTime(timeSlot)}
                            </div>
                            
                            {days.map(day => {
                              const schedules = getSchedulesForSlot(day, timeSlot);
                              
                              return (
                                <div key={`${day}-${timeSlot}`} style={modalStyles.calendarCell}>
                                  {schedules.map((schedule, i) => (
                                    isFirstHourOfClass(schedule, timeSlot) && (
                                      <div 
                                        key={i} 
                                        style={{
                                          ...modalStyles.classBlock,
                                          height: `calc(${getClassDuration(schedule.Start_time, schedule.End_time)} * 100%)`
                                        }}
                                      >
                                        <div style={{ fontWeight: 'bold' }}>
                                          {schedule.Start_time} - {schedule.End_time}
                                        </div>
                                        <div>
                                          {Array.isArray(schedule.Sections) 
                                            ? schedule.Sections.join(", ")
                                            : schedule.Sections}
                                        </div>
                                        <div style={{ fontWeight: 'bold' }}>{schedule.Course}</div>
                                        <div>{schedule.Professor}</div>
                                        <div>
                                          <strong>Room:</strong> {schedule.Room}
                                        </div>
                                      </div>
                                    )
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                      
                      {variant.failedAssignations?.length > 0 && (
                        <div style={{ marginTop: '1.5rem' }}>
                          <h5>Failed Assignments</h5>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={modalStyles.tableView}>
                              <thead style={modalStyles.tableHeader}>
                                <tr>
                                  <th style={modalStyles.tableCell}>Course</th>
                                  <th style={modalStyles.tableCell}>Professor</th>
                                  <th style={modalStyles.tableCell}>Reason</th>
                                </tr>
                              </thead>
                              <tbody>
                                {variant.failedAssignations.map((failed, i) => (
                                  <tr key={i}>
                                    <td style={modalStyles.tableCell}>{failed.Course}</td>
                                    <td style={modalStyles.tableCell}>{failed.Professor}</td>
                                    <td style={modalStyles.tableCell}>{failed.reason}</td>
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
            <p style={{ textAlign: 'center' }}>No schedule variants available. Generate variants first.</p>
          )}
        </div>
        <div style={modalStyles.modalFooter}>
          <button 
            style={{
              ...modalStyles.button,
              ...modalStyles.secondaryButton
            }}
            onClick={onHide}
          >
            Close
          </button>
          <button
            style={{
              ...modalStyles.button,
              ...modalStyles.primaryButton,
              ...(!variants || variants.length === 0 || isSaving ? modalStyles.disabledButton : {})
            }}
            onClick={handleSaveVariant}
            disabled={!variants || variants.length === 0 || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Selected Variant'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Helper function to convert day number to name
const getDayName = (dayNum) => {
  const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNum] || dayNum;
};

export default ScheduleVariantModal;