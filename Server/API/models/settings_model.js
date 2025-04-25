module.exports = (sequelize, DataTypes) => {
  const Settings = sequelize.define(
    "Settings",
    {
      StartHour: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 7,
        validate: {
          min: 0,
          max: 23.75, // Allow up to 23:45
        },
      },
      EndHour: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 21,
        validate: {
          min: 0.25, // At least 0:15
          max: 24,    // Up to midnight
        },
      },
      ProfessorMaxHours: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 12,
      },
      StudentMaxHours: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 12,
      },
      ProfessorBreak: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 1,
      },
      MaxAllowedGap: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 5,
      },
      nextScheduleBreak: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.5,
      },
    },
    {
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['DepartmentId']
        }
      ]
    }
  );

  // Modified hook to prevent multiple records per department
  Settings.beforeCreate(async (settings, options) => {
    const count = await Settings.count({
      where: { DepartmentId: settings.DepartmentId }
    });
    if (count > 0) {
      throw new Error("Only one settings record is allowed per department.");
    }
  });

  Settings.associate = (models) => {
    Settings.belongsTo(models.Department, {
      foreignKey: 'DepartmentId',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  // Auto-create a settings record for each department if none exists
  Settings.afterSync(async () => {
    try {
      const { Department } = sequelize.models;

      // Get all departments
      const departments = await Department.findAll();

      // For each department, check if settings exist, create if not
      for (const department of departments) {
        const settingsExist = await Settings.findOne({
          where: { DepartmentId: department.id }
        });

        if (!settingsExist) {
          await Settings.create({
            DepartmentId: department.id,
            StartHour: 7,
            EndHour: 19,
            ProfessorMaxHours: 12,
            StudentMaxHours: 12,
            ProfessorBreak: 1,
            MaxAllowedGap: 5,
            nextScheduleBreak: 0.5
          });
          console.log(`Created default settings for department: ${department.Name}`);
        }
      }
    } catch (error) {
      console.error("Error creating default settings:", error);
    }
  });

  return Settings;
};