import React, { useState } from 'react';
import Image3 from './Img/3.jpg';
import TopMenu from "./callComponents/topMenu.jsx";
import Sidebar from './callComponents/sideBar.jsx';

const SectionTimetable = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [selectedSection, setSelectedSection] = useState('A1');

    const toggleSidebar = () => {
        setSidebarOpen(!isSidebarOpen);
    };

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const sections = ['A1', 'B1', 'C1', 'D1', 'E1'];

    const events = [
        { id: 1, time: '8:00 - 12:00', course: 'Mathematics 101', professor: 'Dr. Smith', section: 'A1', day: 0, duration: 4, color: 'bg-blue-50' }
    ];

    const renderEventInCell = (hour, dayIndex) => {
        return events.map(event => {
            const eventStartHour = parseInt(event.time.split(':')[0]);
            if (event.day === dayIndex && eventStartHour === hour && event.section === selectedSection) {
                return (
                    <div
                        key={event.id}
                        className={`absolute ${event.color} p-2 rounded-md shadow-sm border border-blue-200 left-0 right-0 mx-1`}
                        style={{ top: '0', height: `${event.duration * 100}%`, zIndex: 10 }}
                    >
                        <div className="text-xs font-medium text-blue-700">{event.time}</div>
                        <div className="text-sm truncate text-blue-600">Course: {event.course}</div>
                        <div className="text-sm truncate text-blue-600">Professor: {event.professor}</div>
                        <div className="text-sm truncate text-blue-600">Section: {event.section}</div>
                    </div>
                );
            }
            return null;
        });
    };

    return (
        <div className="min-h-screen flex flex-col items-center bg-cover w-screen h-auto"
            style={{ backgroundImage: `url(${Image3})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            <TopMenu toggleSidebar={toggleSidebar} />

            <div className="w-full xl:max-w-5xl md:max-w-3xl sm:max-w-2xl xs:max-w-sm bg-white p-8 sm:mt-80 md:mt-120 xl:mt-140 xs:mt-60 rounded-lg shadow-lg">
                {/* Header with Section Dropdown */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 w-full bg-customBlue1 px-4 py-8 rounded-lg">
                    <h1 className="text-2xl font-bold text-white">Section Timetable</h1>
                    <select
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                        className="rounded-md px-3 py-2 bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    >
                        {sections.map(section => (
                            <option key={section} value={section}>{section}</option>
                        ))}
                    </select>
                </div>

                {/* Responsive Table */}
                <div className="overflow-x-auto mt-[-2rem]">
                    <table className="w-full border-collapse min-w-[700px] sm:min-w-[640px] xs:min-w-[480px] xs:mt-40 sm:mt-40">
                        <thead>
                            <tr>
                                <th className="p-3 border border-gray-300 bg-blue-500 text-white font-semibold">Time</th>
                                {days.map((day) => (
                                    <th key={day} className="p-3 border border-gray-300 bg-blue-500 text-white font-semibold">
                                        {day}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 15 }, (_, i) => 7 + i).map((hour) => (
                                <tr key={hour}>
                                    <td className="p-3 border border-gray-300 text-center font-semibold">{hour}:00</td>
                                    {days.map((_, dayIndex) => (
                                        <td key={dayIndex} className="p-3 border border-gray-300 relative h-14">
                                            {renderEventInCell(hour, dayIndex)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SectionTimetable;
