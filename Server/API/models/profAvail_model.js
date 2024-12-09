module.exports = (sequelize, DataTypes) => {
    const ProfAvail = sequelize.define('ProfAvail', {
        Day: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Day is required." }
            }
        }
    }, {
        timestamps: true
    });
    ProfAvail.associate = (models) => {
        ProfAvail.hasMany(models.ProfAvailSched, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        }),
        ProfAvail.belongsTo(models.Professor)
    }
    return ProfAvail
}

