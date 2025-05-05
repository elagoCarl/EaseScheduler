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
      timestamps: true
    }
  );

  // Modified hook to ensure only one settings record exists globally
  Settings.beforeCreate(async (settings, options) => {
    const count = await Settings.count();
    if (count > 0) {
      throw new Error("Only one global settings record is allowed.");
    }
  });

  // Remove association with Department
  Settings.associate = (models) => {
    // No associations needed for global settings
  };

  // Auto-create a single global settings record if none exists
  Settings.afterSync(async () => {
    try {
      // Check if any settings exist
      const settingsExist = await Settings.findOne();

      if (!settingsExist) {
        await Settings.create({
          StartHour: 7,
          EndHour: 19,
          ProfessorMaxHours: 12,
          StudentMaxHours: 12,
          ProfessorBreak: 1,
          MaxAllowedGap: 5,
          nextScheduleBreak: 0.5
        });
        console.log("Created default global settings");
      }
    } catch (error) {
      console.error("Error creating default settings:", error);
    }
  });

  return Settings;
};