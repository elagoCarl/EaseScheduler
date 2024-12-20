const { Account, OTP, Session } = require('../models'); // Ensure model name matches exported model
const util = require('../../utils');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const { USER,
    APP_PASSWORD,
    ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET } = process.env


//nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use `true` for port 465, `false` for all other ports
    auth: {
        user: USER,
        pass: APP_PASSWORD,
    },
});



// Create access token
const maxAge = 60; // 1 minute in seconds
const createAccessToken = (id) => {
    return jwt.sign({ id }, ACCESS_TOKEN_SECRET, {
        expiresIn: maxAge,
    });
};



// Create refresh token
const createRefreshToken = (id) => {
    return jwt.sign({ id }, REFRESH_TOKEN_SECRET, {
        expiresIn: 60 * 60 * 24 * 30, // 30 days in seconds
    });
};



const generateAccessToken = async (req, res, next) => {
    const { refreshToken } = req.body; // Assuming the refresh token is sent in the request body

    // If refresh token is not provided, send error message
    if (!refreshToken) {
        return res.status(401).json({
            successful: false,
            message: "Refresh token not provided",
        });
    }

    try {
        // Find the session associated with the provided refresh token
        const session = await Session.findOne({ where: { token: refreshToken } });

        if (!session) {
            return res.status(403).json({
                successful: false,
                message: "Invalid refresh token",
            });
        }

        // Verify the refresh token
        const user = await jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
        console.log("user: ", user);

        // Create a new access token using the user id from the refresh token
        const accessToken = createAccessToken(user.id);

        // Send the new access token in a cookie (HTTP-only for security)
        res.cookie("jwt", accessToken, {
            httpOnly: true,
            maxAge: maxAge * 1000, // Convert seconds to milliseconds
        });

        return res.status(200).json({
            successful: true,
            message: "Access token generated successfully",
            AccessToken: accessToken,
        });
    } catch (err) {
        console.error("Error generating access token:", err);
        return res.status(400).json({
            successful: false,
            message: err.message || "Error generating access token",
        });
    }
};




// Send OTP Verification Email
const sendOTPVerificationEmail = async (userId, email) => {
    try {
        console.log("Received payload: ", { userId, email });

        if (!userId || !email) {
            throw new Error("AccountId or Email address is not provided.");
        }

        // Generate random 6-digit OTP
        const otp = `${Math.floor(100000 + Math.random() * 900000)}`;

        // Mail options
        const mailOptions = {
            from: {
                name: 'EaseScheduler',
                address: process.env.USER
            },
            to: email,
            subject: 'Verify Your EaseScheduler Account Email',
            text: 'Verify Email',
            html: `<p>Enter <b>${otp}</b> in EaseScheduler to verify your email address. This code <b>expires in 5 mins</b>.</p>`
        };

        // Hash the OTP
        const saltRounds = 10;
        const hashedOTP = await bcrypt.hash(otp, saltRounds);

        // Ensure userId is an integer
        const parsedUserId = parseInt(userId, 10);
        if (isNaN(parsedUserId)) {
            throw new Error("Invalid userId format.");
        }

        // Save OTP record in MySQL using Sequelize
        await OTP.create({
            OTP: hashedOTP,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 300000), // 5 mins expiration
            AccountId: parsedUserId,  // Make sure userId is an integer
        });

        // Send email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
                throw new Error("Email sending failed.");
            } else {
                console.log("Email sent successfully:", info.response);
            }
        });

    } catch (error) {
        console.error(error);
        throw new Error(error.message || "An unexpected error occurred.");
    }
};





