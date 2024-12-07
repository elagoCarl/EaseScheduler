const { ProgYrSec } = require('../models');
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
            const { Year, Section } = progYrSecData;

            if (!util.checkMandatoryFields([Year, Section])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing."
                });
            }

            // Ensure Year is unique
            const existingProgYrSecYear = await ProgYrSec.findOne({ where: { Year } });
            if (existingProgYrSecYear) {
                return res.status(406).json({
                    successful: false,
                    message: `ProgYrSec ${Year} already exists.`
                });
            }

            // Ensure Section is unique
            const existingProgYrSecSection = await ProgYrSec.findOne({ where: { Section } });
            if (existingProgYrSecSection) {
                return res.status(406).json({
                    successful: false,
                    message: `ProgYrSec with section ${Section} already exists.`
                });
            }

            // Create ProgYrSec record
            await ProgYrSec.create({ Year, Section });
        }

        return res.status(200).json({
            successful: true,
            message: "Successfully added new progYrSec(s)."
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

        const progYrSec = await ProgYrSec.findByPk(id);
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
        const progYrSecs = await ProgYrSec.findAll();

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
        const { Year, Section } = req.body;

        if (!util.checkMandatoryFields([Year, Section])) {
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

        // Ensure Year and Section are unique
        const existingProgYrSecYear = await ProgYrSec.findOne({ where: { Year, id: { [Op.ne]: id } } });
        if (existingProgYrSecYear) {
            return res.status(406).json({
                successful: false,
                message: `ProgYrSec with Year ${Year} already exists.`
            });
        }

        const existingProgYrSecSection = await ProgYrSec.findOne({ where: { Section, id: { [Op.ne]: id } } });
        if (existingProgYrSecSection) {
            return res.status(406).json({
                successful: false,
                message: `ProgYrSec with section ${Section} already exists.`
            });
        }

        await progYrSec.update({ Year, Section });

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

// Export the functions
module.exports = {
    addProgYrSec,
    getProgYrSec,
    getAllProgYrSec,
    updateProgYrSec,
    deleteProgYrSec
};
