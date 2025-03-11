import React, { useState } from 'react';
import dayjs from 'dayjs';
import TopMenu from "./callComponents/topMenu.jsx";
import Sidebar from './callComponents/sideBar.jsx';
import Image3 from './Img/3.jpg';

const ProfTimetable = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [selectedProfessor, setSelectedProfessor] = useState('Dr. Pacquiao');

    const toggleSidebar = () => {
        setSidebarOpen(!isSidebarOpen);
    };

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    // Define a list of professors (adjust this list as needed)
    const professors = [
        'Dr. Pacquiao', 
        'Dr. Smith', 
        'Prof. Johnson', 
        'Ms. Garcia', 
        'Dr. Lee', 
        'Prof. Williams', 
        'Dr. Chen',
        'Dr. Rodriguez',
        'Prof. Kumar'
    ];

    // Sample events data (you can add more events or modify as necessary)
    const events = [
        { id: 1, start: '08:00', end: '10:00', course: 'Life and Works of Pacman', professor: 'Dr. Pacquiao', section: 'CS4A', day: 2, room: 'Room 101' },
        { id: 2, start: '10:00', end: '12:00', course: 'Advanced Algorithms', professor: 'Dr. Smith', section: 'CS5B', day: 1, room: 'Room 101' },
        { id: 3, start: '13:00', end: '15:00', course: 'Database Systems', professor: 'Prof. Johnson', section: 'IT3A', day: 3, room: 'Room 101' },
        { id: 4, start: '15:30', end: '17:30', course: 'Web Development', professor: 'Ms. Garcia', section: 'CS4B', day: 4, room: 'Room 101' },
        { id: 5, start: '16:00', end: '17:00', course: 'Ethics in Computing', professor: 'Dr. Lee', section: 'CS3C', day: 0, room: 'Room 101' },
        { id: 6, start: '17:00', end: '20:00', course: 'Network Security Lab', professor: 'Prof. Williams', section: 'IT4A', day: 2, room: 'Room 101' },
        { id: 7, start: '19:00', end: '21:00', course: 'Mobile App Development', professor: 'Dr. Chen', section: 'CS5A', day: 5, room: 'Room 101' },
        { id: 8, start: '09:00', end: '11:00', course: 'Data Structures', professor: 'Dr. Rodriguez', section: 'CS2B', day: 5, room: 'Room 101' },
        { id: 9, start: '09:00', end: '11:00', course: 'Computer Architecture', professor: 'Prof. Kumar', section: 'CS3A', day: 3, room: 'Room 101' },
    ];

    const formatTimeRange = (start, end) => {
        return `${start} - ${end}`;
    };

    const calculateEventPosition = (event) => {
        const startHour = parseInt(event.start.split(':')[0]);
        const startMinute = parseInt(event.start.split(':')[1]);
        const endHour = parseInt(event.end.split(':')[0]);
        const endMinute = parseInt(event.end.split(':')[1]);
        
        // Calculate duration in hours (including partial hours)
        const duration = (endHour - startHour) + (endMinute - startMinute) / 60;
        // Calculate top position as percentage within the hour
        const topOffset = (startMinute / 60) * 100;
        
        return {
            top: `${topOffset}%`,
            height: `${duration * 100}%`,
        };
    };

    const renderEventInCell = (hour, dayIndex) => {
        const filteredEvents = events.filter(event => {
            // Only show events for the selected professor
            if (event.professor !== selectedProfessor) return false;
            
            const eventStartHour = parseInt(event.start.split(':')[0]);
            const eventEndHour = parseInt(event.end.split(':')[0]);
            const eventEndMinute = parseInt(event.end.split(':')[1]);
            
            // Check if this event belongs in this hour cell
            return event.day === dayIndex && 
                  eventStartHour <= hour && 
                  (eventEndHour > hour || (eventEndHour === hour && eventEndMinute > 0));
        });

        return filteredEvents.map(event => {
            const eventStartHour = parseInt(event.start.split(':')[0]);
            // Only render the event in its starting hour cell
            if (eventStartHour === hour) {
                const position = calculateEventPosition(event);
                return (
                    <div
                        key={event.id}
                        className="absolute bg-blue-50 p-2 rounded-lg shadow-sm border border-blue-200 left-0 right-0 mx-1 transition-all hover:shadow-md hover:scale-[1.02] text-blue-700 overflow-y-auto scrollbar-hide"
                        style={{
                            top: position.top,
                            height: position.height,
                            zIndex: 10,
                        }}
                    >
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-medium">{formatTimeRange(event.start, event.end)}</span>
                            <span className="text-xs font-medium bg-blue-100 px-1 rounded">{event.section}</span>
                        </div>
                        <div className="text-sm font-semibold">{event.course}</div>
                        <div className="text-xs">{event.room}</div>
                    </div>
                );
            }
            return null;
        });
    };

    // Generate time slots from 7am to 9pm
    const timeSlots = Array.from({ length: 15 }, (_, i) => 7 + i);

    return (
        <div 
            className="min-h-screen flex flex-col"
            style={{
                backgroundImage: `url(${Image3})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div className="fixed top-0 h-full z-50">
                <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            </div>

            <TopMenu toggleSidebar={toggleSidebar} />

            <div className="container mx-auto px-2 sm:px-4 pt-20 pb-10 flex-1 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden w-full">
                    {/* Header section */}
                    <div className="relative bg-blue-600 p-4 sm:p-6">
                        <h1 className="text-xl sm:text-2xl font-bold text-white">Professor Timetable</h1>
                        <p className="text-blue-100 mt-1">Schedule for {selectedProfessor}</p>

                        <div className="flex items-center gap-2 mt-4">
                            <div className="flex items-center gap-2 ml-auto">
                                <select
                                    value={selectedProfessor}
                                    onChange={(e) => setSelectedProfessor(e.target.value)}
                                    className="rounded-lg px-3 py-1 sm:px-4 sm:py-2 bg-white text-gray-800 border-0 
                                        focus:ring-2 focus:ring-blue-500 focus:outline-none
                                        text-sm"
                                >
                                    {professors.map(prof => (
                                        <option key={prof} value={prof}>{prof}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Calendar content - improved table responsiveness */}
                    <div className="overflow-x-auto">
                        <div className="p-2 sm:p-4 min-w-[600px]">
                            {/* Desktop view */}
                            <div className="hidden md:block">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="p-2 sm:p-3 border-b-2 border-gray-200 bg-gray-50 text-gray-700 font-medium text-xs sm:text-sm text-left w-16 sm:w-20">
                                                Time
                                            </th>
                                            {days.map((day) => (
                                                <th key={day} className="p-2 sm:p-3 border-b-2 border-gray-200 bg-gray-50 text-gray-700 font-medium text-xs sm:text-sm text-left">
                                                    {day}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {timeSlots.map((hour) => (
                                            <tr key={hour} className="hover:bg-gray-50">
                                                <td className="p-2 sm:p-3 border-b border-gray-200 text-left text-gray-700 font-medium text-xs sm:text-sm w-16 sm:w-20">
                                                    {hour.toString().padStart(2, '0')}:00
                                                </td>
                                                {days.map((_, dayIndex) => (
                                                    <td key={dayIndex} className="p-0 border-b border-gray-200 relative h-24 sm:h-28">
                                                        <div className="w-full h-full min-w-[100px]">
                                                            {renderEventInCell(hour, dayIndex)}
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile view */}
                            <div className="md:hidden">
                                <div className="flex justify-between bg-gray-50 border-b-2 border-gray-200 p-2">
                                    <span className="text-gray-700 font-medium text-sm">Time</span>
                                    <select 
                                        className="rounded-lg px-2 py-1 text-sm bg-white text-gray-800 border border-gray-200"
                                        defaultValue={0}
                                        onChange={(e) => {
                                            const table = document.getElementById('mobile-timetable');
                                            const dayColumns = table.querySelectorAll('.day-column');
                                            dayColumns.forEach(col => col.classList.add('hidden'));
                                            const selectedCol = table.querySelector(`.day-${e.target.value}`);
                                            selectedCol.classList.remove('hidden');
                                        }}
                                    >
                                        {days.map((day, idx) => (
                                            <option key={day} value={idx}>{day}</option>
                                        ))}
                                    </select>
                                </div>
                                <div id="mobile-timetable" className="relative">
                                    <table className="w-full border-collapse">
                                        <tbody>
                                            {timeSlots.map((hour) => (
                                                <tr key={hour} className="hover:bg-gray-50">
                                                    <td className="p-2 border-b border-gray-200 text-left text-gray-700 font-medium text-xs w-16">
                                                        {hour.toString().padStart(2, '0')}:00
                                                    </td>
                                                    {days.map((_, dayIndex) => (
                                                        <td 
                                                            key={dayIndex} 
                                                            className={`p-0 border-b border-gray-200 relative h-20 day-column day-${dayIndex} ${dayIndex === 0 ? '' : 'hidden'}`}
                                                        >
                                                            <div className="w-full h-full">
                                                                {renderEventInCell(hour, dayIndex)}
                                                            </div>
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfTimetable;
