// const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { isEmail } = require('validator');

module.exports = (sequelize, DataTypes) => {

  const Availability = sequelize.define('Availability', {
    schedule_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'schedules', // Reference the `schedules` table
            key: 'id'
        }
    },
    room_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    day: {
        type: DataTypes.STRING,
        allowNull: false
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    end_time: {
        type: DataTypes.TIME,
        allowNull: false
    }
}, {
    tableName: 'availability', // Explicit table name
    timestamps: true // Disable Sequelize-managed timestamps
});
    return Availability
  }