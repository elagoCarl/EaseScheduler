// const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { isEmail } = require('validator');

module.exports = (sequelize, DataTypes) => {

    const Account = sequelize.define('Account', {
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
      Password: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
              notEmpty: { msg: "Password is required." },
              len: {
                  args: [8],
                  msg: "Minimum password length should be 8 characters."
              }
          }
      },
      isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
      verified: {
          type: DataTypes.BOOLEAN,
          defaultValue: false
      }
  }, {
      timestamps: true
  });
    return Account
  }