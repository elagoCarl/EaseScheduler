import { useState, useEffect } from "react";
import axios from "../../axiosConfig";
import { useAuth } from '../authContext';

const EditSchedRecordModal = ({ isOpen, schedule, onClose, onUpdate, rooms, assignations, Semester }) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const [formData, setFormData] = useState({
        assignation_id: "",
        room_id: "",
        day: "",
        start_time: "",
        end_time: ""
    });
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [availableSections, setAvailableSections] = useState([]);
    const [selectedSections, setSelectedSections] = useState([]);
    const [myDeptSections, setMyDeptSections] = useState([]);
    const [otherDeptSections, setOtherDeptSections] = useState([]);
    const deptId = user.DepartmentId;
    const [isDepartmentMatch, setIsDepartmentMatch] = useState(true);
    const transformErrorMessage = (message) => {
        if (!message) return message;
        let newMessage = message;
        newMessage = newMessage.replace(/Room\s+(\d+)\b/, (match, roomId) => {
            const room = rooms.find(r => r.id.toString() === roomId);
            return room && room.Code ? `Room ${room.Code}` : match;
        });
        newMessage = newMessage.replace(/on\s+(\d+)\b/, (match, dayNum) => {
            const dayIndex = parseInt(dayNum, 10) - 1;
            return days[dayIndex] ? `on ${days[dayIndex]}` : match;
        });
        return newMessage;
    };

    const fetchSectionsForCourse = async (courseId) => {
        try {
            const response = await axios.post('/progYrSec/getProgYrSecByCourse', {
                CourseId: courseId,
                DepartmentId: deptId
            });

            if (response.data.successful) {
                setAvailableSections(response.data.data);
            } else {
                setAvailableSections([]);
            }
        } catch (err) {
            console.error("Error fetching sections:", err);
            setAvailableSections([]);
        }
    };

    const fetchSectionsForDepartment = async () => {
        try {
            const response = await axios.get(`/progYrSec/getProgYrSecByDept/${deptId}`);
            if (response.data.successful) {
                setMyDeptSections(response.data.data);
            } else {
                setMyDeptSections([]);
            }
        } catch (err) {
            console.error("Error fetching department sections:", err);
            setMyDeptSections([]);
        }
    };

    useEffect(() => {
        fetchSectionsForDepartment();
    }, [deptId]);

    useEffect(() => {
        if (schedule) {
            setFormData({
                assignation_id: schedule.AssignationId || "",
                room_id: schedule.RoomId || "",
                day: schedule.Day || "",
                start_time: schedule.Start_time ? schedule.Start_time.slice(0, 5) : "",
                end_time: schedule.End_time ? schedule.End_time.slice(0, 5) : ""
            });

            const isMatch = schedule.Assignation?.DepartmentId === deptId;
            setIsDepartmentMatch(isMatch);

            if (isMatch && schedule.AssignationId) {
                const selectedAssignation = assignations.find(a => a.id === schedule.AssignationId);
                if (selectedAssignation?.CourseId) {
                    fetchSectionsForCourse(selectedAssignation.CourseId);
                }
            }

            if (!isMatch && schedule.ProgYrSecs) {
                const otherDeptSecs = schedule.ProgYrSecs.filter(
                    sec => sec.Program.DepartmentId !== deptId
                );
                setOtherDeptSections(otherDeptSecs);
            }
        }
    }, [schedule, assignations, deptId]);

    useEffect(() => {
        if (isDepartmentMatch && schedule && schedule.id && availableSections.length > 0) {
            if (schedule.ProgYrSecs && schedule.ProgYrSecs.length > 0) {
                const matchedSectionIds = availableSections.filter(available =>
                    schedule.ProgYrSecs.some(section =>
                        section.Program?.Code === available.Program?.Code &&
                        section.Year === available.Year &&
                        section.Section === available.Section
                    )
                ).map(s => s.id);

                setSelectedSections(matchedSectionIds);
            }
        }
    }, [availableSections, schedule, isDepartmentMatch]);

    useEffect(() => {
        if (!isDepartmentMatch && schedule && schedule.id && myDeptSections.length > 0) {
            if (schedule.ProgYrSecs && schedule.ProgYrSecs.length > 0) {
                const matchedSectionIds = myDeptSections.filter(available =>
                    schedule.ProgYrSecs.some(section =>
                        section.Program?.Code === available.Program?.Code &&
                        section.Year === available.Year &&
                        section.Section === available.Section &&
                        section.Program?.DepartmentId === deptId
                    )
                ).map(s => s.id);

                setSelectedSections(matchedSectionIds);
            }
        }
    }, [myDeptSections, schedule, isDepartmentMatch, deptId]);

    const handleInputChange = (e) => {
        if (!isDepartmentMatch && e.target.name !== "sections") {
            return;
        }

        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === "assignation_id" && value && isDepartmentMatch) {
            const selectedAssignation = assignations.find(a => a.id === parseInt(value));
            if (selectedAssignation?.CourseId) {
                fetchSectionsForCourse(selectedAssignation.CourseId);
                setSelectedSections([]);
            }
        }
    };

    const handleSectionChange = (e) => {
        const { value, checked } = e.target;
        const numericValue = parseInt(value, 10);

        if (checked) {
            setSelectedSections(prev => [...prev, numericValue]);
        } else {
            setSelectedSections(prev => prev.filter(id => id !== numericValue));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            let payload;

            payload = {
                Day: parseInt(formData.day),
                Start_time: formData.start_time,
                End_time: formData.end_time,
                RoomId: parseInt(formData.room_id),
                AssignationId: parseInt(formData.assignation_id),
                Sections: selectedSections,
                Semester: Semester,
            };

            if (selectedSections.length === 0 && isDepartmentMatch) {
                setError("Please select at least one section.");
                setTimeout(() => {
                    setError(null);
                }, 3000);
                setLoading(false);
                return;
            }

            if (!payload.Day || !payload.Start_time || !payload.End_time ||
                !payload.RoomId || !payload.AssignationId) {
                setError("Please fill in all fields.");
                setTimeout(() => {
                    setError(null);
                }, 3000);
                setLoading(false);
                return;
            }

            if (!isDepartmentMatch) {
                const otherDeptSectionIds = otherDeptSections.map(s => s.id);
                payload = {
                    Day: schedule.Day,
                    Start_time: schedule.Start_time.slice(0, 5),
                    End_time: schedule.End_time.slice(0, 5),
                    RoomId: schedule.RoomId,
                    AssignationId: schedule.AssignationId,
                    Semester: Semester,
                    Sections: [...selectedSections, ...otherDeptSectionIds],
                };
            }

            const response = await axios.put(`/schedule/updateSchedule/${schedule.id}`, payload);

            if (response.data.successful) {
                const updatedResponse = await axios.get(`/schedule/getSchedule/${schedule.id}`);
                if (updatedResponse.data.successful) {
                    onUpdate(updatedResponse.data.data);
                    onClose();
                } else {
                    const updatedSchedule = { ...schedule, ...payload };
                    onUpdate(updatedSchedule);
                    onClose();
                }
            } else {
                setError(transformErrorMessage(response.data.message || "Failed to update schedule."));
                setTimeout(() => {
                    setError(null);
                }, 3000);
            }
        } catch (err) {
            console.error("Error updating schedule:", err);
            setError(transformErrorMessage(err.response?.data?.message || err.message || "An error occurred."));
            setTimeout(() => {
                setError(null);
            }, 3000);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-md p-10">
                <h2 className="text-xl font-semibold mb-4">Edit Schedule Record</h2>
                {!isDepartmentMatch && schedule?.Assignation && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                        <p className="text-sm font-medium text-gray-700">Different Department Schedule:</p>
                        <p className="text-sm">
                            <span className="font-medium">Course:</span> {schedule.Assignation.Course?.Code} - {schedule.Assignation.Course?.Description}
                        </p>
                        <p className="text-sm">
                            <span className="font-medium">Professor:</span> {schedule.Assignation.Professor?.Name}
                        </p>
                        <p className="text-sm">
                            <span className="font-medium">Day:</span> {days[schedule.Day - 1]}
                        </p>
                        <p className="text-sm">
                            <span className="font-medium">Time:</span> {schedule.Start_time?.slice(0, 5)} - {schedule.End_time?.slice(0, 5)}
                        </p>
                    </div>
                )}

                {!isDepartmentMatch && (
                    <div className="mb-4 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                        This schedule belongs to a different department. You can only add or remove sections from your department.
                        The existing sections from other departments will be preserved.
                    </div>
                )}

                {error && (
                    <div className="mb-4 text-sm text-red-600">
                        {typeof error === "object" ? JSON.stringify(error) : error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Room Dropdown - Only if same department */}
                    {isDepartmentMatch && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Room</label>
                            <select
                                name="room_id"
                                value={formData.room_id}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                disabled
                            >
                                <option value="">Select Room</option>
                                {rooms.map(room => (
                                    <option key={room.id} value={room.id}>
                                        {room.Code} - {room.Building} {room.Floor} (Type: {room.TypeRooms.map(item => item.Type).join(', ')})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Assignation Dropdown - Only if same department */}
                    {isDepartmentMatch && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Assignation</label>
                            <select
                                name="assignation_id"
                                value={formData.assignation_id}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                disabled
                            >
                                <option value="">Select Assignation</option>
                                {assignations.map(assign => (
                                    <option key={assign.id} value={assign.id}>
                                        {assign.Course?.Code} - {assign.Course?.Description} ({assign.Course?.Units} units) | {assign.Professor?.Name} - Total: {assign.Professor?.Total_units} units | Dept: {assign.Department?.Name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Sections Selection */}
                    {/* For same department: Show only if assignation is selected */}
                    {isDepartmentMatch && formData.assignation_id && availableSections.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Sections</label>
                            <div className="mt-1 p-2 border border-gray-300 rounded-md">
                                <div className="grid grid-cols-3 gap-1">
                                    {availableSections.map(section => (
                                        <div key={section.id} className="flex items-center mb-1">
                                            <input
                                                type="checkbox"
                                                id={`section-${section.id}`}
                                                value={section.id}
                                                checked={selectedSections.includes(section.id)}
                                                onChange={handleSectionChange}
                                                className="h-auto w-auto text-blue-600 border-gray-300 rounded"
                                            />
                                            <label htmlFor={`section-${section.id}`} className="ml-2 text-sm text-gray-700">
                                                {section.Program?.Code} {section.Year}-{section.Section}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end mt-1 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setSelectedSections(availableSections.map(s => s.id))}
                                    className="text-blue-600 hover:text-blue-800 mr-2"
                                >
                                    Select All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedSections([])}
                                    className="text-blue-600 hover:text-blue-800"
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>
                    )}

                    {/* For different department: Always show sections from user's department */}
                    {!isDepartmentMatch && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Your Department Sections
                            </label>
                            <div className="mt-1 p-2 border border-gray-300 rounded-md">
                                <div className="grid grid-cols-3 gap-1">
                                    {myDeptSections.map(section => (
                                        <div key={section.id} className="flex items-center mb-1">
                                            <input
                                                type="checkbox"
                                                id={`section-${section.id}`}
                                                value={section.id}
                                                checked={selectedSections.includes(section.id)}
                                                onChange={handleSectionChange}
                                                className="h-auto w-auto text-blue-600 border-gray-300 rounded"
                                            />
                                            <label htmlFor={`section-${section.id}`} className="ml-2 text-sm text-gray-700">
                                                {section.Program?.Code} {section.Year}-{section.Section}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                {myDeptSections.length === 0 && (
                                    <p className="text-sm text-gray-500 p-2">No sections available for your department.</p>
                                )}
                            </div>
                            {myDeptSections.length > 0 && (
                                <div className="flex justify-end mt-1 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSections(myDeptSections.map(s => s.id))}
                                        className="text-blue-600 hover:text-blue-800 mr-2"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSections([])}
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Display other department sections that won't be modified */}
                    {!isDepartmentMatch && otherDeptSections.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Other Department Sections (Read-only)
                            </label>
                            <div className="mt-1 p-2 border border-gray-200 bg-gray-50 rounded-md">
                                <div className="grid grid-cols-3 gap-1">
                                    {otherDeptSections.map((section, idx) => (
                                        <div key={idx} className="text-sm text-gray-600">
                                            {section.Program?.Code} {section.Year}-{section.Section}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Day Dropdown - Only if same department */}
                    {isDepartmentMatch && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Day</label>
                            <select
                                name="day"
                                value={formData.day}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                required
                            >
                                <option value="">Select Day</option>
                                {days.map((day, index) => (
                                    <option key={index} value={index + 1}>
                                        {day}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Time Inputs - Only if same department */}
                    {isDepartmentMatch && (
                        <div className="flex space-x-4">
                            <div className="w-1/2">
                                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                                <input
                                    type="time"
                                    name="start_time"
                                    value={formData.start_time}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                    required
                                />
                            </div>
                            <div className="w-1/2">
                                <label className="block text-sm font-medium text-gray-700">End Time</label>
                                <input
                                    type="time"
                                    name="end_time"
                                    value={formData.end_time}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-md text-gray-800 bg-gray-300/80 hover:bg-gray-400 duration-300"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-10 py-2 rounded-md text-white bg-blue-500 hover:bg-blue-700 duration-300"
                            disabled={loading}
                        >
                            {loading ? "Saving..." : "Save"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditSchedRecordModal;