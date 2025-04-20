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
        RoomType.hasMany(models.Room, {
            onDelete: 'RESTRICT', // Prevent deletion of a room type if rooms are using it
            onUpdate: 'CASCADE'
        });
        RoomType.hasMany(models.Assignation, {
            onDelete: 'RESTRICT', // Prevent deletion of a room type if rooms are using it
            onUpdate: 'CASCADE'
        });
    };

    return RoomType;
};