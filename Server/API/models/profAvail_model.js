module.exports = (sequelize, DataTypes) => {
    const ProfAvailSched = require("./profAvailSched_model")(sequelize, DataTypes);
    const ProfAvail = sequelize.define('ProfessorAvail', {
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

    ProfAvail.hasMany(ProfAvailSched, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      })
    ProfAvailSched.belongsTo(ProfAvail)

    return ProfAvail
}

