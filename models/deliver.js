const moment = require('moment');
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('deliver', {
      // 모델 정의
      delivererId : {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '매칭 된 운송자 id'
      },
      orderId : {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '매칭 된 요청 id'
      },
      pickUpImage : {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '픽업 사진 url'
      },
      pickUpTime : {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '픽업 시간'
      },
      deliverImage : {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment : '운송 사진 url'
      },
      deliverTime : {
        type : DataTypes.DATE,
        allowNull : true,
        comment: '운송 시간'
      },
      delivererReview : {
        type: DataTypes.BOOLEAN,
        allowNull:true,
        defaultValue : false,
      }
  });
}
