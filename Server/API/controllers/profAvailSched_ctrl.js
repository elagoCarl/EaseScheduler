const { ProfAvailSchedule } = require('../models');
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
            const { Start_time, End_time } = schedule;

            if (!util.checkMandatoryFields([Start_time, End_time])) {
                return res.status(400).json({
                    successful: false,
                    message: "Mandatory fields (Start_time, End_time) are missing."
                });
            }

            await ProfAvailSchedule.create({ Start_time, End_time });
        }

        return res.status(200).json({
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

        const schedule = await ProfAvailSchedule.findByPk(id);

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
        const schedules = await ProfAvailSchedule.findAll();

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
        const { Start_time, End_time } = req.body;

        if (!util.checkMandatoryFields([Start_time, End_time])) {
            return res.status(400).json({
                successful: false,
                message: "Mandatory fields (Start_time, End_time) are missing."
            });
        }

        const schedule = await ProfAvailSchedule.findByPk(id);
        if (!schedule) {
            return res.status(404).json({
                successful: false,
                message: "Schedule not found."
            });
        }

        await schedule.update({ Start_time, End_time });

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

        const schedule = await ProfAvailSchedule.findByPk(id);
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
