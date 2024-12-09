const { HistoryLog, Account } = require('../models');

// Controller function to retrieve all history logs
const getAllHistoryLogs = async (req, res) => {
    try {
        const historyLogs = await HistoryLog.findAll({
            include: [{ model: Account, attributes: ['Name', 'Email'] }],
            order: [['createdAt', 'DESC']]
        });

        if (historyLogs.length === 0) {
            return res.status(200).json({
                successful: true,
                message: "No HistoryLog found",
                count: 0,
                data: []
            });
        }

        res.status(200).json({
            successful: true,
            message: "Retrieved all history logs",
            count: historyLogs.length,
            data: historyLogs
        });
    } catch (error) {
        res.status(500).json({
            successful: false,
            message: error.message
        });
    }
};

// Controller function to add a history log
const addHistoryLog = async (accountId, page, details) => {
    try {
        const account = await Account.findByPk(accountId);

        if (!account) {
            throw new Error("Account not found");
        }

        await HistoryLog.create({
            AccountId: accountId,
            Page: page,
            Details: details
        });

        console.log("History log added successfully");
    } catch (error) {
        console.error("Error adding history log:", error);
        throw new Error("Error adding history log");
    }
};

module.exports = {
    getAllHistoryLogs,
    addHistoryLog
};
