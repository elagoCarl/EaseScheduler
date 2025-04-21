const { Settings } = require('../models');
const util = require('../../utils');
const jwt = require('jsonwebtoken')
const { REFRESH_TOKEN_SECRET } = process.env
const { addHistoryLog } = require('../controllers/historyLogs_ctrl');

const addSettings = async (req, res, next) => {
    try {
        const { StartHour, EndHour } = req.body;

        if (!util.checkMandatoryFields([StartHour, EndHour])) {
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

        await settings.update({ StartHour, EndHour });
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

const getSettingsByDept = async (req, res, next) => {
    try {
        const departmentId = req.params.id;

        // Validate that departmentId is provided and is a number
        if (!departmentId || isNaN(parseInt(departmentId))) {
            return res.status(400).json({
                successful: false,
                message: "Valid department ID is required.",
            });
        }

        // Find settings for the specified department
        const settings = await Settings.findOne({
            where: { DepartmentId: departmentId }
        });

        if (!settings) {
            return res.status(404).json({
                successful: false,
                message: `Settings for department ID ${departmentId} not found.`,
            });
        }

        return res.status(200).json({
            successful: true,
            message: `Successfully retrieved settings for department ID ${departmentId}.`,
            data: settings,
        });
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred.",
        });
    }
};

const updateSettingsByDept = async (req, res, next) => {
    try {
        const departmentId = req.params.id;

        if (!departmentId || isNaN(parseInt(departmentId))) {
            return res.status(400).json({
                successful: false,
                message: "Valid department ID is required."
            });
        }

        // Find settings for the specified department
        const settings = await Settings.findOne({
            where: { DepartmentId: departmentId }
        });

        if (!settings) {
            return res.status(404).json({
                successful: false,
                message: `Settings for department ID ${departmentId} not found.`
            });
        }

        const {
            StartHour,
            EndHour,
            ProfessorMaxHours,
            StudentMaxHours,
            ProfessorBreak,
            MaxAllowedGap,
            nextScheduleBreak
        } = req.body;

        if (!util.checkMandatoryFields([StartHour, EndHour, ProfessorMaxHours, StudentMaxHours, ProfessorBreak, MaxAllowedGap, nextScheduleBreak])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }

        // Validate StartHour and EndHour
        if (StartHour < 0 || StartHour > 23 || EndHour < 0 || EndHour > 23 || StartHour >= EndHour) {
            return res.status(406).json({
                successful: false,
                message: 'Invalid StartHour or EndHour. Ensure StartHour is before EndHour and within 0:00 - 23:00 range.'
            });
        }

        // Update the settings
        const updatedSettings = await settings.update({
            StartHour,
            EndHour,
            ProfessorMaxHours,
            StudentMaxHours,
            ProfessorBreak,
            MaxAllowedGap,
            nextScheduleBreak
        });

        // Log the update action
        const token = req.cookies?.refreshToken;
        if (!token) {
            return res.status(401).json({
                successful: false,
                message: "Unauthorized: refreshToken not found."
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, REFRESH_TOKEN_SECRET); // or your secret key
        } catch (err) {
            return res.status(403).json({
                successful: false,
                message: "Invalid refreshToken."
            });
        }

        const accountId = decoded.id || decoded.accountId; // adjust based on your token payload
        const page = 'Settings';
        const details = `Updated Dept ${departmentId} Settings: Old [${settings.StartHour}-${settings.EndHour}h, MaxP:${settings.ProfessorMaxHours}, MaxS:${settings.StudentMaxHours}, Break:${settings.ProfessorBreak}, Gap:${settings.MaxAllowedGap}, NextBreak:${settings.nextScheduleBreak}] → New [${StartHour}-${EndHour}h, MaxP:${ProfessorMaxHours}, MaxS:${StudentMaxHours}, Break:${ProfessorBreak}, Gap:${MaxAllowedGap}, NextBreak:${nextScheduleBreak}]`;

        await addHistoryLog(accountId, page, details);

        return res.status(200).json({
            successful: true,
            message: `Settings for department ID ${departmentId} updated successfully.`,
            data: updatedSettings
        });
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

module.exports = {
    addSettings,
    getSettings,
    updateSettings,
    getSettingsByDept,
    updateSettingsByDept
}