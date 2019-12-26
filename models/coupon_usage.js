module.exports = (sequelize, DataTypes) => {
  return sequelize.define("coupon_usage", {
    // coupon code
    coupon_code: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "쿠폰 코드"
    },
    // userid
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "유저 아이디"
    },
    //is_used
    is_used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "사용여부"
    }
  });
};
