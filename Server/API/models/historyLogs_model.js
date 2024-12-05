module.exports = (sequelize, DataTypes) => {
    const Account = require("./account_model")(sequelize, DataTypes)
    const HistoryLog = sequelize.define('HistoryLog', {
        Page: {
            type: DataTypes.STRING,
            allowNull: false
        },
        Details: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        timestamps: true
    });
    Account.hasMany(HistoryLog, {
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
    })
    HistoryLog.belongsTo(Account)
    return HistoryLog
}