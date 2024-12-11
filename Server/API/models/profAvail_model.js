module.exports = (sequelize, DataTypes) => {
    const ProfAvail = sequelize.define('ProfAvail', {
        Day: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Day is required." }
            }
        },
        Start_time: {
            type: DataTypes.TIME,
            allowNull: false
        },
        End_time: {
            type: DataTypes.TIME,
            allowNull: false
        }
    }, {
        timestamps: true
    });
    ProfAvail.associate = (models) => {
        ProfAvail.belongsTo(models.Professor)
    }
    return ProfAvail
}

