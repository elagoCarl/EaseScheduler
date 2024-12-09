const { ProfAvail, Professor } = require('../models');
const { Op } = require('sequelize');
const util = require('../../utils');

// Add Professor Availability (Single or Bulk)
const addProfessorAvail = async (req, res, next) => {
    try {
        let professorAvailToAdd = req.body;

        // Turn to array for bulk processing
        if (!Array.isArray(professorAvailToAdd)) {
            professorAvailToAdd = [professorAvailToAdd];
        }

        for (const professorAvailData of professorAvailToAdd) {
            const { Day, ProfessorId } = professorAvailData;

            // Validate mandatory fields
            if (!util.checkMandatoryFields([Day, ProfessorId])) {
                return res.status(400).json({
                    successful: false,
                    message: "Mandatory fields (Day, ProfessorId) are missing."
                });
            }

            // Check if the referenced Professor exists
            const professorExists = await Professor.findByPk(ProfessorId);
            if (!professorExists) {
                return res.status(404).json({
                    successful: false,
                    message: `Professor with ID ${ProfessorId} not found.`
                });
            }

            // Check if the combination of Day and ProfessorId already exists
            const existingAvailability = await ProfAvail.findOne({
                where: { Day, ProfessorId }
            });

            if (existingAvailability) {
                return res.status(409).json({
                    successful: false,
                    message: `Availability for ${Day} already exists for Professor ID ${ProfessorId}.`
                });
            }

            // Create Professor Availability
            await ProfAvail.create({ Day, ProfessorId });
        }

        return res.status(201).json({
            successful: true,
            message: "Successfully added Professor Availability(ies)."
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

// Get a Single Professor Availability by ID
const getProfessorAvail = async (req, res, next) => {
    try {
        const { id } = req.params;

        const professorAvail = await ProfAvail.findByPk(id);

        if (!professorAvail) {
            return res.status(404).json({
                successful: false,
                message: "Professor Availability not found."
            });
        }

        return res.status(200).json({
            successful: true,
            data: professorAvail
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

// Get All Professor Availabilities
const getAllProfessorAvail = async (req, res, next) => {
    try {
        const professorAvails = await ProfAvail.findAll();

        return res.status(200).json({
            successful: true,
            data: professorAvails
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

// Update Professor Availability by ID
const updateProfessorAvail = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { Day } = req.body;

        if (!util.checkMandatoryFields([Day])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field (Day) is missing."
            });
        }

        const professorAvail = await ProfAvail.findByPk(id);
        if (!professorAvail) {
            return res.status(404).json({
                successful: false,
                message: "Professor Availability not found."
            });
        }

        // Check if the updated Day already exists for the same ProfessorId
        const existingAvailability = await ProfAvail.findOne({
            where: { Day, ProfessorId: professorAvail.ProfessorId, id: { [Op.ne]: id } }
        });

        if (existingAvailability) {
            return res.status(409).json({
                successful: false,
                message: `Availability for ${Day} already exists for Professor ID ${professorAvail.ProfessorId}.`
            });
        }

        await professorAvail.update({ Day });

        return res.status(200).json({
            successful: true,
            message: "Professor Availability updated successfully."
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

// Delete Professor Availability by ID
const deleteProfessorAvail = async (req, res, next) => {
    try {
        const { id } = req.params;

        const professorAvail = await ProfAvail.findByPk(id);
        if (!professorAvail) {
            return res.status(404).json({
                successful: false,
                message: "Professor Availability not found."
            });
        }

        await professorAvail.destroy();

        return res.status(200).json({
            successful: true,
            message: "Professor Availability deleted successfully."
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

// Export the functions
module.exports = {
    addProfessorAvail,
    getProfessorAvail,
    getAllProfessorAvail,
    updateProfessorAvail,
    deleteProfessorAvail
};
