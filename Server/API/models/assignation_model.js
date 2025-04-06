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
            allowNull: false
        },  
        Semester: {
            type: DataTypes.STRING,
            allowNull: false
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
            }
        ]
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

        Assignation.belongsToMany(models.Room, { through: 'Schedule' });
        Assignation.hasMany(models.Schedule, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
    };

    return Assignation;
};
