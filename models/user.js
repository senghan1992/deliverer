const moment = require("moment");
module.exports = (sequelize, DataTypes) => {
  return sequelize.define("user", {
    // 모델 정의
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "이메일"
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "유저 이름"
    },
    birth: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "유저 생년월일"
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
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
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
      comment: "별점"
    },
    star_total: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "별점 쓴 갯수"
    },
    fcm_token: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "유저 fcm token"
    },
    status: {
      type: DataTypes.ENUM("A", "D", "F", "M"),
      allowNull: false,
      comment: "유저 상태값 A : 활성 / D : 휴면 / F : 탈퇴 / M : 관리자",
      defaultValue: "A"
    },
    prohibitTime: {
      type: "TIMESTAMP",
      comment: "패널티 적용 시작 시간"
    },
    bank_tran_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "유저 은행거래 고유번호"
    }
  });
};
