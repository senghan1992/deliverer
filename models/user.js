const moment = require("moment");
module.exports = (sequelize, DataTypes) => {
  return sequelize.define("user", {
    // 모델 정의
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "유저 이름"
    },
    birth: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "유저 생년월일"
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "유저 핸드폰 번호 및 아이디 역할"
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "유저 성별"
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "패스워드"
    },
    bank: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "은행명"
    },
    bankNum: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "계좌번호"
    },
    profile: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "유저 프로필 사진 url"
    },
    agreementMust: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      comment: "필수항목 동의",
      defaultValue: 0
    },
    agreementChoice: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      comment: "선택항목 동의",
      defaultValue: 0
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "총 금액"
    },
    star: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "별점"
    },
    fcm_token: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "유저 fcm token"
    },
    createdAt: {
      type: DataTypes.DATE,
      //note here this is the guy that you are looking for
      get() {
        return moment(this.getDataValue("createdAt")).format("YYYY/MM/DD");
      }
    },
    updatedAt: {
      type: DataTypes.DATE,
      get() {
        return moment(this.getDataValue("updatedAt")).format("YYYY/MM/DD");
      }
    }
  });
};
