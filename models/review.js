const moment = require("moment");
module.exports = (sequelize, DataTypes) => {
  return sequelize.define("review", {
    // order num
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "order id"
    },
    // 쓴사람
    writer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "리뷰를 작성한 사람 id"
    },
    // 점수 받은 사람 id
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "점수를 받은 사람 id"
    },

    // comment
    comment: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "comment"
    },

    // score
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "준 점수"
    },
  });
};
