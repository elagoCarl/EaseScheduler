module.exports = (sequelize, DataTypes) => {
    const ProfessorLoad = sequelize.define('ProfessorLoad', {
        First_Sem_Units: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                isInt: { msg: "First Semester Units must be an integer." }
            }
        },
        Second_Sem_Units: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                isInt: { msg: "Second Semester Units must be an integer." }
            }
        }
    }, {
        timestamps: true,
        validate: {
            // Custom validator to ensure business logic
            unitsAreValid() {
                if (this.First_Sem_Units < 0 || this.Second_Sem_Units < 0) {
                    throw new Error('Units cannot be negative');
                }
            }
        }
    });

    ProfessorLoad.associate = (models) => {
        ProfessorLoad.belongsTo(models.Professor, {
            foreignKey: 'ProfId',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });

        ProfessorLoad.belongsTo(models.SchoolYear, {
            foreignKey: 'SY_Id',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
    };

    return ProfessorLoad;
};