// const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { isEmail } = require('validator');

module.exports = (sequelize, DataTypes) => {

  const HistoryLog = sequelize.define('HistoryLog', {
    account: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Accounts', // Replace with the name of the referenced table
            key: 'id'
        }
    },
    accountEmail: {
        type: DataTypes.STRING,
        allowNull: false
    },
    page: {
        type: DataTypes.STRING,
        allowNull: false
    },
    details: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    timestamps: false, // Disable Sequelize auto-managed timestamps
    tableName: 'HistoryLogs' // Explicitly define the table name if needed
});
    return HistoryLog
  }