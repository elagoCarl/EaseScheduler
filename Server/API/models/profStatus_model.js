module.exports = (sequelize, DataTypes) => {
    const ProfStatus = sequelize.define('ProfStatus', {
        Status: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Status is required." }
            }
        },
        Max_units: {
            type: DataTypes.INTEGER,
            allowNull: false,
            min: 0,
            defaultValue: 0
        }
    }, {
        timestamps: true
    });
    ProfStatus.associate = (models) => {
        ProfStatus.hasMany(models.Professor, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        })
    }
    return ProfStatus
}
