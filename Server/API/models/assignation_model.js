module.exports = (sequelize, DataTypes) => {
    const Assignation = sequelize.define('Assignation', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        School_Year: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "2025-2026"  // Set a default value as needed
        },
        Semester: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "Fall"  // Set a default value as needed
        },
        ProfessorId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Professors',
                key: 'id'
            },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        }

    }, {
        timestamps: true,
        indexes: [
            {
                name: 'assignation_unique_idx',
                unique: true,
                fields: ['School_Year', 'Semester', 'CourseId', 'ProfessorId', 'DepartmentId']
            },
            {
                name: 'Assignations_DepartmentId_ProfessorId_index',
                unique: false,
                fields: ['ProfessorId']
            },
            {
                name: 'Assignations_DepartmentId_CourseId_index',
                unique: false,
                fields: ['CourseId', 'DepartmentId']
            },
        ]
    });

    Assignation.associate = (models) => {
        Assignation.belongsTo(models.RoomType, {
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE'
        });

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
        });
    };

    return Assignation;
};
