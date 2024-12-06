module.exports = (sequelize, DataTypes) => {

    const ProfAvailSched = sequelize.define('ProfAvailSchedule', {
        Start_time: {
            type: DataTypes.TIME,
            allowNull: false
        },
        End_time: {
            type: DataTypes.TIME,
            allowNull: false
        }
    }, {
        timestamps: true
    });
    return ProfAvailSched
}