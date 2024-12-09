module.exports = (sequelize, DataTypes) => {
    const Schedule = sequelize.define('Schedule', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        Day: {
            type: DataTypes.STRING,
            allowNull: false
        },
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
    Schedule.associate = (models) => {
        Schedule.belongsTo(models.Room),
        Schedule.belongsTo(models.Assignation),
        Schedule.belongsToMany(models.ProgYrSec, { through: 'SectionSched' })
    }
    return Schedule
}