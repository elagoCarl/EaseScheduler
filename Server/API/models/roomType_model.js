module.exports = (sequelize, DataTypes) => {
    const RoomType = sequelize.define('RoomType', {
        Type: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: { msg: "Type is required." }
            }
        }
    }, {
        timestamps: true
    });

    RoomType.associate = (models) => {
        RoomType.belongsToMany(models.Room, {
            through: 'TypeRoom',
            as: 'RoomTypes',
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE'
        });
        RoomType.hasMany(models.Course, {
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE'
        })
        RoomType.hasMany(models.Room, {
            as: 'PrimaryType',
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE'
        })
    };

    return RoomType;
};