const addAccount = async (req, res, next) => {
    try {
        const { Name, Email, Role } = req.body;
        const DefaultPassword = "CeuAdmin!12345"; // Default password

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
        console.log("NEW ACCOUNT ID AND EMAILL!!")
        console.log(newAccount.id)
        console.log(newAccount.Email)

        // MAGSESEND NA SYA NG OTP EMAIL SA USER
        // Send OTP verification email
        await sendOTPVerificationEmail(newAccount.id, newAccount.Email);



        return res.status(201).json({
            successful: true,
            message: "Successfully added new account. Verification email sent."
        });

    } catch (err) {
        console.error(err); //  PANG DEBUG
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};





const getAccountById = async (req, res, next) => {
    try {
        // Find account by primary key (id) using Sequelize
        const acc = await accountModel.findByPk(req.params.id);

        if (!acc) {
            res.status(404).send({
                successful: false,
                message: "Account not found"
            });
        } else {
            res.status(200).send({
                successful: true,
                message: "Retrieved account.",
                data: acc
            });
        }
    } catch (err) {
        res.status(500).send({
            successful: false,
            message: err.message
        });
    }
};







const loginAccount = async (req, res, next) => {
    const { Email, Password } = req.body;
    console.log("email:", Email);

    if (!util.checkMandatoryFields([Email, Password])) {
        // STATUS IS 400 SINCE THIS IS A CLIENT FAULT
        res.status(400).json({
            successful: false,
            message: "Required fields are empty."
        });
    } else {
        try {
            // Find user with Sequelize
            const user = await Account.login(Email, Password);

            if (!user) {
                res.status(401).json({
                    successful: false,
                    message: "Invalid credentials."
                });
                return;
            }

            const accessToken = createAccessToken(user.id);
            const refreshToken = createRefreshToken(user.id);

            // Save tokens in the database
            await Session.create({
                Token: refreshToken,
                AccountId: user.id
            });

            console.log("LOGGED IN, Tokens saved successfully");

            res.cookie('jwt', accessToken, { httpOnly: true, maxAge: maxAge * 1000 });
            res.cookie('refreshToken', refreshToken, { httpOnly: true, maxAge: (60 * 60 * 24 * 30) * 1000 });
            res.status(201).json({
                successful: true,
                message: "Successfully logged in."
            });
        } catch (err) {
            console.error("NOT LOGGED IN, Error saving tokens:", err);
            res.status(500).json({
                successful: false,
                message: err.message
            });
        }
    }
};






const verifyAccountOTP = async (req, res, next) => {
    try {
        const { userId, otp } = req.body;

        if (!userId || !otp) {
            throw new Error("Empty OTP details are not allowed");
        }

        // Fetch OTP and account records
        const OTPModelRecord = await OTP.findOne({ where: { AccountId: userId } });
        const account = await Account.findOne({ where: { id: userId } });

        if (!OTPModelRecord) {
            throw new Error("Account record doesn't exist or has been verified already. Please sign up or log in.");
        }

        console.log("Fetched OTP Record:", OTPModelRecord);

        const { expiresAt, OTP: hashedOTP } = OTPModelRecord;

        if (!hashedOTP) {
            throw new Error("OTP not found.");
        }

        if (expiresAt < Date.now()) {
            await OTP.destroy({ where: { AccountId: userId } });
            await sendOTPVerificationEmail(account.id, account.Email);

            throw new Error("Code has expired. Please check your email, we sent a new verification code.");
        }

        const validOTP = await bcrypt.compare(otp, hashedOTP);
        if (!validOTP) {
            throw new Error("Invalid code, check your email.");
        }

        await Account.update({ verified: true }, { where: { id: userId } });
        await OTP.destroy({ where: { AccountId: userId } });

        res.status(200).json({
            successful: true,
            status: "Verified",
            message: "User email verified successfully."
        });

    } catch (error) {
        console.error("Verification Error:", error);
        res.status(400).json({
            successful: false,
            message: error.message
        });
    }
};



const changePassword = async (req, res, next) => {
    try {
        const { Email, oldPassword, newPassword } = req.body;

        if (!util.checkMandatoryFields([Email, oldPassword, newPassword])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }

        // Find the account based on the provided email
        const account = await Account.findOne({ where: { Email } });

        if (!account) {
            return res.status(404).json({
                successful: false,
                message: "No account found"
            });
        }

        // Verify the old password
        const isMatch = await bcrypt.compare(oldPassword, account.Password);
        if (!isMatch) {
            return res.status(401).json({
                successful: false,
                message: "Incorrect old password"
            });
        }

        // Validate the new password
        if (!util.validatePassword(newPassword)) {
            return res.status(406).json({
                successful: false,
                message: "Invalid password. It must contain at least eight characters, one uppercase letter, one lowercase letter, one number, and one special character."
            });
        }

        // Check if the old and new passwords are the same
        if (await bcrypt.compare(newPassword, account.Password)) {
            return res.status(406).json({
                successful: false,
                message: "Your new password is the same as your current password."
            });
        }

        // Hash and update the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await Account.update(
            { Password: hashedPassword },
            { where: { Email } }
        );

        return res.status(200).json({
            successful: true,
            message: "Password changed successfully."
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message
        });
    }
};



const sendTempPass = async (req, res, next) => {
    try {
        const { Email } = req.body;
        console.log("Received payload: ", req.body);

        if (!Email) {
            return res.status(400).json({
                status: 'Failed',
                message: "Email address is not provided."
            });
        }

        // Generate a random temporary password
        const randomNumber = Math.floor(100000 + Math.random() * 900000);
        let tempPassword = `Ceu!${randomNumber}!Admin`;  // Use 'let' instead of 'const'
        
        // Hash the generated temporary password
        const salt = await bcrypt.genSalt();
        const hashedTempPassword = await bcrypt.hash(tempPassword, salt);

        // Mail options from nodemailer documentation
        const mailOptions = {
            from: {
                name: 'EaseScheduler',
                address: process.env.USER
            },
            to: Email,
            subject: 'Forgot Password in EaseScheduler Account.',
            text: 'Temporary Password:',
            html: `<p>Your temporary password is <b>${tempPassword}</b>. Use this to log in.</p>`
        };

        // Find account by email using Sequelize
        const account = await Account.findOne({ where: { Email } });

        if (!account) {
            return res.status(404).json({
                successful: false,
                message: "No account found."
            });
        }

        // Update password with hashed password in Sequelize
        await Account.update(
            { Password: hashedTempPassword },
            { where: { Email } }
        );

        // Send email with temporary password
        await transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log("Error occurred while sending email:", error);
                throw new Error("Failed to send temporary password.");
            } else {
                console.log("Email sent successfully:", info.response);
            }
        });

        res.status(201).json({
            status: 'Pending',
            successful: true,
            message: 'Temporary password sent.',
            data: {
                email: Email
            }
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            status: 'Failed',
            message: error.message
        });
    }
};



module.exports = {
    addAccount,
    getAccountById,
    loginAccount,
    sendOTPVerificationEmail,
    generateAccessToken,
    verifyAccountOTP,
    changePassword,
    sendTempPass
};
