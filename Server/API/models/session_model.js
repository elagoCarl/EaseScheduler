module.exports = (sequelize, DataTypes) => {
    const Account = require("./account_model")(sequelize, DataTypes)
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
    Account.hasMany(Session, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    Session.belongsTo(Account)
    return Session
}