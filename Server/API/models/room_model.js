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
    return Room
}