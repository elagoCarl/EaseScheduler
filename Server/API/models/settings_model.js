module.exports = (sequelize, DataTypes) => {
    const Settings = sequelize.define('Settings', {
        MaxCourseDuration: {
            type: DataTypes.INTEGER,
            allowNull: false,
            min: 1
        },
        MaxBreakDuration: {
            type: DataTypes.INTEGER,
            allowNull: false,
            min: 1
        }
    }, {
        timestamps: true

    })
    
    return Settings
}