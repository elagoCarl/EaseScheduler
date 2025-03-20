module.exports = (sequelize, DataTypes) => {
    const ProgYrSec = sequelize.define('ProgYrSec', {
        Year: {
            type: DataTypes.INTEGER,
            allowNull: false,
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
        ProgYrSec.belongsTo(models.Program, { foreignKey: 'ProgramId' });
        ProgYrSec.belongsToMany(models.Schedule, { 
            through: 'SectionSched', 
            foreignKey: 'ProgYrSecId'
        });
    };
    
    
    
    return ProgYrSec
}