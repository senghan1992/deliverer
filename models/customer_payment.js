const moment = require("moment");
module.exports = (sequelize, DataTypes) => {
  return sequelize.define("customer_payment", {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "요청자 id"
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "요청 id"
    },
    merchant_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "결제 고유번호"
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "결제 금액"
    },
    is_canceled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      comment: "취소 여부",
      defaultValue: false
    },
    cancel_amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "취소된 금액",
      defaultValue: 0
    },
  });
};
