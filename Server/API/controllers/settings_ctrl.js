const { Settings } = require('../models');
const util = require('../../utils');

const addSettings = async (req, res, next) => {
    try {
        const { StartHour, EndHour } = req.body;

        if (!util.checkMandatoryFields([ StartHour, EndHour ])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing.",
            })
        }
        await Settings.create({ StartHour, EndHour });

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
        const { StartHour, EndHour } = req.body

        if (StartHour < 0 || StartHour > 23 || EndHour < 0 || EndHour > 23 || StartHour >= EndHour) {
            return res.status(400).json({
                successful: false,
                message: 'Invalid StartHour or EndHour. Ensure StartHour is before EndHour and within 0-23 range.',
            });
        }

        const settings = await Settings.findByPk(1);
        if (!settings) {
            return res.status(404).json({
                successful: false,
                message: 'Settings not found.',
            });
        }

        await settings.update({StartHour, EndHour});
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