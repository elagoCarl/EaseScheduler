import  { useState } from 'react';
import Image3 from './Img/3.jpg';
import TopMenu from "./callComponents/topMenu.jsx";
import Sidebar from './callComponents/sideBar.jsx';

const RoomTimetable = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState('Room 101');

    const toggleSidebar = () => {
        setSidebarOpen(!isSidebarOpen);
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const rooms = ['Room 101', 'Room 102', 'Room 103', 'Room 104', 'Room 105'];

    const events = [
        { id: 1, time: '8:00 - 12:00', course: 'Life and Works of Pacman', professor: 'Dr. Pacquiao', section: 'CS4A', day: 2, duration: 4, color: 'bg-blue-50' }
    ];

    const renderEventInCell = (hour, dayIndex) => {
        return events.map(event => {
            const eventStartHour = parseInt(event.time.split(':')[0]);
            if (event.day === dayIndex && eventStartHour === hour) {
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
                        <div className="text-sm truncate text-blue-600">{event.course}</div>
                        <div className="text-sm truncate text-blue-600">{event.professor}</div>
                        <div className="text-sm truncate text-blue-600">{event.section}</div>
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

            <div className="flex flex-col items-center text-center w-full">
                <div className="flex flex-wrap md:flex-nowrap gap-5 w-full max-w-6xl justify-center items-start px-5 xs:px-15">
                    <div className="bg-white w-full p-5 rounded-lg shadow-lg overflow-x-auto">
                        {/* Header section inside the card */}
                        <div className="relative mb-6 min-w-[800px]">
                            <h1 className="text-2xl font-bold text-blue-500 text-center mb-4">Room Timetable</h1>
                            <div className="absolute right-0 top-0">
                                <select
                                    value={selectedRoom}
                                    onChange={(e) => setSelectedRoom(e.target.value)}
                                    className="border border-blue-500 rounded-md px-3 py-2 bg-white shadow-sm 
                                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                        text-blue-500"
                                >
                                    {rooms.map(room => (
                                        <option key={room} value={room}>{room}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="min-w-[800px]">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className="p-3 border border-gray-300 bg-blue-500 text-white font-medium w-1/7">
                                            Time
                                        </th>
                                        {days.map((day) => (
                                            <th key={day} className="p-3 border border-gray-300 bg-blue-500 text-white font-medium w-1/7">
                                                {day}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: 15 }, (_, i) => 7 + i).map((hour) => (
                                        <tr key={hour}>
                                            <td className="p-3 border border-gray-300 text-center w-1/7">
                                                {hour}:00
                                            </td>
                                            {days.map((_, dayIndex) => (
                                                <td key={dayIndex} className="p-3 border border-gray-300 relative h-14 w-1/7">
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

export default RoomTimetable;
