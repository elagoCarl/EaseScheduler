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
        }
    }, {
        timestamps: true
    })
    Account.associate = (models) => {
        Account.hasMany(models.HistoryLog, {
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE'
        }),
        Account.hasMany(models.OTP, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        }),
        Account.hasMany(models.Session, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        })
    }
    return Account
}
