const { ProfAvail, Professor } = require('../models')
const util = require('../../utils')

//LAGYAN NG PREFIX NA ZERO ANG INPUT SA HOURS KUNG SINGLE DIGIT LANG

// Add Professor Availability (Single or Bulk)
const addProfessorAvail = async (req, res, next) => {
    try {
        let profAvails = req.body;

        if (!Array.isArray(profAvails)) {
            profAvails = [profAvails];
        }

        for (const profAvail of profAvails) {
            const { Day, ProfessorId, Start_time, End_time } = profAvail;

            if (!util.checkMandatoryFields([Day, ProfessorId, Start_time, End_time])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing."
                });
            }

            // Check if the referenced Professor exists
            const prof = await Professor.findByPk(ProfessorId);
            if (!prof) {
                return res.status(404).json({
                    successful: false,
                    message: 'Professor not found.'
                });
            }

            if (End_time <= Start_time) {
                return res.status(400).json({
                    successful: false,
                    message: "End time must be greater than Start time."
                });
            }

            await ProfAvail.create({ Day, ProfessorId, Start_time, End_time });
        }

        return res.status(201).json({
            successful: true,
            message: "Successfully added Professor Availability."
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
        const professorAvail = await ProfAvail.findByPk(req.params.id);

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
        const { Day, End_time, Start_time, ProfessorId } = req.body;

        if (!util.checkMandatoryFields([Day, End_time, Start_time, ProfessorId])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }

        const profAvail = await ProfAvail.findByPk(req.params.id);
        if (!profAvail) {
            return res.status(404).json({
                successful: false,
                message: "Professor Availability not found."
            });
        }

        const prof = await Professor.findByPk(ProfessorId);
        if (!prof) {
            return res.status(404).json({
                successful: false,
                message: "Professor not found."
            })
        }

        if (End_time <= Start_time) {
            return res.status(400).json({
                successful: false,
                message: "End time must be greater than Start time."
            });
        }

        await profAvail.update({ Day, Start_time, End_time, ProfessorId });

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
        const professorAvail = await ProfAvail.findByPk(req.params.id);
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
