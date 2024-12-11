const { ProgYrSec, Program } = require('../models');
const util = require('../../utils');
const { Op } = require('sequelize');

// Add ProgYrSec (Single or Bulk)
const addProgYrSec = async (req, res, next) => {
    try {
        let progYrSecToAdd = req.body;

        // Turn to array for bulk processing
        if (!Array.isArray(progYrSecToAdd)) {
            progYrSecToAdd = [progYrSecToAdd];
        }

        // Iterate through the array and check required fields
        for (const progYrSecData of progYrSecToAdd) {
            const { Year, Section, ProgramId } = progYrSecData;

            if (!util.checkMandatoryFields([Year, Section, ProgramId])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing."
                });
            }

            // Check if ProgramId exists in the Program table
            const program = await Program.findByPk(ProgramId);
            if (!program) {
                return res.status(404).json({
                    successful: false,
                    message: `Program with ID ${ProgramId} not found.`
                });
            }

            // Ensure Year and Section combination is unique for the same ProgramId
            const existingProgYrSec = await ProgYrSec.findOne({
                where: { Year, Section, ProgramId }
            });
            if (existingProgYrSec) {
                return res.status(406).json({
                    successful: false,
                    message: `ProgYrSec with Year ${Year} and Section ${Section} already exists for Program ID ${ProgramId}.`
                });
            }

            // Create ProgYrSec record
            await ProgYrSec.create({ Year, Section, ProgramId });
        }

        return res.status(200).json({
            successful: true,
            message: "Successfully added new ProgYrSec(s)."
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

// Get a Single ProgYrSec by ID
const getProgYrSec = async (req, res, next) => {
    try {
        const { id } = req.params;

        const progYrSec = await ProgYrSec.findByPk(id, {
            include: { model: Program, attributes: ['id', 'Name', 'Code'] }
        });

        console.log("TNAGIN::::: :ASD:AD: A:SD :A:: ", progYrSec)
        if (!progYrSec) {
            return res.status(404).json({
                successful: false,
                message: "ProgYrSec not found."
            });
        }

        return res.status(200).json({
            successful: true,
            data: progYrSec
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

// Get All ProgYrSec
const getAllProgYrSec = async (req, res, next) => {
    try {
        const progYrSecs = await ProgYrSec.findAll({
            include: { model: Program, attributes: ['id', 'Name', 'Code'] }
        });

        return res.status(200).json({
            successful: true,
            data: progYrSecs
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

// Update ProgYrSec by ID
const updateProgYrSec = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { Year, Section, ProgramId } = req.body;

        if (!util.checkMandatoryFields([Year, Section, ProgramId])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }

        const progYrSec = await ProgYrSec.findByPk(id);
        if (!progYrSec) {
            return res.status(404).json({
                successful: false,
                message: "ProgYrSec not found."
            });
        }

        // Check if ProgramId exists in the Program table
        const program = await Program.findByPk(ProgramId);
        if (!program) {
            return res.status(404).json({
                successful: false,
                message: `Program with ID ${ProgramId} not found.`
            });
        }

        // Ensure Year and Section combination is unique for the same ProgramId
        const existingProgYrSec = await ProgYrSec.findOne({
            where: { Year, Section, ProgramId, id: { [Op.ne]: id } }
        });
        if (existingProgYrSec) {
            return res.status(406).json({
                successful: false,
                message: `ProgYrSec with Year ${Year} and Section ${Section} already exists for Program ID ${ProgramId}.`
            });
        }

        await progYrSec.update({ Year, Section, ProgramId });

        return res.status(200).json({
            successful: true,
            message: "ProgYrSec updated successfully."
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

// Delete ProgYrSec by ID
const deleteProgYrSec = async (req, res, next) => {
    try {
        const { id } = req.params;

        const progYrSec = await ProgYrSec.findByPk(id);
        if (!progYrSec) {
            return res.status(404).json({
                successful: false,
                message: "ProgYrSec not found."
            });
        }

        await progYrSec.destroy();

        return res.status(200).json({
            successful: true,
            message: "ProgYrSec deleted successfully."
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

const getAllProgYrSecByProgram = async (req, res, next) => {
    try {
        const ProgramId = req.params.id
        const progYrSecs = await ProgYrSec.findAll({ where: { ProgramId } })
        if (!progYrSecs || progYrSecs.length === 0) {
            return res.status(200).json({
                successful: true,
                message: "No progYrSecs found.",
                count: 0,
                data: [],
            })
        }

        return res.status(200).json({
            successful: true,
            message: "Retrieved all progYrSecs.",
            count: progYrSecs.length,
            data: progYrSecs,
        });
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred.",
        });
    }
};
// Export the functions
module.exports = {
    addProgYrSec,
    getProgYrSec,
    getAllProgYrSec,
    updateProgYrSec,
    deleteProgYrSec,
    getAllProgYrSecByProgram
};
