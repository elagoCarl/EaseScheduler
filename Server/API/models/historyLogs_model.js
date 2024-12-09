module.exports = (sequelize, DataTypes) => {
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
    })
    HistoryLog.associate = (models) => {
        HistoryLog.belongsTo(models.Account)
    }
    
    return HistoryLog
}