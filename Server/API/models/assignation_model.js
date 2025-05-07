module.exports = (sequelize, DataTypes) => {
    const Assignation = sequelize.define('Assignation', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
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
        Assignation.belongsTo(models.SchoolYear, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        Assignation.belongsToMany(models.ProgYrSec, { 
            through: 'AssignationSection'
        });
    };

    return Assignation;
};
