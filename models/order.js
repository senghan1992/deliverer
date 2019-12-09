const moment = require('moment');
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('order', {
        // 모델 정의
        requestId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '요청자 id'
        },
        pickUpAddrName: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'kakao api pickup upperAddrName'
        },
        pickDetailAddrName: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: '출발지 상세주소',
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
        destinationAddrName: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'kakao api destination upperAddrName'
        },
        destDetailAddrName: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: '도착지 상세주소',
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
            type: DataTypes.STRING(10),
            allowNull: false,
            comment: '픽업 가능 시간대 아침'
        },
        afterNoon: {
            type: DataTypes.STRING(10),
            allowNull: false,
            comment: '픽업 가능 시간대 오후'
        },
        evening: {
            type: DataTypes.STRING(10),
            allowNull: false,
            comment: '픽업 가능 시간대 저녁'
        },
        night: {
            type: DataTypes.STRING(10),
            allowNull: false,
            comment: '픽업 가능 시간대 심야'
        },
        kind: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: '물품 종류'
        },
        big: {
            type: DataTypes.STRING(10),
            allowNull: false,
            comment: '물품 크기'
        },
        weight: {
            type: DataTypes.STRING(10),
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
            type: DataTypes.ENUM('A', 'B', 'C', 'D', 'E', 'F'),
            allowNull: false,
            comment: 'status 값'
        },
        price: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '금액'
        },
        cardName: {
            type: DataTypes.STRING(10),
            allowNull: true,
            comment: '사용자 카드 이름'
        },
        coupon: {
            type: DataTypes.STRING(10),
            allowNull: true,
            comment: '쿠폰 번호'
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