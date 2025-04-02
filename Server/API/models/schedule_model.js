module.exports = (sequelize, DataTypes) => {
    const Schedule = sequelize.define('Schedule', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        Day: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        Start_time: {
            type: DataTypes.TIME,
            allowNull: false
        },
        End_time: {
            type: DataTypes.TIME,
            allowNull: false
        },
        isLocked: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    }, {
        timestamps: true
    });

    Schedule.associate = (models) => {
        Schedule.belongsTo(models.Room, { foreignKey: 'RoomId' });
        Schedule.belongsTo(models.Assignation, { foreignKey: 'AssignationId' });
        Schedule.belongsToMany(models.ProgYrSec, { 
            through: 'SectionSched', // Auto-generated bridge table
            foreignKey: 'ScheduleId'
        });
    };
    
    return Schedule
}