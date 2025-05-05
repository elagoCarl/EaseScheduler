module.exports = (sequelize, DataTypes) => {
    const Assignation = sequelize.define('Assignation', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        School_year: {
            type: DataTypes.STRING(9), // Adjusted to 9 characters because "2024-2025" is 9 chars
            allowNull: false,
            validate: {
                is: /^[0-9]{4}-[0-9]{4}$/
            }
        }

    }, {
        timestamps: true,
    });

    Assignation.associate = (models) => {
        Assignation.belongsTo(models.Professor, {
            foreignKey: {
                name: 'ProfessorId',
                allowNull: true,
            },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
        });

        Assignation.belongsTo(models.Course, {
            foreignKey: {
                allowNull: false
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });

        Assignation.belongsTo(models.Department, {
            foreignKey: {
                name: 'DepartmentId',
                allowNull: true,
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });

        Assignation.belongsToMany(models.Room, { through: { model: 'Schedule', unique: false } });
        Assignation.hasMany(models.Schedule, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        })
        Assignation.belongsToMany(models.ProgYrSec, { 
            through: 'AssignationSection'
        });
    };

    return Assignation;
};
