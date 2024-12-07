const { Program } = require('../models');
const util = require('../../utils');
const { Op } = require('sequelize');

const addProgram = async (req, res, next) => {
    try {
        let programsToAdd = req.body;

        // Checking if programsToAdd is an array
        if (!Array.isArray(programsToAdd)) {
            programsToAdd = [programsToAdd]; // Convert to an array if not already
        }

        for (const programData of programsToAdd) {
            const { Code, Name } = programData;

            if (!util.checkMandatoryFields([Code, Name])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing.",
                });
            }

            // Check if Program Code already exists
            const existingProgramCode = await Program.findOne({ where: { Code } });
            if (existingProgramCode) {
                return res.status(406).json({
                    successful: false,
                    message: `Program Code ${Code} already exists.`,
                });
            }

            // Check if Program Name already exists
            const existingProgramName = await Program.findOne({ where: { Name } });
            if (existingProgramName) {
                return res.status(406).json({
                    successful: false,
                    message: `Program Name ${Name} already exists.`,
                });
            }

            // Create the new program
            await Program.create({ Code, Name });
        }

        return res.status(201).json({
            successful: true,
            message: "Successfully added new program(s).",
        });
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred.",
        });
    }
};

const getProgram = async (req, res, next) => {
    try {
        const programId = req.params.id; // Retrieve id from request parameters
        const program = await Program.findByPk(programId);

        if (!program) {
            return res.status(404).json({
                successful: false,
                message: `Program with ID ${programId} not found.`,
            });
        }

        return res.status(200).json({
            successful: true,
            message: `Successfully retrieved program with ID ${programId}.`,
            data: program,
        });
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred.",
        });
    }
};

const getAllProgram = async (req, res, next) => {
    try {
        const programs = await Program.findAll();

        if (!programs || programs.length === 0) {
            return res.status(200).json({
                successful: true,
                message: "No programs found.",
                count: 0,
                data: [],
            });
        }

        return res.status(200).json({
            successful: true,
            message: "Retrieved all programs.",
            count: programs.length,
            data: programs,
        });
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred.",
        });
    }
};

const updateProgram = async (req, res, next) => {
    try {
        const programId = req.params.id; // Retrieve id from request parameters
        const { Code, Name } = req.body; // Fields to update

        // Check if the program exists
        const program = await Program.findByPk(programId);
        if (!program) {
            return res.status(404).json({
                successful: false,
                message: `Program with ID ${programId} not found.`,
            });
        }

        // Check if Code or Name already exists (excluding the current program)
        if (Code) {
            const existingProgramCode = await Program.findOne({
                where: { Code, id: { [Op.ne]: programId } },
            });
            if (existingProgramCode) {
                return res.status(406).json({
                    successful: false,
                    message: `Program Code "${Code}" already exists.`,
                });
            }
        }

        if (Name) {
            const existingProgramName = await Program.findOne({
                where: { Name, id: { [Op.ne]: programId } },
            });
            if (existingProgramName) {
                return res.status(406).json({
                    successful: false,
                    message: `Program Name "${Name}" already exists.`,
                });
            }
        }

        // Update the program
        await program.update({ Code, Name });
        return res.status(200).json({
            successful: true,
            message: `Program with ID "${programId}" updated successfully.`,
            data: program,
        });
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred.",
        });
    }
};

const deleteProgram = async (req, res, next) => {
    try {
        const programId = req.params.id; // Retrieve id from request parameters

        // Check if the program exists
        const program = await Program.findByPk(programId);
        if (!program) {
            return res.status(404).json({
                successful: false,
                message: `Program with ID ${programId} not found.`,
            });
        }

        // Delete the program
        await program.destroy();
        return res.status(200).json({
            successful: true,
            message: `Program with Program Code ${program.Code} deleted successfully.`,
        });
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred.",
        });
    }
};

module.exports = { addProgram, getProgram, getAllProgram, updateProgram, deleteProgram };
