const moment = require("moment");
module.exports = (sequelize, DataTypes) => {
  return sequelize.define("cancel", {
    // 취소한 요청 건 id
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "취소한 요청 건 id"
    },
    // 취소당시 요청의 상태값
    order_status: {
      type: DataTypes.ENUM("A", "B", "C", "D", "E", "F"),
      allowNull: false,
      comment: "취소 요청 당시 발송의 상태값"
    },
    // 취소자 id
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "취소한 유저 id"
    },
    // 패널티 여부
    panalty: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0,
      comment: "패널티 적용 캔슬 건 판단"
    }
  });
};
