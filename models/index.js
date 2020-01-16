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
  config
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
db.Review = require("./review")(sequelize, Sequelize);
db.Payment = require("./payment")(sequelize, Sequelize);
db.Coupon = require("./coupon")(sequelize, Sequelize);
db.CouponUsage = require("./coupon_usage")(sequelize, Sequelize);
db.CustomerPayment = require("./customer_payment")(sequelize, Sequelize);
db.Cancel = require("./cancel")(sequelize, Sequelize);
db.Transfer = require("./transfer")(sequelize, Sequelize);

db.Order.belongsTo(db.User, { foreignKey: "requestId", constraints: false });
db.Order.hasOne(db.Deliver);
db.Order.belongsTo(db.CouponUsage, {
  foreignKey: "coupon",
  sourceKey: "id",
  constraints: false
});
db.Order.belongsTo(db.Payment, {
  foreignKey: "cardName",
  targetKey: "customer_uid",
  constraints: false
});
// db.Order.belongsTo(db.Deliver, { foreignKey: "id", targetKey: "orderId" });

db.Deliver.belongsTo(db.Order, {
  foreignKey: "orderId",
  constraints: false
});
db.Deliver.belongsTo(db.User, {
  as: "deliverUser",
  foreignKey: "delivererId",
  constraints: false
});
db.Deliver.belongsTo(db.User, {
  as: "requestUser",
  foreignKey: "requestId",
  constraints: false
  // foreignKey: "id"
});

db.Review.belongsTo(db.User, {
  as: "writerUser",
  foreignKey: "writer_id",
  constraints: false
});
db.Review.belongsTo(db.User, {
  as: "user",
  foreignKey: "user_id",
  constraints: false
});

db.User.hasMany(db.Payment, { foreignKey: "userId", sourceKey: "id" });

//쿠폰 사용 항목
db.CouponUsage.belongsTo(db.Coupon, {
  foreignKey: "coupon_code",
  sourceKey: "coupon_code"
});

// 취소항목
db.Cancel.belongsTo(db.Order, {
  foreignKey: "orderId",
  constraints: false
});
db.Cancel.belongsTo(db.User, {
  foreignKey: "userId",
  constraints: false
});

// db.Order.hasOne(db.Deliver);
// db.Order.hasOne(db.User, { sourceKey: "requestId", targetKey: "id" });

// db.Deliver.belongsTo(db.User, {
//   as: "deliverUser",
//   targetKey: "id",
//   sourceKey: "delivererId"
//   // sourceKey: "id"
// });
// db.Deliver.belongsTo(db.User, {
//   as: "requestUser",
//   targetKey: "id",
//   sourceKey: "requestId"
//   // sourceKey: "id"
// });
// db.Deliver.belongsTo(db.Order, { targetKey: "id", sourceKey: "orderId" });

// db.Review.belongsTo(db.User, {
//   as: "writerUser",
//   targetKey: "id",
//   sourceKey: "writer_id"
// });
// db.Review.belongsTo(db.User, {
//   as: "user",
//   targetKey: "id",
//   sourceKey: "user_id"
// });

// db.User.belongsTo(db.Payment, { sourceKey: "id", targetKey: "userId" });

// db.CouponUsage.belongsTo(db.Coupon, {
//   targetKey: "coupon_code",
//   sourceKey: "coupon_code"
// });

module.exports = db;
