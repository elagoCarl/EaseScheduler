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
    });

    Professor.associate = (models) => {
        Professor.hasMany(models.ProfAvail, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });

        Professor.belongsToMany(models.Course, {
            through: {model: 'Assignation', unique: false}
        });

        Professor.belongsToMany(models.Department, {
            through: {model: 'Assignation', unique: false}
        });

        Professor.hasMany(models.Assignation, {
            foreignKey: 'ProfessorId'
        });

        Professor.belongsTo(models.ProfStatus);
    };

    return Professor;
};
