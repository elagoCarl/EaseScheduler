const { Account, AccountArchives } = require('../models');
const jwt = require('jsonwebtoken');
const { REFRESH_TOKEN_SECRET } = process.env;
const { addHistoryLog } = require('../controllers/historyLogs_ctrl');

// Controller function to archive an account
const archiveAccount = async (req, res) => {
    try {
        // Find the account by ID
        const acc = await Account.findByPk(req.params.id);

        if (!acc) {
            return res.status(404).json({
                successful: false,
                message: "No account found"
            });
        }

        // Archive the account
        await AccountArchives.create({
            Name: acc.Name,
            Email: acc.Email,
            Roles: acc.Roles
        });

        // Delete the account from the original table
        await acc.destroy();
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
        const page = 'Archive Account';
        const details = `Archived Account: Account_ID - ${acc.id}, Name - ${acc.Name}, Email - ${acc.Email}`;

        await addHistoryLog(accountId, page, details);

        res.status(201).json({
            successful: true,
            message: "Successfully archived account."
        });
    } catch (error) {
        res.status(500).json({
            successful: false,
            message: error
        });
    }
};


const getAllArchivedAccounts = async (req, res) => {
    try {
        const archivedAccounts = await AccountArchives.findAll({
            attributes: ['id', 'Name', 'Email', 'Roles', 'createdAt']
        });

        if (!archivedAccounts || archivedAccounts.length === 0) {
            return res.status(404).json({ error: "No archived accounts found." });
        }

        res.status(200).json(archivedAccounts);
    } catch (error) {
        console.error('Error fetching archived accounts:', error);

        if (error.name === 'SequelizeDatabaseError') {
            return res.status(400).json({ error: "Database error occurred." });
        }

        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { getAllArchivedAccounts };


module.exports = {
    archiveAccount,
    getAllArchivedAccounts
};
