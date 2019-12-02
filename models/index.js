"use strict";

// const fs = require('fs');
// const path = require('path');
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const env = process.env.NODE_ENV || "test";
const config = require("../config/config.json")[env];
const db = {};

let sequelize;
// if (config.use_env_variable) {
//   sequelize = new Sequelize(process.env[config.use_env_variable], config);
// } else {
//   sequelize = new Sequelize(config.database, config.username, config.password, config);
// }
sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config,
  {
    host: config.host,
    dialect: "mysql",
    logging: false,
    operatorsAliases: Op
  }
);

// fs
//   .readdirSync(__dirname)
//   .filter(file => {
//     return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
//   })
//   .forEach(file => {
//     const model = sequelize['import'](path.join(__dirname, file));
//     db[model.name] = model;
//   });

// Object.keys(db).forEach(modelName => {
//   if (db[modelName].associate) {
//     db[modelName].associate(db);
//   }
// });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.Order = require("./order")(sequelize, Sequelize);
db.Deliver = require("./deliver")(sequelize, Sequelize);
db.User = require("./user")(sequelize, Sequelize);

db.Order.hasOne(db.Deliver);
db.Order.hasOne(db.User, {foreignKey : "id", sourceKey : "requestId"});
db.Deliver.belongsTo(db.Order, { foreignKey: "orderId" });

module.exports = db;
