module.exports = (sequelize, DataTypes) => {
    const Professor = sequelize.define('Professor', {
        Name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Name is required." }
            }
        },
        Email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: { msg: "Valid Email is required." },
                notEmpty: { msg: "Email is required." }
            }
        },
        Total_units: {
            type: DataTypes.INTEGER,
            allowNull: false,
            min: 0,
            defaultValue: 0
        },
        ProfStatusId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Status is required." }
            }
        }
    }, {
        timestamps: true
    })
    Professor.associate = (models) => {
        Professor.hasMany(models.ProfAvail, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        // Change this relationship definition
        Professor.belongsToMany(models.Course, {
            through: models.Assignation,  // Use the model reference
            foreignKey: 'ProfessorId',
            uniqueKey: false
        });
        Professor.belongsToMany(models.Department, {
            through: models.Assignation,  // Use the model reference
            foreignKey: 'ProfessorId',
            uniqueKey: false
        });
        Professor.hasMany(models.Assignation, {
            foreignKey: 'ProfessorId'
        });
        Professor.belongsTo(models.ProfStatus);
    }
    return Professor
}