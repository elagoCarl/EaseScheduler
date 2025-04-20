const { Account, OTP, Session, Department } = require('../models'); // Ensure model name matches exported model
const util = require('../../utils');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const { refreshTokens } = require('./authMiddleware');
const { USER,
    APP_PASSWORD,
    ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET,
    TEMP_PASS_PREFIX,
    TEMP_PASS_SUFFIX, } = process.env


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
const maxAge = 30 * 60; // 30 mins
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
        // Destructure the required fields including DepartmentId
        const { Name, Email, Roles, DepartmentId } = req.body;
        const DefaultPassword = "CeuAdmin!12345"; // Default password

        // Check if all mandatory fields are provided
        if (!util.checkMandatoryFields([Name, Email, Roles, DepartmentId])) {
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

        // Create and save the new account (Password will be hashed by the model hook)
        const newAccount = await Account.create({
            Name,
            Email,
            Password: DefaultPassword,
            Roles,
            DepartmentId,
            verified: false
        });

        console.log("NEW ACCOUNT ID AND EMAIL:");
        console.log(newAccount);

        // Send OTP verification email
        await sendOTPVerificationEmail(newAccount.id, newAccount.Email);

        return res.status(201).json({
            successful: true,
            message: "Successfully added new account. Verification email sent."
        });
    } catch (err) {
        console.error(err); // For debugging
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};






