module.exports = (sequelize, DataTypes) => {

    const Room = sequelize.define('Room', {
        Code: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: { msg: "Room code is required." }
            }
        },
        Seats: {
            type: DataTypes.INTEGER,
            allowNull: false,
            min: 1
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
    return Room
}