import { useState, useEffect } from "react";
import axios from "axios";

const EditSchedRecordModal = ({ isOpen, schedule, onClose, onUpdate, rooms, assignations }) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const [formData, setFormData] = useState({
        assignation_id: "",
        room_id: "",
        day: "",
        start_time: "",
        end_time: ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Helper function to transform error messages
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

    // Populate form data when the schedule prop changes, trimming seconds if necessary.
    useEffect(() => {
        if (schedule) {
            setFormData({
                assignation_id: schedule.AssignationId || "",
                room_id: schedule.RoomId || "",
                day: schedule.Day || "",
                start_time: schedule.Start_time ? schedule.Start_time.slice(0, 5) : "",
                end_time: schedule.End_time ? schedule.End_time.slice(0, 5) : ""
            });
        }
    }, [schedule]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            // Ensure time strings are in HH:mm format (they should be now, thanks to useEffect)
            const payload = {
                Day: formData.day,
                Start_time: formData.start_time,
                End_time: formData.end_time,
                RoomId: formData.room_id,
                AssignationId: formData.assignation_id
            };
            const response = await axios.put(`http://localhost:8080/schedule/updateSchedule/${schedule.id}`, payload);
            if (response.data.successful) {
                const updatedSchedule = { ...schedule, ...payload };
                onUpdate(updatedSchedule);
                onClose();
            } else {
                setError(transformErrorMessage(response.data.message || "Failed to update schedule."));
            }
        } catch (err) {
            console.error("Error updating schedule:", err);
            setError(transformErrorMessage(err.response?.data?.message || err.message || "An error occurred."));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-md p-6">
                <h2 className="text-xl font-semibold mb-4">Edit Schedule Record</h2>
                {error && (
                    <div className="mb-4 text-sm text-red-600">
                        {typeof error === "object" ? JSON.stringify(error) : error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Room Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Room</label>
                        <select
                            name="room_id"
                            value={formData.room_id}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                        >
                            <option value="">Select Room</option>
                            {rooms.map(room => (
                                <option key={room.id} value={room.id}>
                                    {room.Code} - {room.Building} {room.Floor} (Type: {room.Type})
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* Assignation Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Assignation</label>
                        <select
                            name="assignation_id"
                            value={formData.assignation_id}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                        >
                            <option value="">Select Assignation</option>
                            {assignations.map(assign => (
                                <option key={assign.id} value={assign.id}>
                                    {assign.Course?.Code} - {assign.Course?.Description} ({assign.Course?.Units} units) | {assign.Professor?.Name} - Total: {assign.Professor?.Total_units} units | Dept: {assign.Department?.Name}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* Day Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Day</label>
                        <select
                            name="day"
                            value={formData.day}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                        >
                            <option value="">Select Day</option>
                            {days.map((day, index) => (
                                <option key={index} value={index + 1}>
                                    {day}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* Time Inputs */}
                    <div className="flex space-x-4">
                        <div className="w-1/2">
                            <label className="block text-sm font-medium text-gray-700">Start Time</label>
                            <input
                                type="time"
                                name="start_time"
                                value={formData.start_time}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
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
                            />
                        </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-md text-gray-700 bg-gray-200"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-md text-white bg-blue-600"
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
