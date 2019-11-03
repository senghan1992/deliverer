const moment = require('moment');
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('order', {
        // 모델 정의
        requestId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '요청자 id'
        },
        pickUpperAddrName: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: 'tmap api pickup upperAddrName'
        },
        pickMiddleAddrName: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: 'tmap api pickup middleAddrName'
        },
        pickLowerAddrName: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: 'tmap api pickup lowerAddrName'
        },
        pickDetailAddrName: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: '출발지 상세주소',
        },
        pickFirstNo: {
            type: DataTypes.STRING(10),
            allowNull: true,
            comment: '지번 첫번째 숫자'
        },
        pickSecondNo: {
            type: DataTypes.STRING(10),
            allowNull: true,
            comment: '지번 두번째 숫자'
        },
        pickLongitude: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'pickLongtitude'
        },
        pickLatitude: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'pickLatitude'
        },
        destUpperAddrName: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: 'tmap api destination upperAddrName'
        },
        destMiddleAddrName: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: 'tmap api destination middleAddrName'
        },
        destLowerAddrName: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: 'tmap api destination lowerAddrName'
        },
        destDetailAddrName: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: '도착지 상세주소',
        },
        destFirstNo: {
            type: DataTypes.STRING(10),
            allowNull: true,
            comment: '지번 두번쨰 숫자'
        },
        destSecondNo: {
            type: DataTypes.STRING(10),
            allowNull: true,
            comment: '지번 세번째 숫자'
        },
        destLongitude: {
          type: DataTypes.STRING(50),
          allowNull: true,
          comment: 'pickLongtitude'
        },
        destLatitude: {
          type: DataTypes.STRING(50),
          allowNull: true,
          comment: 'pickLatitude'
        },
        morning: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            comment: '픽업 가능 시간대 아침'
        },
        afterNoon: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            comment: '픽업 가능 시간대 오후'
        },
        evening: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            comment: '픽업 가능 시간대 저녁'
        },
        night: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            comment: '픽업 가능 시간대 심야'
        },
        kind: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: '물품 종류'
        },
        big: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '물품 크기'
        },
        weight: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '물품 무게'
        },
        image1: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: '물품 사진 url1'
        },
        image2: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: '물품 사진 url2'
        },
        receiverName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: '받는이 이름'
        },
        receiverPhone: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: '받는이 전화번호'
        },
        comments: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: '추가입력사항'
        },
        status: {
          type: DataTypes.ENUM('A','B','C','D','F'),
          allowNull: false,
          comment: 'status 값'
        },
        price: {
          type: DataTypes.STRING(10),
          allowNull: false,
          comment: '금액'
        },
        createdAt: {
            type: DataTypes.DATE,
//note here this is the guy that you are looking for
          get() {
                return moment(this.getDataValue('createdAt')).format('YYYY/MM/DD');
            }
        },
        updatedAt: {
            type: DataTypes.DATE,
            get() {
                return moment(this.getDataValue('updatedAt')).format('YYYY/MM/DD');
            }
          }

    });
}
