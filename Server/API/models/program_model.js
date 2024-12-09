module.exports = (sequelize, DataTypes) => {
    const Program = sequelize.define('Program', {
        Code: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: { msg: "Program code is required." }
            }
        },
        Name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Program name is required." },
            }
        }
    }, {
        timestamps: true
    });
    Program.associate = (models) => {
        Program.belongsTo(models.Department),
        Program.hasMany(models.ProgYrSec, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        })
    }
    
    return Program
}