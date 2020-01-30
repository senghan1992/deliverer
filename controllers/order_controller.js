//db
const db = require("../models");
const Op = db.Sequelize.Op;

// push notification
const FCM = require("fcm-node");
const fcm_config = require("../config/push_notification_config");
const serverKey = fcm_config.push_notification.serverKey;
const fcm = new FCM(serverKey);

// // AWS
const AWS = require("aws-sdk");
const config = require("../config/aws_config");
AWS.config.update({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.region
});

// 아임포트 config
const { Iamporter, IamporterError } = require("iamporter");
const iamport_config = require("../config/iamport_config");

// 시간 형태를 바꿔주는 moment
const moment = require("moment");

// 트랜잭션
// const transaction = await db.sequelize.transaction();
// try {
// } catch (err) {
//   // Rollback transaction if any errors were encountered
//   await transaction.rollback();
// }
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

// 요청 취소
async function cancelOrder(req, res) {
  let params_id = req.params.id;
  let kind = req.query.kind;

  // status 가 A 인지 확인
  if (kind == "A") {
    let input_order = await db.Order.findOne({
      where: { id: params_id }
    });
    if (input_order.status == "A") {
      // 트랜잭션
      const transaction = await db.sequelize.transaction();
      try {
        // 취소 추가
        await db.Cancel.create(
          {
            orderId: input_order.id,
            order_status: input_order.status,
            userId: req.user.id,
            createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
            updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
          },
          { transaction }
        );

        // order 상태값 바꿔주기
        await db.Order.update(
          {
            status: "F",
            updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
          },
          { where: { id: params_id } },
          { transaction }
        );

        await transaction.commit();
        res.json({
          code: 200,
          data: "",
          msg: "success cancel where status A"
        });
      } catch (err) {
        // Rollback transaction if any errors were encountered
        await transaction.rollback();
        console.log(err);
        res.json({
          code: -1,
          data: err,
          msg: "error"
        });
      }
    } else {
      res.json({
        code: 503,
        result: false
      });
    }
  } else {
    // 매칭 후 취소 하려고 하는 경우
    // console.log(cancel_result);
    let input_order = await db.Order.findOne({
      where: { id: params_id },
      include: [
        {
          model: db.Deliver,
          required: false,
          where: { status: { [Op.ne]: "F" } },
          include: [
            { model: db.User, as: "deliverUser" }
            // { model: db.User, as: "requestUser" }
          ]
        }
      ]
    });

    // 취소 승인
    const iamporter = new Iamporter({
      apiKey: iamport_config.iamport_config.apiKey,
      secret: iamport_config.iamport_config.apiSecretKey
    });

    let cancel_result;
    let cancel_price;
    if (kind == "B") {
      // 전액취소 - 10분전
      cancel_price = input_order.price;
      cancel_result = await iamporter
        .cancelByMerchantUid(`${input_order.merchant_uid}`)
        .catch(err => {
          res.json({
            code: 999,
            msg: "승인 취소중 오류가 발생하였습니다. 다시 시도해주세요",
            err
          });
        });
    } else if (kind == "C") {
      // 부분취소 - 10분후
      cancel_price = input_order.price - 3000;
      cancel_result = await iamporter
        .cancelByMerchantUid(`${input_order.merchant_uid}`, {
          amount: cancel_price,
          reason: "10분 경과 후 발송 취소"
        })
        .catch(err => {
          res.json({
            code: 999,
            msg: "승인 취소중 오류가 발생하였습니다. 다시 시도해주세요",
            err
          });
        });
    }

    // 취소 승인이 제대로 났을 경우
    if (
      cancel_result.status == 200 &&
      cancel_result.raw.code == 0 &&
      cancel_result.raw.response.status == "cancelled"
    ) {
      // 트랜잭션
      const transaction = await db.sequelize.transaction();
      try {
        // 취소 추가
        await db.Cancel.create(
          {
            orderId: input_order.id,
            order_status: input_order.status,
            userId: req.user.id,
            createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
            updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
          },
          { transaction }
        );

        // 취소 로그 남기기
        const customer_payment_result = await db.CustomerPayment.update(
          {
            is_canceled: true,
            cancel_amount: cancel_price,
            updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
          },
          { where: { merchant_id: input_order.merchant_uid } },
          { transaction }
        );

        // 쿠폰 사용했으면 쿠폰 사용 돌려놓기
        if (input_order.coupon != "") {
          await db.CouponUsage.update(
            {
              is_used: false,
              updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
            },
            { where: { id: input_order.coupon } },
            { transaction }
          );
        }

        // deliver 상태값 바꾸기
        let deliver_update_result = await db.Deliver.update(
          {
            status: "F",
            updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
          },
          { where: { id: input_order.deliver.id } },
          { transaction }
        );

        // order 상태값 바꾸기
        let order_update_result = await db.Order.update(
          {
            status: "F",
            updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
          },
          { where: { id: input_order.id } },
          { transaction }
        );

        // deliverer push 알림
        let message = {
          to: input_order.deliver.deliverUser.fcm_token,
          notification: {
            title: "운송 취소",
            body: "발송자가 운송을 취소하였습니다."
          },
          data: {
            title: "cancel_request_user",
            body: "999",
            click_action: "FLUTTER_NOTIFICATION_CLICK"
          }
        };

        fcm.send(message, (err, response) => {
          if (err) throw new Error();
          else console.log("Successfully sent with response : ", response);
        });

        if (
          order_update_result &&
          customer_payment_result &&
          deliver_update_result
        ) {
          // commit
          await transaction.commit();
          res.json({
            code: 200,
            data: "",
            msg: "order cancel success"
          });
        } else {
          throw new Error();
        }
      } catch (err) {
        // Rollback transaction if any errors were encountered
        await transaction.rollback();
        console.log(err);
        res.json({
          code: -1,
          data: err,
          msg: "error"
        });
      }
    }
  }
}

