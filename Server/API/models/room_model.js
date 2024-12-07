module.exports = (sequelize, DataTypes) => {
    const Department = require("./dept_model")(sequelize, DataTypes)
    const Room = sequelize.define('Room', {
        Code: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: { msg: "Room code is required." }
            }
        },
        Floor: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Floor is required." }
            }
        },
        Building: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Building is required." }
            }
        },
        Type: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Room type is required." }
            }
        }
    }, {
        timestamps: true
    });
    Department.belongsToMany(Room, {
        through: 'DeptRoom',
        as: 'DeptRooms',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    Room.belongsToMany(Department, {
        through: 'DeptRoom',
        as: 'RoomDepts',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })

    return Room
}