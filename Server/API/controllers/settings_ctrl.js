const { Settings } = require('../models');
const util = require('../../utils');
const jwt = require('jsonwebtoken')
const { REFRESH_TOKEN_SECRET } = process.env
const { addHistoryLog } = require('../controllers/historyLogs_ctrl');

const addSettings = async (req, res, next) => {
    try {
        // Check if settings already exist
        const existingSettings = await Settings.findOne();

        if (existingSettings) {
            return res.status(400).json({
                successful: false,
                message: "Global settings already exist. Use the update endpoint instead.",
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

        if (!util.checkMandatoryFields([StartHour, EndHour])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing.",
            });
        }

        // Validate hour ranges
        if (StartHour < 0 || StartHour > 23.75 || EndHour < 0.25 || EndHour > 24 || StartHour >= EndHour) {
            return res.status(400).json({
                successful: false,
                message: 'Invalid StartHour or EndHour. Ensure StartHour is before EndHour and within valid ranges.',
            });
        }

        const newSettings = await Settings.create({
            StartHour,
            EndHour,
            ProfessorMaxHours: ProfessorMaxHours || 12,
            StudentMaxHours: StudentMaxHours || 12,
            ProfessorBreak: ProfessorBreak || 1,
            MaxAllowedGap: MaxAllowedGap || 5,
            nextScheduleBreak: nextScheduleBreak || 0.5
        });

        // Log the creation action
        const token = req.cookies?.refreshToken;
        if (token) {
            try {
                const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
                const accountId = decoded.id || decoded.accountId;
                const page = 'Settings';
                const details = `Created Global Settings: ${StartHour}-${EndHour}h`;

                await addHistoryLog(accountId, page, details);
            } catch (err) {
                console.log('Token verification failed in settings creation');
            }
        }

        return res.status(201).json({
            successful: true,
            message: "Successfully added global settings.",
            data: newSettings
        });
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred.",
        });
    }
};

const getSettings = async (req, res, next) => {
    try {
        // Find the first (and only) settings record
        const settings = await Settings.findOne();

        if (!settings) {
            return res.status(404).json({
                successful: false,
                message: "Global settings not found.",
            });
        }

        return res.status(200).json({
            successful: true,
            message: "Successfully retrieved global settings.",
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
        const {
            StartHour,
            EndHour,
            ProfessorMaxHours,
            StudentMaxHours,
            ProfessorBreak,
            MaxAllowedGap,
            nextScheduleBreak
        } = req.body;

        // Find the first (and only) settings record
        const settings = await Settings.findOne();

        if (!settings) {
            return res.status(404).json({
                successful: false,
                message: "Global settings not found.",
            });
        }

        // Store original values for history log
        const oldHours = `${settings.StartHour}-${settings.EndHour}h`;

        // Validate mandatory fields if provided
        if ((StartHour !== undefined && EndHour !== undefined) &&
            (StartHour < 0 || StartHour > 23.75 || EndHour < 0.25 || EndHour > 24 || StartHour >= EndHour)) {
            return res.status(400).json({
                successful: false,
                message: 'Invalid StartHour or EndHour. Ensure StartHour is before EndHour and within valid ranges.',
            });
        }

        // Update only the fields that are provided
        const updateData = {};
        if (StartHour !== undefined) updateData.StartHour = StartHour;
        if (EndHour !== undefined) updateData.EndHour = EndHour;
        if (ProfessorMaxHours !== undefined) updateData.ProfessorMaxHours = ProfessorMaxHours;
        if (StudentMaxHours !== undefined) updateData.StudentMaxHours = StudentMaxHours;
        if (ProfessorBreak !== undefined) updateData.ProfessorBreak = ProfessorBreak;
        if (MaxAllowedGap !== undefined) updateData.MaxAllowedGap = MaxAllowedGap;
        if (nextScheduleBreak !== undefined) updateData.nextScheduleBreak = nextScheduleBreak;

        await settings.update(updateData);

        // Get updated settings for response
        const updatedSettings = await Settings.findOne();

        // Log the update action
        const token = req.cookies?.refreshToken;
        if (token) {
            try {
                const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
                const accountId = decoded.id || decoded.accountId;
                const page = 'Settings';

                // Create a shorter log message focusing on the most important changes
                let changedFields = [];
                if (updateData.StartHour !== undefined || updateData.EndHour !== undefined) {
                    changedFields.push(`Hours: ${oldHours} → ${updatedSettings.StartHour}-${updatedSettings.EndHour}h`);
                }
                if (updateData.ProfessorMaxHours !== undefined) {
                    changedFields.push(`MaxP: ${updatedSettings.ProfessorMaxHours}`);
                }
                if (updateData.StudentMaxHours !== undefined) {
                    changedFields.push(`MaxS: ${updatedSettings.StudentMaxHours}`);
                }

                const details = `Updated Settings: ${changedFields.join(', ')}`;

                await addHistoryLog(accountId, page, details);
            } catch (err) {
                console.log('Token verification failed in settings update');
            }
        }

        return res.status(200).json({
            successful: true,
            message: 'Global settings updated successfully.',
            data: updatedSettings
        });
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred.",
        });
    }
};

module.exports = {
    addSettings,
    getSettings,
    updateSettings
};