module.exports = (sequelize, DataTypes) => {
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
    OTP.associate = (models) => {
        OTP.belongsTo(models.Account)
    }
    
    return OTP
}