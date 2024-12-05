module.exports = (sequelize, DataTypes) => {
    const Account = require("./account_model")(sequelize, DataTypes)
    const OTP = sequelize.define('OTP', {
        OTP: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: { msg: "Token is required." }
            }
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, {
        timestamps: true
    });
    Account.hasMany(OTP, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    OTP.belongsTo(Account)
    return OTP
}