// 요청 등록
async function createOrder(req, res) {
  console.log("일단 여기는 들어온다");

  // console.log(req.body);
  let requestId = parseInt(req.body.requestId);
  let pickUpAddrName = req.body.pickUpAddrName;
  let pickDetailAddrName = req.body.pickDetailAddrName;
  let pickLongitude = req.body.pickLongitude;
  let pickLatitude = req.body.pickLatitude;
  let destinationAddrName = req.body.destinationAddrName;
  let destDetailAddrName = req.body.destDetailAddrName;
  let destLongitude = req.body.destLongitude;
  let destLatitude = req.body.destLatitude;
  let morning = req.body.morning;
  let afterNoon = req.body.afterNoon;
  let evening = req.body.evening;
  let night = req.body.night;
  let kind = req.body.kind;
  let big = req.body.big;
  let weight = req.body.weight;
  let receiverName = req.body.receiverName;
  let receiverPhone = req.body.receiverPhone;
  let comments = req.body.comments;
  let status = req.body.status;
  let price = req.body.price;
  let originalPrice = req.body.originalPrice;
  let cardId = req.body.cardId;
  let cardName = req.body.cardName;
  let coupon = req.body.coupon;
  let files = req.files["files[]"];

  // return res.json({'data': 'data'});

  // aws setting
  const S3 = new AWS.S3();
  let filePathData = [];
  if (files.length > 1) {
    files.map(item => {
      let param = {
        Bucket: "deliverer.app",
        Key:
          "images/orders/" +
          (new Date().getMonth() + 1) +
          "/" +
          new Date().getDate() +
          "/" +
          item.name,
        ACL: "public-read",
        Body: item.data, // 저장되는 데이터. String, Buffer, Stream 이 올 수 있다
        ContentType: "image/png" // MIME 타입
      };
      // s3 업로드
      S3.upload(param, (err, data) => {
        if (err)
          res.json({
            result: false,
            message: err
          });
        else {
          filePathData.push(data["Key"]);
          console.log("Key >>>>>>>>>> ");
          console.log(data["Key"]);
        }
      });
    });
  } else {
    let param = {
      Bucket: "deliverer.app",
      Key:
        "images/orders/" +
        (new Date().getMonth() + 1) +
        "/" +
        new Date().getDate() +
        "/" +
        files.name,
      ACL: "public-read",
      Body: files.data, // 저장되는 데이터. String, Buffer, Stream 이 올 수 있다
      ContentType: "image/png" // MIME 타입
    };
    // s3 업로드
    S3.upload(param, (err, data) => {
      if (err)
        res.json({
          result: false,
          message: err
        });
      else {
        filePathData.push(data["Key"]);
        console.log("Key >>>>>>>>>> ");
        console.log(data["Key"]);
      }
    });
  }
  // Order 등록
  let image1 =
    files.length > 1
      ? "images/orders/" +
        (new Date().getMonth() + 1) +
        "/" +
        new Date().getDate() +
        "/" +
        files[0].name
      : "images/orders/" +
        (new Date().getMonth() + 1) +
        "/" +
        new Date().getDate() +
        "/" +
        files.name;
  let image2 =
    files.length > 1
      ? "images/orders/" +
        (new Date().getMonth() + 1) +
        "/" +
        new Date().getDate() +
        "/" +
        files[1].name
      : "";
  let image3 =
    files.length > 1
      ? "images/orders/" +
        (new Date().getMonth() + 1) +
        "/" +
        new Date().getDate() +
        "/" +
        files[2].name
      : "";
  // console.log('도데체 어디서 걸리는거야 쉬벌');
  // console.log(originalPrice);
  const order = await db.Order.create({
    requestId: requestId,
    pickUpAddrName: pickUpAddrName,
    pickDetailAddrName: pickDetailAddrName,
    pickLongitude: pickLongitude,
    pickLatitude: pickLatitude,
    destinationAddrName: destinationAddrName,
    destDetailAddrName: destDetailAddrName,
    destLongitude: destLongitude,
    destLatitude: destLatitude,
    morning: morning,
    afterNoon: afterNoon,
    evening: evening,
    night: night,
    kind: kind,
    big: big,
    weight: weight,
    image1: image1,
    image2: image2,
    image3: image3,
    receiverName: receiverName,
    receiverPhone: receiverPhone,
    comments: comments,
    status: status,
    price: price,
    originalPrice: originalPrice,
    cardId: cardId,
    cardName: cardName,
    coupon: coupon
    //   createdAt: moment().format("YYYY-MM-DD HH:mm:ss")
    // updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
  }).catch(err => {
    res.json({
      code: -1,
      data: err,
      msg: "error"
    });
  });

  if (coupon) {
    db.CouponUsage.update(
      { is_used: 1, updatedAt: moment().format("YYYY-MM-DD HH:mm:ss") },
      { where: { id: coupon } }
    );
  }
  res.json({
    code: 200,
    data: order,
    msg: "add order success"
  });
}

