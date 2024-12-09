module.exports = (sequelize, DataTypes) => {
    const Session = sequelize.define('Session', {
        Token: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Token is required." }
            }
        }
    }, {
        timestamps: true

    });
    Session.associate = (models) => {
        Session.belongsTo(models.Account)
    }
    
    return Session
}