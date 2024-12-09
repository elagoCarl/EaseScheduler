module.exports = (sequelize, DataTypes) => {
    const Assignation = sequelize.define('Assignation', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        School_Year: {
            type: DataTypes.STRING,
            allowNull: false
        },
        Semester: {
            type: DataTypes.STRING,
            allowNull: false
        },
        Block: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        timestamps: true
    })
    Assignation.associate = (models) => {
        Assignation.belongsTo(models.Professor),
        Assignation.belongsTo(models.Course),
        Assignation.belongsTo(models.Department),
        Assignation.belongsToMany(models.Room, {through: 'Schedule'}),
        Assignation.hasMany(models.Schedule, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        })
    }
    return Assignation
}