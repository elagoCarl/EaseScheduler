import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "../../axiosConfig";

const AddRoomModal = ({ isOpen, onClose, onAdd }) => {
    const [formData, setFormData] = useState({
        Code: "",
        Floor: "1st",
        Building: "LV",
        Type: "Lec",
        NumberOfSeats: ""
    });
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Options for dropdowns
    const floorOptions = [
        "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th",
        "9th", "10th", "11th", "12th", "13th", "14th", "15th"
    ];
    const buildingOptions = ["LV", "GP"];
    const typeOptions = ["Lec", "Lab", "Clinic"];

    useEffect(() => {
        if (isOpen) {
            setFormData({
                Code: "",
                Floor: "1st",
                Building: "LV",
                Type: "Lec",
                NumberOfSeats: ""
            });
            setErrorMessage("");
            setSuccessMessage("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        // Validate numeric input for NumberOfSeats
        const seats = parseInt(formData.NumberOfSeats);
        if (isNaN(seats) || seats < 1) {
            setErrorMessage("Number of seats must be a positive number.");
            return;
        }

        try {
            const response = await axios.post("/room/addRoom", {
                ...formData,
                NumberOfSeats: seats
            }, {
                headers: { "Content-Type": "application/json" }
            });

            setSuccessMessage("Room added successfully!");
            if (onAdd) onAdd(response.data.data || response.data);
            setTimeout(onClose, 1000);
        } catch (error) {
            setErrorMessage(error.response?.data?.message || error.message || "Failed to add room.");
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-customBlue1 p-8 rounded-lg w-11/12 md:w-1/3">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl text-white font-semibold mx-auto">Add Room</h2>
                    <button className="text-xl text-white hover:text-black" onClick={onClose}>&times;</button>
                </div>
                <form className="space-y-6 px-4" onSubmit={handleSubmit}>
                    {/* Code Field */}
                    <div>
                        <label className="block font-semibold text-white">Code</label>
                        <input
                            type="text"
                            name="Code"
                            placeholder="Room Code (eg: 101)"
                            className="w-full p-2 border rounded bg-customWhite"
                            value={formData.Code}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Floor Field as Dropdown */}
                    <div>
                        <label className="block font-semibold text-white">Floor</label>
                        <select
                            name="Floor"
                            className="w-full p-2 border rounded bg-customWhite"
                            value={formData.Floor}
                            onChange={handleChange}
                            required
                        >
                            {floorOptions.map((floor) => (
                                <option key={floor} value={floor}>{floor}</option>
                            ))}
                        </select>
                    </div>

                    {/* Building Field as Dropdown */}
                    <div>
                        <label className="block font-semibold text-white">Building</label>
                        <select
                            name="Building"
                            className="w-full p-2 border rounded bg-customWhite"
                            value={formData.Building}
                            onChange={handleChange}
                            required
                        >
                            {buildingOptions.map((building) => (
                                <option key={building} value={building}>{building}</option>
                            ))}
                        </select>
                    </div>

                    {/* Type Field as Dropdown */}
                    <div>
                        <label className="block font-semibold text-white">Type</label>
                        <select
                            name="Type"
                            className="w-full p-2 border rounded bg-customWhite"
                            value={formData.Type}
                            onChange={handleChange}
                            required
                        >
                            {typeOptions.map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    {/* NumberOfSeats Field */}
                    <div>
                        <label className="block font-semibold text-white">Number of Seats</label>
                        <input
                            type="number"
                            name="NumberOfSeats"
                            placeholder="Number of Seats"
                            className="w-full p-2 border rounded bg-customWhite"
                            value={formData.NumberOfSeats}
                            onChange={handleChange}
                            min="1"
                            required
                        />
                    </div>

                    {errorMessage && <p className="text-red-500 text-center">{errorMessage}</p>}
                    {successMessage && <p className="text-green-500 text-center">{successMessage}</p>}

                    <div className="flex justify-center mt-4 gap-4">
                        <button type="submit" className="bg-blue-500 text-white px-6 py-2 rounded-lg">Add</button>
                        <button type="button" className="bg-gray-500 text-white px-6 py-2 rounded-lg" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

AddRoomModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onAdd: PropTypes.func,
};

export default AddRoomModal;