const { Settings } = require('../models');
const util = require('../../utils');

const addSettings = async (req, res, next) => {
    try {
        const { MaxCourseDuration, MaxBreakDuration } = req.body;

        if (!util.checkMandatoryFields([MaxCourseDuration, MaxBreakDuration])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing.",
            })
        }
        await Settings.create({ MaxCourseDuration, MaxBreakDuration });

        return res.status(201).json({
            successful: true,
            message: "Successfully added new settings.",
        })
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred.",
        })
    }
};

const getSettings = async (req, res, next) => {
    try {
        const settings = await Settings.findByPk(1);

        if (!settings) {
            return res.status(404).json({
                successful: false,
                message: `Settings not found.`,
            });
        }

        return res.status(200).json({
            successful: true,
            message: `Successfully retrieved settings.`,
            data: settings,
        });
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred.",
        });
    }
};

const updateSettings = async (req, res, next) => {
    try {
        const { MaxCourseDuration, MaxBreakDuration } = req.body

        const settings = await Settings.findByPk(1);
        if (!settings) {
            return res.status(404).json({
                successful: false,
                message: 'Settings not found.',
            });
        }

        await settings.update({MaxCourseDuration, MaxBreakDuration });
        return res.status(200).json({
            successful: true,
            message: 'Settings updated successfully.',
            data: settings,
        });
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred.",
        });
    }
};


module.exports = { addSettings, getSettings, updateSettings}