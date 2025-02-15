import { useState } from "react";
import PropTypes from "prop-types";

const AddRoomModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        Code: "",
        Floor: "",
        Building: "",
        Type: "",
    });
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    if (!isOpen) return null; // Prevent rendering if the modal is not open

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const response = await fetch("http://localhost:8080/room/addRoom", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (!response.ok) {
                setErrorMessage(result.message || "Failed to add room.");
                return;
            }

            setSuccessMessage("Room added successfully! Reloading page...");
            setTimeout(() => {
                onClose();
                window.location.reload();
            }, 1000);
        } catch (error) {
            setErrorMessage(error.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-customBlue1 p-8 rounded-lg w-11/12 md:w-1/3">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl text-white font-semibold mx-auto">Add Room</h2>
                    <button
                        className="text-xl text-white hover:text-black"
                        onClick={onClose}
                    >
                        &times;
                    </button>
                </div>
                <form className="space-y-6 px-4" onSubmit={handleSubmit}>
                    <label className="block font-semibold text-white">Room Code</label>
                    <input
                        type="text"
                        name="Code"
                        placeholder="Room Code"
                        className="w-full p-2 border rounded bg-customWhite"
                        value={formData.Code}
                        onChange={handleInputChange}
                        required
                    />

                    <label className="block font-semibold text-white">Floor</label>
                    <input
                        type="text"
                        name="Floor"
                        placeholder="Floor"
                        className="w-full p-2 border rounded bg-customWhite"
                        value={formData.Floor}
                        onChange={handleInputChange}
                        required
                    />

                    <label className="block font-semibold text-white">Building</label>
                    <input
                        type="text"
                        name="Building"
                        placeholder="Building"
                        className="w-full p-2 border rounded bg-customWhite"
                        value={formData.Building}
                        onChange={handleInputChange}
                        required
                    />

                    <label className="block font-semibold text-white">Room Type</label>
                    <input
                        type="text"
                        name="Type"
                        placeholder="Room Type"
                        className="w-full p-2 border rounded bg-customWhite"
                        value={formData.Type}
                        onChange={handleInputChange}
                        required
                    />

                    {errorMessage && (
                        <p className="text-red-500 text-center">{errorMessage}</p>
                    )}

                    {successMessage && (
                        <p className="text-green-500 text-center">{successMessage}</p>
                    )}

                    <div className="flex justify-center mt-4 gap-4">
                        <button
                            type="submit"
                            className="bg-blue-500 text-white px-6 py-2 rounded-lg"
                        >
                            Add
                        </button>
                        <button
                            type="button"
                            className="bg-gray-500 text-white px-6 py-2 rounded-lg"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

AddRoomModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default AddRoomModal;