// 요청 불러오기
async function getOrderLists(req, res) {
  console.log("일단 여기는 들어온다");
  // console.log(req.params.id);
  // return;

  let kind = req.query.kind;
  // console.log(req.params);

  if (kind == 0) {
    let requestId = req.user.id;

    let deliverPickLatitude = req.query.deliverPickLatitude; //req.body.deliverPickLatitude;
    let deliverPickLongitude = req.query.deliverPickLongitude; //req.body.deliverPickLongitude;

    let deliverDestLatitude = req.query.deliverDestLatitude; //req.body.deliverPickLatitude;
    let deliverDestLongitude = req.query.deliverDestLongitude; //req.body.deliverPickLongitude;

    let userLatitude = req.query.userLatitude;
    let userLongitude = req.query.userLongitude;

    let distanceLimit = 20;

    let filtering;
    let filterString = req.query.filter;
    if (filterString == "픽업거리순") {
      filtering = "pickdistance asc";
    } else {
      filtering = "price desc";
    }
    // return;

    // console.log('ㅇㅕ기는 오나?');

    const data = db.sequelize
      .query(
        `SELECT * , (6371*acos(cos(radians(${deliverPickLatitude}))*cos(radians(pickLatitude))*cos(radians(pickLongitude)-radians(${deliverPickLongitude}))+sin(radians(${deliverPickLatitude}))*sin(radians(pickLatitude)))) AS pickDistance, (6371*acos(cos(radians(${deliverDestLatitude}))*cos(radians(destLatitude))*cos(radians(destLongitude)-radians(${deliverDestLongitude}))+sin(radians(${deliverDestLatitude}))*sin(radians(destLatitude)))) AS destDistance, (6371*acos(cos(radians(${userLatitude}))*cos(radians(pickLatitude))*cos(radians(pickLongitude)-radians(${userLongitude}))+sin(radians(${userLatitude}))*sin(radians(pickLatitude)))) AS distanceFromMe, (6371*acos(cos(radians(pickLatitude))*cos(radians(destLatitude))*cos(radians(destLongitude)-radians(pickLongitude))+sin(radians(pickLatitude))*sin(radians(destLatitude)))) AS distance FROM orders WHERE status = 'A' AND requestId != ${req.user.id} HAVING pickDistance <= ${distanceLimit} AND destDistance <= ${distanceLimit} order by ${filtering}`,
        {
          replacements: ["active"],
          type: db.sequelize.QueryTypes.SELECT
        }
      )
      .catch(err => {
        console.log(err);
        res.json({
          code: -1,
          data: err,
          msg: "error"
        });
      });

    res.json({
      code: 200,
      data,
      msg: "getOrdersLists success"
    });
  } else if (kind == 1) {
    // 내 위치 기반 요청 목록 불러오기
    let userLatitude = req.query.userLatitude;
    let userLongitude = req.query.userLongitude;
    let limitRadius = 20;
    let filtering;
    let filterString = req.query.filter;
    if (filterString == "픽업거리순") {
      filtering = "distanceFromMe asc";
    } else {
      filtering = "price desc";
    }
    // console.log(`userLatitude >>> ${userLatitude}`);
    // console.log(`userLongitude >>> ${userLongitude}`);

    // query
    const data = await db.sequelize
      .query(
        `SELECT * , (6371*acos(cos(radians(${userLatitude}))*cos(radians(pickLatitude))*cos(radians(pickLongitude)-radians(${userLongitude}))+sin(radians(${userLatitude}))*sin(radians(pickLatitude)))) AS distanceFromMe, (6371*acos(cos(radians(pickLatitude))*cos(radians(destLatitude))*cos(radians(destLongitude)-radians(pickLongitude))+sin(radians(pickLatitude))*sin(radians(destLatitude)))) AS distance FROM orders WHERE status = 'A' AND requestId != ${req.user.id} HAVING distanceFromMe <= ${limitRadius} order by ${filtering}`,
        {
          replacements: ["active"],
          type: db.sequelize.QueryTypes.SELECT
        }
      )
      .catch(err => {
        console.log(err);
        res.json({
          code: -1,
          data: err,
          msg: "error"
        });
      });

    res.json({
      code: 200,
      data,
      msg: "success"
    });
  } else if (kind == 2) {
    // 내 위치 기반 1km 요청 목록 불러오기
    let userLatitude = req.query.userLatitude;
    let userLongitude = req.query.userLongitude;
    let limitRadius = 3;

    // query
    const data = await db.sequelize
      .query(
        `SELECT * , (6371*acos(cos(radians(${userLatitude}))*cos(radians(pickLatitude))*cos(radians(pickLongitude)-radians(${userLongitude}))+sin(radians(${userLatitude}))*sin(radians(pickLatitude)))) AS distanceFromMe, (6371*acos(cos(radians(pickLatitude))*cos(radians(destLatitude))*cos(radians(destLongitude)-radians(pickLongitude))+sin(radians(pickLatitude))*sin(radians(destLatitude)))) AS distance FROM orders WHERE status = 'A' AND requestId != ${req.user.id} HAVING distanceFromMe <= ${limitRadius}`,
        {
          replacements: ["active"],
          type: db.sequelize.QueryTypes.SELECT
        }
      )
      .catch(err => {
        console.log(err);
        res.json({
          code: -1,
          data: err,
          msg: "error"
        });
      });

    res.json({
      code: 200,
      data,
      msg: "success"
    });
  }
}

