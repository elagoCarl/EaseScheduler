// const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { isEmail } = require('validator');

module.exports = (sequelize, DataTypes) => {

    const AccountArchives = sequelize.define('AccountArchives', {
      Name: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
              notEmpty: { msg: "Name is required." }
          }
      },
      Email: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          validate: {
              isEmail: { msg: "Valid Email is required." },
              notEmpty: { msg: "Email is required." }
          }
      },
      isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
  }, {
      timestamps: true
  });
    return AccountArchives
  }