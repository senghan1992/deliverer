const moment = require("moment");
module.exports = (sequelize, DataTypes) => {
  return sequelize.define("coupon", {
    // 쿠폰 코드
    coupon_code: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "쿠폰 코드",
      primaryKey: true
    },
    // 쿠폰 이름
    coupon_name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "쿠폰 이름"
    },
    // 쿠폰 기한
    end_date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "쿠폰 기한"
    },
    // 쿠폰 사용 등록 여부
    is_usable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "쿠폰 등록 가능 여부"
    },
    // 역할
    role: {
      type: DataTypes.ENUM("P", "M"),
      allowNull: false,
      comment: "%할인 : P / -할인 : M"
    },
    // 할인 정도
    role_num: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "할인 정도"
    },
  });
};
