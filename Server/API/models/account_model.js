const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
    const Account = sequelize.define('Account', {
        Name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Name is required." }
            }
        },
        Email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: { msg: "Valid Email is required." },
                notEmpty: { msg: "Email is required." }
            }
        },
        Password: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Password is required." },
                len: {
                    args: [8],
                    msg: "Minimum password length should be 8 characters."
                }
            }
        },
        Roles: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Role is required." }
            }
        },
        verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        DepartmentId: {  // Foreign key linking Account to Department
            type: DataTypes.INTEGER,
            references: {
                model: 'Departments', // Table name
                key: 'id'
            },
            allowNull: true // Set NULL if the account is not linked to any department
        }
    }, {
        timestamps: true,
        hooks: {
            beforeCreate: async (account) => {
                const salt = await bcrypt.genSalt();
                account.Password = await bcrypt.hash(account.Password, salt);
            },
            beforeUpdate: async (account) => {
                if (account.changed('Password')) {
                    const salt = await bcrypt.genSalt();
                    account.Password = await bcrypt.hash(account.Password, salt);
                }
            },
            afterSync: async () => {
                try {
                    // Check if default account already exists
                    const adminExists = await Account.findOne({
                        where: { Email: 'admin@example.com' }
                    });

                    if (!adminExists) {
                        // Create default admin account with null department
                        await Account.create({
                            Name: 'Default Admin',
                            Email: 'admin@example.com',
                            Password: 'Admin123', // Will be hashed by beforeCreate hook
                            Roles: 'Admin',
                            verified: true,
                            DepartmentId: null
                        });
                        console.log('Default admin account created successfully');
                    }
                } catch (error) {
                    console.error('Error creating default admin account:', error);
                }
            }
        }
    });


    Account.associate = (models) => {
        Account.belongsTo(models.Department, {
            foreignKey: 'DepartmentId'
        });
        Account.hasMany(models.HistoryLog, {
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE'
        });
        Account.hasMany(models.OTP, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        Account.hasMany(models.Session, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
    };

    Account.login = async function (Email, Password) {
        const user = await Account.findOne({ where: { Email } });
        if (user) {
            const auth = await bcrypt.compare(Password, user.Password);
            if (auth) {
                return user;
            }
            throw new Error('Invalid Password');
        }
        throw new Error('Email does not exist');
    };

    return Account;
};