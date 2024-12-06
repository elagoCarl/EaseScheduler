module.exports = (sequelize, DataTypes) => {
    const Department = require("./dept_model")(sequelize, DataTypes)
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
    Department.hasMany(Program, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    Program.belongsTo(Department)
    return Program
}