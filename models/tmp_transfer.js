module.exports = (sequelize, DataTypes) => {
  return sequelize.define("tmp_transfer", {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "신청자 userId"
    },
    bank: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "신청자 은행"
    },
    bankNum: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "신청자 계좌번호"
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "신청 금액"
    },
    finished: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0,
      comment: "완료 여부"
    }
  });
};