// 발송 완료 내역 리스트
async function getFinishedOrderLists(req, res) {
  const result = await db.Order.findAll({
    where: { requestId: req.params.id, status: "E" },
    include: [
      {
        model: db.Deliver,
        include: [
          { model: db.User, as: "deliverUser" },
          { model: db.User, as: "requestUser" }
        ]
      },
      {
        required: false,
        model: db.CouponUsage,
        include: [{ model: db.Coupon }]
      }
      // {
      //   required: false,
      //   model: db.Payment
      // }
    ]
  }).catch(err => {
    res.json({
      code: -1,
      data: err,
      msg: "error"
    });
  });

  res.json({
    code: 200,
    data: result,
    msg: "get Finished OrderLists success"
  });
}

// 발송 내역 리스트
async function getHistoryOrderLists(req, res) {
  console.log("/orders : get");
  // 로그인 되어있는 유저의 아이디 값을 받아오면 바로 적용 가능하다
  let requestId = req.params.id;
  // console.log('여기는 오나?');
  const result = await db.Order.findAll({
    where: {
      requestId: req.user.id,
      status: {
        [Op.notIn]: ["E", "F"]
      }
    },
    include: [
      {
        model: db.Deliver,
        where: {
          status: {
            [Op.ne]: "F"
          }
        },
        required: false,
        include: [
          {
            model: db.User,
            as: "deliverUser"
          }
        ]
      }
    ],
    order: [["createdAt", "desc"]]
  }).catch(err => {
    res.json({
      code: -1,
      data: err,
      msg: "error"
    });
  });

  // console.log(data);
  res.json({
    code: 200,
    data: result,
    msg: "success getHistoryOrderLists"
  });
}