const getAccountById = async (req, res, next) => {
    try {
        // Find account by primary key (id) using Sequelize
        const acc = await Account.findByPk(req.params.id);

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







const loginAccount = async (req, res) => {
    const { Email, Password } = req.body;
    console.log("Login attempt with email:", Email);

    if (!util.checkMandatoryFields([Email, Password])) {
        return res.status(400).json({
            successful: false,
            message: "Required fields are empty.",
        });
    }

    try {
        // Find user
        const user = await Account.findOne({ where: { Email } });

        // Check if user exists
        if (!user) {
            return res.status(401).json({
                successful: false,
                message: "Invalid credentials.",
            });
        }

        // Compare password
        const auth = await bcrypt.compare(Password, user.Password);
        if (!auth) {
            return res.status(401).json({
                successful: false,
                message: "Invalid credentials.",
            });
        }

        // Check if user is verified
        if (!user.verified) {
            await sendOTPVerificationEmail(user.id, user.Email);
            return res.status(401).json({
                successful: false,
                message: "Account not verified. OTP sent to email.",
            });
        }

        // Generate tokens
        const accessToken = createAccessToken(user.id);
        const refreshToken = createRefreshToken(user.id);

        // Store hashed refresh token in DB
        await Session.create({
            Token: refreshToken,
            AccountId: user.id,
        });

        console.log("User logged in. Tokens saved successfully.");

        // Set cookies securely
        // res.cookie('jwt', accessToken, {
        //     httpOnly: true,
        //     secure: process.env.NODE_ENV === 'production',
        //     sameSite: 'Strict',
        //     maxAge: maxAge * 1000,
        // });
        // res.cookie('refreshToken', refreshToken, {
        //     httpOnly: true,
        //     secure: process.env.NODE_ENV === 'production',
        //     sameSite: 'Strict',
        //     maxAge: 60 * 60 * 24 * 30 * 1000,
        // });

        res.cookie('jwt', accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            maxAge: maxAge * 1000,
            path: '/',
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            maxAge: 60 * 60 * 24 * 30 * 1000, //30days in milliseconds
            path: '/',
        });

        return res.status(200).json({
            successful: true,
            message: "Successfully logged in.",
            account: user, // ✅ Return user for frontend
        });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({
            successful: false,
            message: "Internal server error.",
        });
    }
};







// const verifyAccountOTP = async (req, res, next) => {
//     try {
//         const { userId, otp } = req.body;

//         if (!userId || !otp) {
//             throw new Error("Empty OTP details are not allowed");
//         }

//         // Fetch OTP and account records
//         const OTPModelRecord = await OTP.findOne({ where: { AccountId: userId } });
//         const account = await Account.findOne({ where: { id: userId } });

//         if (!OTPModelRecord) {
//             throw new Error("Account record doesn't exist or has been verified already. Please sign up or log in.");
//         }

//         console.log("Fetched OTP Record:", OTPModelRecord);

//         const { expiresAt, OTP: hashedOTP } = OTPModelRecord;

//         if (!hashedOTP) {
//             throw new Error("OTP not found.");
//         }

//         if (expiresAt < Date.now()) {
//             await OTP.destroy({ where: { AccountId: userId } });
//             await sendOTPVerificationEmail(account.id, account.Email);

//             throw new Error("Code has expired. Please check your email, we sent a new verification code.");
//         }

//         const validOTP = await bcrypt.compare(otp, hashedOTP);
//         if (!validOTP) {
//             throw new Error("Invalid code, check your email.");
//         }

//         await Account.update({ verified: true }, { where: { id: userId } });
//         await OTP.destroy({ where: { AccountId: userId } });

//         res.status(200).json({
//             successful: true,
//             status: "Verified",
//             message: "User email verified successfully."
//         });

//     } catch (error) {
//         console.error("Verification Error:", error);
//         res.status(400).json({
//             successful: false,
//             message: error.message
//         });
//     }
// };


const verifyAccountOTP = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        console.log("Received payload: ", req.body);
        if (!email || !otp) {
            throw new Error("Empty OTP details are not allowed");
        }

        // Fetch account record using email
        const account = await Account.findOne({ where: { Email: email } });

        if (!account) {
            throw new Error("Account record doesn't exist or has been verified already. Please sign up or log in.");
        }

        const OTPModelRecord = await OTP.findOne({ where: { AccountId: account.id } });

        if (!OTPModelRecord) {
            throw new Error("OTP record doesn't exist or has been verified already. Please sign up or log in.");
        }

        console.log("Fetched OTP Record:", OTPModelRecord);


        const { expiresAt, OTP: hashedOTP } = OTPModelRecord;

        console.log("OTP:", otp);
        console.log("Fetched OTP Record:", hashedOTP);

        if (!hashedOTP) {
            throw new Error("OTP not found.");
        }

        if (expiresAt < Date.now()) {
            await OTP.destroy({ where: { AccountId: account.id } });
            await sendOTPVerificationEmail(account.id, account.Email);

            throw new Error("Code has expired. Please check your email, we sent a new verification code.");
        }

        const validOTP = await bcrypt.compare(otp, hashedOTP);
        console.log("validOTP: ", validOTP)
        if (!validOTP) {
            throw new Error("Invalid code, check your email.");
        }

        await Account.update({ verified: true }, { where: { id: account.id } });
        await OTP.destroy({ where: { AccountId: account.id } });

        res.status(200).json({
            successful: true,
            status: "Verified",
            message: "User email verified successfully."
        });

    } catch (error) {
        console.error("Verification Error:", error);
        res.status(400).json({
            successful: false,
            message: error.message,
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
                message: "Invalid password. It must contain at least eight characters, one uppercase letter, one lowercase letter, and one number."
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



const forgotPass = async (req, res) => {
    try {
        const { email } = req.body; // Use lowercase 'email' to match the frontend
        console.log("Received payload: ", req.body);

        if (!email) {
            return res.status(400).json({
                status: 'Failed',
                message: "Email address is not provided."
            });
        }

        // Find account by email using Sequelize
        const account = await Account.findOne({ where: { email } });

        if (!account) {
            return res.status(404).json({
                successful: false,
                message: "The email address you provided does not exist in our system. Please check and try again."
            });
        }


        // Generate a random temporary password
        const randomNumber = Math.floor(100000 + Math.random() * 900000);
        const tempPassword = `${TEMP_PASS_PREFIX}${randomNumber}${TEMP_PASS_SUFFIX}`;

        // Hash the generated temporary password
        const salt = await bcrypt.genSalt();
        const hashedTempPassword = await bcrypt.hash(tempPassword, salt);

        // Mail options from nodemailer documentation
        const mailOptions = {
            from: {
                name: 'EaseScheduler',
                address: process.env.USER
            },
            to: email,
            subject: 'Reset Your EaseScheduler Password',
            text: `Your temporary password is: ${tempPassword}. Use this to log in to your EaseScheduler account.`,
            html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #4285F4; padding: 20px; text-align: center; border-radius: 5px;">
                    <h1 style="color: white; margin: 0;">EaseScheduler</h1>
                </div>
                
                <div style="padding: 20px; background-color: #ffffff;">
                    <h2>Password Reset</h2>
                    <p>Hello,</p>
                    <p>We received a request to reset your password. Here's your temporary password:</p>
                    
                    <div style="background-color: #f7f7f7; border: 1px solid #e0e0e0; border-radius: 5px; padding: 15px; margin: 20px 0; text-align: center;">
                        <span style="font-size: 24px; font-weight: bold;">${tempPassword}</span>
                    </div>
                    
                    <p>Please use this temporary password to log in. You'll be prompted to create a new password after signing in.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://ease-scheduler.vercel.app/loginPage" style="background-color: #4285F4; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Log In Now</a>
                    </div>
                    
                    <p>If you didn't request a password reset, please contact our support team.</p>
                    
                    <p>Thank you,<br>Tropang EaseScheduler</p>
                </div>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #777777;">
                    <p>© 2025 EaseScheduler. All rights reserved.</p>
                </div>
            </body>
            </html>
            `
        };

        // Update password with hashed password in Sequelize
        await Account.update(
            { Password: hashedTempPassword },
            { where: { email } }
        );

        // Send email with temporary password
        await transporter.sendMail(mailOptions);

        res.status(201).json({
            status: 'Pending',
            successful: true,
            message: 'Temporary password sent.',
            data: {
                email
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



const getAllAccounts = async (req, res) => {
    try {
        const accounts = await Account.findAll({
            attributes: ['id', 'Name', 'Email', 'Roles', 'verified', 'createdAt', 'updatedAt'] // Excluding password for security
        });
        if (!accounts || accounts.length === 0) {
            return res.status(404).json({ error: "No accounts found" });
        }
        res.status(200).json(accounts);
    } catch (error) {
        console.error("Error retrieving accounts:", error);
        res.status(500).json({ error: "Failed to retrieve accounts", details: error.message });
    }
};


const logoutAccount = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(400).json({
                successful: false,
                message: "Refresh token missing."
            });
        }

        // Decode the token without verifying its signature
        const decodedToken = jwt.decode(refreshToken);
        if (!decodedToken || !decodedToken.id) {
            return res.status(400).json({
                successful: false,
                message: "Invalid token."
            });
        }

        // Extract the user ID from the decoded token
        const userId = decodedToken.id;
        console.log(`User ID from refresh token: ${userId}`);

        // Remove all session records associated with the user account
        await Session.destroy({ where: { AccountId: userId } });

        // Clear the JWT and refreshToken cookies by setting their maxAge to 1 millisecond
        res.cookie('jwt', '', {
            maxAge: 1,
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            path: '/',
        });
        res.cookie('refreshToken', '', {
            maxAge: 1,
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            path: '/',
        });

        // Send success response
        res.status(200).json({
            successful: true,
            message: "Successfully logged out."
        });
    } catch (error) {
        console.error("Error logging out:", error);
        res.status(500).json({
            successful: false,
            message: "Internal server error"
        });
    }
};



const getCurrentAccount = async (req, res, next) => {
    res.set('Cache-Control', 'no-store');

    const AToken = req.cookies.jwt;
    const RToken = req.cookies.refreshToken;

    if (!AToken && !RToken) {
        return res.status(401).json({
            successful: false,
            message: 'Not authenticated'
        });
    }

    if (AToken) {
        try {
            // Try verifying the access token
            const decoded = jwt.verify(AToken, ACCESS_TOKEN_SECRET);
            const account = await Account.findByPk(decoded.id, {
                attributes: ['id', 'Name', 'Email', 'Roles', 'verified', 'DepartmentId'],
                include: [
                    {
                        model: Department,
                        attributes: ['Name']
                    }
                ]
            });

            if (!account) {
                return res.status(404).json({
                    successful: false,
                    message: 'Account not found'
                });
            }

            return res.status(200).json({
                successful: true,
                account
            });
        } catch (error) {
            console.error("Error verifying access token:", error.message);
            // If the access token is invalid/expired and a refresh token exists,
            // attempt to refresh tokens.
            if (RToken) {
                try {
                    const newDecoded = await refreshTokens(req, res);
                    const account = await Account.findByPk(newDecoded.id, {
                        attributes: ['id', 'Name', 'Email', 'Roles', 'verified', 'DepartmentId'],
                        include: [
                            {
                                model: Department,
                                attributes: ['Name']
                            }
                        ]
                    });
                    if (!account) {
                        return res.status(404).json({
                            successful: false,
                            message: 'Account not found'
                        });
                    }
                    return res.status(200).json({
                        successful: true,
                        account
                    });
                } catch (refreshError) {
                    console.error("Error refreshing tokens:", refreshError.message);
                    return res.status(401).json({
                        successful: false,
                        message: refreshError.message
                    });
                }
            } else {
                return res.status(401).json({
                    successful: false,
                    message: 'Invalid or expired token'
                });
            }
        }
    }

    // If there's no access token but a refresh token exists
    if (RToken && !AToken) {
        try {
            const newDecoded = await refreshTokens(req, res);
            const account = await Account.findByPk(newDecoded.id, {
                attributes: ['id', 'Name', 'Email', 'Roles', 'verified', 'DepartmentId'],
                include: [
                    {
                        model: Department,
                        attributes: ['Name']
                    }
                ]
            });
            if (!account) {
                return res.status(404).json({
                    successful: false,
                    message: 'Account not found'
                });
            }
            return res.status(200).json({
                successful: true,
                account
            });
        } catch (refreshError) {
            console.error("Error refreshing tokens:", refreshError.message);
            return res.status(401).json({
                successful: false,
                message: refreshError.message
            });
        }
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
    forgotPass,
    getAllAccounts,
    logoutAccount,
    getCurrentAccount
};
