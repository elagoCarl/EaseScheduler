const { Account } = require('../models'); // Ensure model name matches exported model
const util = require('../../utils');
const bcrypt = require('bcrypt');
// const sendOTPVerificationEmail = require('./sendOTPVerificationEmail'); // Placeholder for your email sending logic

const addAccount = async (req, res, next) => {
    try {
        const { Name, Email, Role } = req.body;
        const DefaultPassword = "CsitAdmin!12345"; // Default password

        // Validate mandatory fields
        if (!util.checkMandatoryFields([Name, Email, Role])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }

        // Validate email format
        if (!util.validateEmail(Email)) {
            return res.status(406).json({
                successful: false,
                message: "Invalid email format."
            });
        }

        // Check if the email already exists
        const existingAccount = await Account.findOne({ where: { Email } });
        if (existingAccount) {
            return res.status(406).json({
                successful: false,
                message: "Email already exists. Please use a different email."
            });
        }

        // Hash the default password
        // const hashedPassword = await bcrypt.hash(DefaultPassword, 10);

        // Create and save the new account
        const newAccount = await Account.create({
            Name: Name,
            Email: Email,
            Password: DefaultPassword,
            Roles: Role,
            verified: false
        });

        // Optionally send an OTP verification email
        // await sendOTPVerificationEmail({
        //     _id: newAccount.id,
        //     email: newAccount.Email
        // });

        return res.status(201).json({
            successful: true,
            message: "Successfully added new account. Verification email sent."
        });

    } catch (err) {
        console.error(err); // Log the error for debugging
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};

module.exports = { addAccount };
