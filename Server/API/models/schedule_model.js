module.exports = (sequelize, DataTypes) => {
    const Room = require("./room_model")(sequelize, DataTypes)
    const Assignation = require("./assignation_model")(sequelize, DataTypes)
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
    Room.belongsToMany(Assignation, {through: 'Schedule'})
    Assignation.belongsToMany(Room, {through: 'Schedule'})
    Room.hasMany(Schedule, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    Schedule.belongsTo(Room)
    Assignation.hasMany(Schedule, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    Schedule.belongsTo(Assignation)
    return Schedule
}