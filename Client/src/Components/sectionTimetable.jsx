import React, { useState } from 'react';
import Image3 from './Img/3.jpg';
import TopMenu from "./callComponents/topMenu.jsx";
import Sidebar from './callComponents/sideBar.jsx';

const SectionTimetable = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [selectedSection, setSelectedSection] = useState('A1');

    const toggleSidebar = () => {
        setSidebarOpen(!isSidebarOpen);
    }

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
                        style={{
                            top: '0',
                            height: `${event.duration * 100}%`,
                            zIndex: 10
                        }}
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
        <div className="main bg-cover bg-no-repeat min-h-screen flex justify-center items-center xs:h-full"
            style={{ backgroundImage: `url(${Image3})` }}>
            
            <div className="fixed top-0 h-full z-50">
                <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            </div>

            <TopMenu toggleSidebar={toggleSidebar} />

            <div className="flex flex-col items-center text-center w-full px-4 sm:px-6">
                <div className="flex flex-wrap md:flex-nowrap gap-5 w-full max-w-6xl justify-center items-start">

                    <div className="bg-white w-full p-5 rounded-lg shadow-lg overflow-x-auto sm:overflow-hidden">
                        {/* Header section inside the card */}
                        <div className="relative mb-6">
                            <h1 className="text-xl sm:text-2xl font-bold text-white text-center bg-customBlue1 px-4 py-6 sm:py-8 rounded-lg">
                                Section Timetable
                            </h1>
                            <div className="absolute right-5 top-6 sm:top-10">
                                <select
                                    value={selectedSection}
                                    onChange={(e) => setSelectedSection(e.target.value)}
                                    className="rounded-md px-3 py-2 bg-white shadow-sm 
                                        focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-transparent text-black"
                                >
                                    {sections.map(section => (
                                        <option key={section} value={section}>{section}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="w-full overflow-x-auto">
                            <table className="w-full border-collapse min-w-[600px] sm:min-w-[800px]">
                                <thead>
                                    <tr>
                                        <th className="p-3 border border-gray-300 bg-blue-500 text-white font-medium w-[10%]">
                                            Time
                                        </th>
                                        {days.map((day) => (
                                            <th key={day} className="p-3 border border-gray-300 bg-blue-500 text-white font-medium w-[15%]">
                                                {day}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: 15 }, (_, i) => 7 + i).map((hour) => (
                                        <tr key={hour}>
                                            <td className="p-3 border border-gray-300 text-center w-[10%]">
                                                {hour}:00
                                            </td>
                                            {days.map((_, dayIndex) => (
                                                <td key={dayIndex} className="p-3 border border-gray-300 relative h-14 w-[15%]">
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
            </div>
        </div>
    );
};

export default SectionTimetable;
