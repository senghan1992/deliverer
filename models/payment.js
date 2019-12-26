module.exports = (sequelize, DataTypes) => {
    return sequelize.define('payment', {
        // 모델정의
        userId : {
            type : DataTypes.INTEGER,
            allowNull: false,
            comment: '빌링키 유저 id'
        },
        customer_uid: {
            type: DataTypes.STRING,
            allowNull : false,
            unique : true,
            comment: '빌링키 고유값'
        },
        card_name: {
            type: DataTypes.STRING,
            allowNull : true,
            comment: '카드 이름'
        },
        card_number: {
            type : DataTypes.STRING,
            allowNull: false,
            comment: '카드 번호'
        }
    });
}