// 발송 내역 detail
async function getOrderDetail(req, res) {
  console.log("/orders/:id : get");

  let orderId = req.params.id;
  // console.log(`orderId >>> ${orderId}`);

  try {
    let order = await db.Order.findOne({ where: { id: orderId } });
    let result;
    if (order.status == "A") {
      result = await db.Order.findOne({
        where: { id: orderId }
      });

      res.json({
        code: 200,
        data: result
      });
    } else {
      result = await db.Order.findOne({
        include: [
          {
            model: db.Deliver,
            where: { status: { [Op.ne]: "F" } },
            include: [{ model: db.User, as: "deliverUser" }]
          }
        ],
        where: { id: orderId, status: { [Op.ne]: "F" } }
      });

      res.json({
        code: 200,
        data: result
      });
    }
  } catch (err) {
    console.log(err);
    res.json({
      code: -1,
      data: err,
      msg: "error"
    });
  }
}

// 발송자가 운송자 평가
async function requestUserReview(req, res) {
  let deliverId = req.body.deliverId;
  let delivererId = req.body.delivererId;
  let requestUserId = req.body.requestUserId;
  let comment = req.body.comment;
  let score = req.body.score;
  let orderId = req.body.orderId;

  // 트랜잭션
  const transaction = await db.sequelize.transaction();
  try {
    // 리뷰 등록
    await db.Review.create(
      {
        order_id: orderId,
        writer_id: requestUserId,
        user_id: delivererId,
        comment: comment,
        score: score,
        createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
        updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
      },
      { transaction }
    );
    // 유저 평가 반영
    await db.User.update(
      {
        star: db.sequelize.literal(`star + ${score}`),
        star_total: db.sequelize.literal(`star_total + 1`),
        updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
      },
      { where: { id: delivererId } },
      { transaction }
    );
    // order review status 바꿔주기
    await db.Order.update(
      {
        delivererReview: "T",
        // updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
      },
      { where: { id: orderId } },
      { transaction }
    );

    await transaction.commit();
    res.json({
      code: 200,
      data: "",
      msg: "request user review success"
    });
  } catch (err) {
    // Rollback transaction if any errors were encountered
    if (transaction) await transaction.rollback();
    res.json({
      code: -1,
      data: err,
      msg: "error"
    });
  }
}

module.exports.requestUserReview = requestUserReview;
module.exports.getOrderDetail = getOrderDetail;
module.exports.getHistoryOrderLists = getHistoryOrderLists;
module.exports.getFinishedOrderLists = getFinishedOrderLists;
module.exports.getOrderLists = getOrderLists;
module.exports.createOrder = createOrder;
module.exports.cancelOrder = cancelOrder;
