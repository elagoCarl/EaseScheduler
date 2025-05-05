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
        }
    }, {
        timestamps: true
    });

    Room.associate = (models) => {
        Room.belongsToMany(models.RoomType, {
            through: 'TypeRoom',
            as: 'TypeRooms',
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE'
        });

        Room.belongsTo(models.RoomType, {
            foreignKey: 'PrimaryTypeId',
            as: 'PrimaryType'
        })

        Room.belongsToMany(models.Department, {
            through: 'DeptRoom',
            as: 'RoomDepts',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });

        Room.hasMany(models.Schedule, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
    };

    return Room;
};