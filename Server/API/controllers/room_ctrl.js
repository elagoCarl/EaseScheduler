const { Room, Department } = require('../models')
const util = require('../../utils')

const addRoom = async (req, res, next) => {
    try {
        let rooms = req.body;

        // Check if the request body contains an array of professors
        if (!Array.isArray(rooms)) {
            // If not an array, convert the single professor to an array
            rooms = [rooms];
        }

        for (const room of rooms) {
            const { Code, Floor, Building, Type, Dept_id } = room;

            if (!util.checkMandatoryFields([Code, Floor, Building, Type, Dept_id])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing."
                })
            }

            const existingRoom = await Room.findOne({ where: { Code } });
            if (existingRoom) {
                return res.status(406).json({
                    successful: false,
                    message: "Room code already exists."
                })
            }

            if (!['LV', 'GP'].includes(Building)) {
                return res.status(406).json({
                    successful: false,
                    message: "Invalid Building."
                });
            }

            if (!['Lab', 'Lec'].includes(Type)) {
                return res.status(406).json({
                    successful: false,
                    message: "Invalid Room Type."
                });
            }

            const newRoom = await Room.create({
                Code: Code,
                Floor: Floor,
                Building: Building,
                Type: Type
            })
            const newDeptRoom = await newRoom.addRoomDepts(Dept_id)
        }

        return res.status(201).json({
            successful: true,
            message: "Successfully added new room."
        })

    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        })
    }
}

const getAllRoom = async (req, res, next) => {
    try {
        let room = await Room.findAll()
        if (!room) {
            res.status(200).send({
                successful: true,
                message: "No room found",
                count: 0,
                data: []
            })
        }
        else {
            res.status(200).send({
                successful: true,
                message: "Retrieved all rooms",
                count: room.length,
                data: room
            })
        }
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        })
    }
}

const getRoom = async (req, res, next) => {
    try {
        let room = await Room.findByPk(req.params.id);

        if (!room) {
            res.status(404).send({
                successful: false,
                message: "Room not found"
            });
        } else {
            res.status(200).send({
                successful: true,
                message: "Successfully retrieved room.",
                data: room
            });
        }
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        })
    }
}

const deleteRoom = async (req, res, next) => {
    try {
        const deleteRoom = await Room.destroy({
            where: {
                id: req.params.id, // Replace with the ID of the record you want to delete
            },
        })
        if (deleteRoom) {
            res.status(200).send({
                successful: true,
                message: "Successfully deleted room."
            })
        } else {
            res.status(400).send({
                successful: false,
                message: "Room not found."
            })
        }
    } catch (err) {
        res.status(500).send({
            successful: false,
            message: err.message
        });
    }
}

const updateRoom = async (req, res, next) => {
    try {
        let room = await Room.findByPk(req.params.id)
        const { Code, Floor, Building, Type } = req.body

        if (!room) {
            res.status(404).send({
                successful: false,
                message: "Room not found"
            });
        }

        if (!util.checkMandatoryFields([Code, Floor, Building, Type])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            })
        }


        if (!['LV', 'GP'].includes(Building)) {
            return res.status(406).json({
                successful: false,
                message: "Invalid Building."
            });
        }

        if (!['Lab', 'Lec'].includes(Type)) {
            return res.status(406).json({
                successful: false,
                message: "Invalid Room Type."
            });
        }

        if (Code !== room.Code) {
            const roomConflict = await Room.findOne({ where: { Code: Code } })
            if (roomConflict) {
                return res.status(406).json({
                    successful: false,
                    message: "Room already exists."
                })
            }
        }

        const updateRoom = await room.update({
            Code: Code,
            Floor: Floor,
            Building: Building,
            Type: Type
        })

        return res.status(201).json({
            successful: true,
            message: "Successfully updated room."
        })
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        })
    }
}
module.exports = { addRoom, getAllRoom, getRoom, deleteRoom, updateRoom };
