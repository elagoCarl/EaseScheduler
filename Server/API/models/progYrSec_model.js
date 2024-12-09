module.exports = (sequelize, DataTypes) => {
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
    })
    ProgYrSec.associate = (models) => {
        ProgYrSec.belongsTo(models.Program)
        ProgYrSec.belongsToMany(models.Schedule, { through: 'SectionSched' })
    }
    
    
    
    return ProgYrSec
}