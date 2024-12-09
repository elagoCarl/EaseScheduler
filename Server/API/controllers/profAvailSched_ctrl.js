const { ProfAvailSched, ProfAvail } = require('../models');
const util = require('../../utils');

// Add Professor Availability Schedule (Single or Bulk)
const addProfAvailSched = async (req, res, next) => {
    try {
        let schedulesToAdd = req.body;

        // Turn to array for bulk processing
        if (!Array.isArray(schedulesToAdd)) {
            schedulesToAdd = [schedulesToAdd];
        }

        // Validate and create schedules
        for (const schedule of schedulesToAdd) {
            const { Start_time, End_time, ProfAvailId } = schedule;

            // Check mandatory fields
            if (!util.checkMandatoryFields([Start_time, End_time, ProfAvailId])) {
                return res.status(400).json({
                    successful: false,
                    message: "Mandatory fields (Start_time, End_time, ProfAvailId) are missing."
                });
            }

            // Validate ProfAvailId existence
            const profAvail = await ProfAvail.findByPk(ProfAvailId);
            if (!profAvail) {
                return res.status(404).json({
                    successful: false,
                    message: `Professor Availability with ID ${ProfAvailId} not found.`
                });
            }

            // Create schedule
            await ProfAvailSched.create({ Start_time, End_time, ProfAvailId });
        }

        return res.status(201).json({
            successful: true,
            message: "Successfully added Professor Availability Schedule(s)."
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

// Get a Single Schedule by ID
const getProfAvailSched = async (req, res, next) => {
    try {
        const { id } = req.params;

        const schedule = await ProfAvailSched.findByPk(id, {
            include: {
                model: ProfAvail,
                as: 'profAvail',
                attributes: ['Day']
            }
        });

        if (!schedule) {
            return res.status(404).json({
                successful: false,
                message: "Schedule not found."
            });
        }

        return res.status(200).json({
            successful: true,
            data: schedule
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

// Get All Schedules
const getAllProfAvailSched = async (req, res, next) => {
    try {
        const schedules = await ProfAvailSched.findAll({
            include: {
                model: ProfAvail,
                as: 'profAvail',
                attributes: ['Day']
            }
        });

        return res.status(200).json({
            successful: true,
            data: schedules
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

// Update Schedule by ID
const updateProfAvailSched = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { Start_time, End_time, ProfAvailId } = req.body;

        // Check mandatory fields
        if (!util.checkMandatoryFields([Start_time, End_time, ProfAvailId])) {
            return res.status(400).json({
                successful: false,
                message: "Mandatory fields (Start_time, End_time, ProfAvailId) are missing."
            });
        }

        const schedule = await ProfAvailSched.findByPk(id);
        if (!schedule) {
            return res.status(404).json({
                successful: false,
                message: "Schedule not found."
            });
        }

        // Validate ProfAvailId existence
        const profAvail = await ProfAvail.findByPk(ProfAvailId);
        if (!profAvail) {
            return res.status(404).json({
                successful: false,
                message: `Professor Availability with ID ${ProfAvailId} not found.`
            });
        }

        await schedule.update({ Start_time, End_time, ProfAvailId });

        return res.status(200).json({
            successful: true,
            message: "Schedule updated successfully."
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

// Delete Schedule by ID
const deleteProfAvailSched = async (req, res, next) => {
    try {
        const { id } = req.params;

        const schedule = await ProfAvailSched.findByPk(id);
        if (!schedule) {
            return res.status(404).json({
                successful: false,
                message: "Schedule not found."
            });
        }

        await schedule.destroy();

        return res.status(200).json({
            successful: true,
            message: "Schedule deleted successfully."
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
    addProfAvailSched,
    getProfAvailSched,
    getAllProfAvailSched,
    updateProfAvailSched,
    deleteProfAvailSched
};