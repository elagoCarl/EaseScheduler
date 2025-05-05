module.exports = (sequelize, DataTypes) => {
    const Pair = sequelize.define('Pair', {
        // Auto ID created by Sequelize
    }, {
        timestamps: true
    });

    Pair.associate = (models) => {
        // One pair can have multiple courses
        Pair.hasMany(models.Course, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
    };

    return Pair;
};