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
        timestamps: true,
        indexes: [
            {
                name: 'Schedules_RoomId_AssignationId_index',
                fields: ['RoomId', 'AssignationId'],
                unique: false
            }
        ]
    });

    Schedule.associate = (models) => {
        Schedule.belongsTo(models.Room, { 
            foreignKey: 'RoomId',
            constraints: false
        });
        Schedule.belongsTo(models.Assignation, { 
            foreignKey: 'AssignationId',
            constraints: false
        });
        Schedule.belongsToMany(models.ProgYrSec, { 
            through: 'SectionSched',
            foreignKey: 'ScheduleId'
        });
    };
    
    return Schedule
}