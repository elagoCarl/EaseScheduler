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
        },
        No_Of_Students:{
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Number of students is required." }
            }
        }
    }, {
        timestamps: true
    })
    
    ProgYrSec.associate = (models) => {
        ProgYrSec.belongsTo(models.Program, { foreignKey: 'ProgramId' }); // Explicit foreignKey
        ProgYrSec.belongsToMany(models.Schedule, { 
            through: 'SectionSched', // Auto-generated bridge table
            foreignKey: 'ProgYrSecId'
        });
    };
    
    
    
    return ProgYrSec
}