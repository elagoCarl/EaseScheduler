module.exports = (sequelize, DataTypes) => {
    const Schedule = require("./schedule_model")(sequelize, DataTypes)
    const Program = require("./program_model")(sequelize, DataTypes)
    const ProgYrSec = sequelize.define('ProgYrSec', {
        Year: {
            type: DataTypes.INTEGER,
            allowNull: false,
            max: 4,
            min: 1
        },
        Section: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Section is required." }
            }
        }
    }, {
        timestamps: true
    });

    Program.hasMany(ProgYrSec, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    ProgYrSec.belongsTo(Program)
    ProgYrSec.belongsToMany(Schedule, { through: 'SectionSched' })
    Schedule.belongsToMany(ProgYrSec, { through: 'SectionSched' })
    return ProgYrSec
}