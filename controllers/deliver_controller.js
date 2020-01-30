//db models
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
const iamporter = new Iamporter({
  apiKey: iamport_config.iamport_config.apiKey,
  secret: iamport_config.iamport_config.apiSecretKey
});

// 시간
const moment = require("moment");

// 트랜잭션
// const transaction = await db.sequelize.transaction();
// try {
// } catch (err) {
//   // Rollback transaction if any errors were encountered
//   await transaction.rollback();
// }

/////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////

// 매칭 취소
async function cancelMatch(req, res) {
  // cancel type에 따라 환불 정도가 달라진다
  let cancel_type = req.query.cancelType;

  let deliver_result = await db.Deliver.findOne({
    where: { id: req.params.id },
    include: [
      {
        model: db.Order,
        include: [{ model: db.User }]
      }
    ]
  });

  //
  // 트랜잭션
  const transaction = await db.sequelize.transaction();
  try {
    // 승인 취소
    const cancel_result = await iamporter
      .cancelByMerchantUid(deliver_result.order.merchant_uid)
      .catch(err => {
        return res.json({
          code: 600,
          data: "",
          msg: "승인취소 중 오류가 발생하였습니다"
        });
      });

    // 승인 취소가 잘 됐을 경우만
    if (
      cancel_result.status == 200 &&
      cancel_result.raw.code == 0 &&
      cancel_result.raw.response.status == "cancelled"
    ) {
      let cancel_create_result;
      if (cancel_type == "A") {
        // 10분이 경과한 후에만 패널티 여부 1로 해서 취소 추가
        cancel_create_result = await db.Cancel.create(
          {
            orderId: deliver_result.order.id,
            order_status: deliver_result.order.status,
            userId: req.user.id,
            panalty: false,
            createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
            updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
          },
          { transaction }
        );
      } else {
        cancel_create_result = await db.Cancel.create(
          {
            orderId: deliver_result.order.id,
            order_status: deliver_result.order.status,
            userId: req.user.id,
            panalty: true,
            createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
            updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
          },
          { transaction }
        );
      }

      // 승인 취소 로그 남기기
      const customer_payment_result = await db.CustomerPayment.update(
        {
          is_canceled: true,
          cancel_amount: deliver_result.order.price,
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        },
        {
          where: {
            merchant_id: deliver_result.order.merchant_uid
          }
        },
        { transaction }
      );

      // 쿠폰 사용했으면 쿠폰 사용 돌려놓기
      if (deliver_result.order.coupon != "") {
        await db.CouponUsage.update(
          {
            is_used: false,
            updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
          },
          {
            where: {
              id: deliver_result.order.coupon
            }
          },
          { transaction }
        );
      }

      // order update
      const order_update_result = await db.Order.update(
        {
          status: "A",
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        },
        {
          where: {
            id: deliver_result.order.id
          }
        },
        { transaction }
      );

      // deliver update
      const deliver_update_result = await db.Deliver.update(
        {
          status: "F",
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        },
        { where: { id: deliver_result.id } },
        { transaction }
      );

      // panalty 여부 판단
      let cancel_find_result = await db.Cancel.findAll(
        {
          attributes: [[db.sequelize.fn("count", "*"), "counts"]],
          where: {
            userId: req.user.id,
            panalty: true,
            createdAt: {
              [Op.gte]: moment()
                .subtract(7, "days")
                .toDate()
            }
          }
        },
        { transaction }
      );

      // console.log(cancel_find_result[0].dataValues.counts);

      // 패널티 대상자들
      if (cancel_find_result[0].dataValues.counts > 5) {
        await db.User.update(
          {
            prohibitTime: moment().format("YYYY-MM-DD HH:mm:ss"),
            updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
          },
          { where: { id: req.user.id } },
          { transaction }
        );
      }

      // request user push notification
      let message = {
        to: deliver_result.order.user.fcm_token,
        notification: {
          title: "운송 취소!",
          body: "운송자가 운송을 취소하였습니다."
        },
        data: {
          title: "cancel_deliver_user",
          body: "999",
          click_action: "FLUTTER_NOTIFICATION_CLICK"
        }
      };

      fcm.send(message, (err, response) => {
        if (err) console.log(err);
        else console.log("Successfully sent with response : ", response);
      });
      //
      if (
        customer_payment_result &&
        order_update_result &&
        deliver_update_result
      ) {
        // commit
        await transaction.commit();

        res.json({
          code: 200,
          data: "",
          msg: "운송을 취소하였습니다"
        });
      } else throw new Error();
    } else throw new Error();
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

// 매칭하기
async function match(req, res) {
  let orderId = parseInt(req.body.orderId);
  let delivererId = parseInt(req.body.delivererId);
  let requestId = parseInt(req.body.requestId);

  // console.log(typeof parseInt(orderId));
  // console.log(typeof(int(delivererId)));

  const order_result = await db.Order.findOne({
    where: { id: orderId }
  });

  if (order_result.status != "A") {
    // 이미 매칭된 건수입니다
    return res.json({
      code: 400,
      data: "",
      msg: "이미 매칭된 건수 입니다"
    });
  }

  const merchant_uid = `deliverer_${moment(new Date()).format(
    "YYYYMMDDHHmmss"
  )}_${orderId}`;

  // 트랜잭션
  const transaction = await db.sequelize.transaction();

  try {
    // console.log(order_result);
    const bill_result = await iamporter.paySubscription({
      customer_uid: order_result.cardId,
      merchant_uid: merchant_uid,
      amount: order_result.price
    });
    // console.log(bill_result.raw.response.merchant_uid);
    // return;
    if (
      bill_result.raw.code == 0 &&
      bill_result.status == 200 &&
      bill_result.raw.response.status == "paid"
    ) {
      const customer_payment = await db.CustomerPayment.create(
        {
          user_id: req.user.id,
          order_id: orderId,
          merchant_id: bill_result.raw.response.merchant_uid,
          amount: bill_result.raw.response.amount,
          createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        },
        { transaction }
      );

      const order_update = await db.Order.update(
        {
          status: "B",
          merchant_uid: merchant_uid,
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        },
        { where: { id: orderId } },
        { transaction }
      );

      //   console.log(data);

      const deliver = await db.Deliver.create(
        {
          delivererId: delivererId,
          requestId: requestId,
          orderId: orderId,
          status: "A",
          createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        },
        { transaction }
      );

      //   console.log(deliver);

      const requestUserResult = await db.User.findOne(
        {
          where: { id: requestId }
        },
        { transaction }
      ).catch(err => {
        console.log(err);
      });

      // 요청자 카드로 결제
      // console.log(requestUserResult.fcm_token);
      // 요청자에게 매칭 성사되었다는 알림
      let message = {
        to: requestUserResult.fcm_token,
        notification: {
          title: "매칭 성공!",
          body: "매칭이 완료되었습니다. 운송을 시작합니다"
        },
        data: {
          title: "match",
          body: orderId,
          click_action: "FLUTTER_NOTIFICATION_CLICK"
        }
      };
      fcm.send(message, (err, response) => {
        if (err) {
          console.log("Something has gone wrong!");
          console.log(err);
        } else console.log("Successfully sent with response : ", response);
      });
      ////////////////////////////////////////////////////////////////

      await transaction.commit();

      res.json({
        code: 200,
        data: "",
        msg: ""
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

// 운송 완료 내역 리스트
async function getFinishedDeliverLists(req, res) {
  const result = await db.Deliver.findAll({
    where: { delivererId: req.params.id, status: "D" },
    include: [
      { model: db.User, as: "requestUser" },
      { model: db.User, as: "deliverUser" },
      {
        model: db.Order,
        include: [
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
      }
    ]
  });

  res.json({
    code: 200,
    data: result,
    msg: "getFinishedDeliverLists"
  });
}

// 운송 내역 리스트
async function getHistoryDeliverLists(req, res) {
  console.log("/delivers : get");
  let delivererId = req.params.id;
  const data = await db.Deliver.findAll({
    include: [
      { model: db.User, as: "requestUser" },
      { model: db.User, as: "deliverUser" },
      { model: db.Order }
    ],
    where: {
      delivererId: delivererId,
      status: {
        [Op.notIn]: ["D", "F"]
      }
    },
    order: [["createdAt", "desc"]]
  });

  res.json({
    code: 200,
    data,
    msg: "getHistoryDeliverLists"
  });
}

// 운송 내역 디테일
async function getDeliverDetail(req, res) {
  console.log("/delivers/:id : get");
  let deliverId = req.params.id;
  const result = await db.Deliver.findOne({
    include: [
      { model: db.User, as: "requestUser" },
      { model: db.User, as: "deliverUser" },
      { model: db.Order }
    ],
    where: { id: deliverId }
  }).catch(err => {
    res.json({
      code: 999,
      err
    });
  });

  res.json({
    code: 200,
    data: result,
    msg: "getDeliverDetail"
  });
}

// 운송 detail put 픽업사진 배송완료 사진 등록
async function updateDeliver(req, res) {
  let kind = req.body.kind;
  let deliverId = req.params.id;
  let orderId = req.body.orderId;
  let requestUser_fcmToken = req.body.requestUserFcmToken;

  const S3 = new AWS.S3();
  if (kind == "pickup") {
    // pickup image upload, pickup time now()
    // console.log("pickup put >>> here");
    // console.log(req.files.pickUpImage);
    // 사진 업로드
    let imageUrl =
      "images/pickup/" +
      (new Date().getMonth() + 1) +
      "/" +
      new Date().getDate() +
      "/" +
      req.files.pickUpImage.name;
    let param = {
      Bucket: "deliverer.app",
      Key: imageUrl,
      ACL: "public-read",
      Body: req.files.pickUpImage.data, // 저장되는 데이터. String, Buffer, Stream 이 올 수 있다
      ContentType: "image/png" // MIME 타입
    };
    S3.upload(param, (err, data) => {
      if (err) res.json({ result: false, msg: err });
    });
    // deliver status 변경
    // 트랜잭션
    const transaction = await db.sequelize.transaction();
    try {
      const updateDeliver = await db.Deliver.update(
        {
          pickUpImage: imageUrl,
          status: "B",
          pickUpTime: moment().format("YYYY-MM-DD HH:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        },
        { where: { id: deliverId } },
        { transaction }
      );

      const updateOrder = await db.Order.update(
        {
          status: "C",
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        },
        { where: { id: orderId } },
        { transaction }
      );

      // console.log(orderId);
      let message = {
        to: requestUser_fcmToken,
        notification: {
          title: "픽업 완료!",
          body: "딜리버러가 픽업을 완료하었습니다."
        },
        data: {
          title: "pickup",
          body: orderId,
          click_action: "FLUTTER_NOTIFICATION_CLICK"
        }
      };
      fcm.send(message, (err, response) => {
        if (err) {
          console.log("Something has gone wrong!");
        } else {
          console.log("Successfully sent with response : ", response);
        }
      });

      await transaction.commit();
      res.json({
        code: 200,
        data: imageUrl,
        msg: "success deliver image update"
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
  } // end kind = pickup
  else if (kind == "deliver") {
    let imageUrl =
      "images/deliver/" +
      (new Date().getMonth() + 1) +
      "/" +
      new Date().getDate() +
      "/" +
      req.files.deliverImage.name;
    let param = {
      Bucket: "deliverer.app",
      Key: imageUrl,
      ACL: "public-read",
      Body: req.files.deliverImage.data, // 저장되는 데이터. String, Buffer, Stream 이 올 수 있다
      ContentType: "image/png" // MIME 타입
    };
    S3.upload(param, (err, data) => {
      if (err) res.json({ result: false, msg: err });
    });
    // deliver status 변경
    // 트랜잭션
    const transaction = await db.sequelize.transaction();
    try {
      const updateDeliver = await db.Deliver.update(
        {
          deliverImage: imageUrl,
          status: "C",
          deliverTime: db.sequelize.fn("NOW")
        },
        { where: { id: deliverId } },
        { transaction }
      );

      // order status update
      const updateOrder = await db.Order.update(
        {
          status: "D",
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        },
        { where: { id: orderId } },
        { transaction }
      );

      let message = {
        to: requestUser_fcmToken,
        notification: {
          title: "배송 완료!",
          body: "딜리버러가 배송을 완료하었습니다."
        },
        data: {
          title: "deliver",
          body: orderId,
          click_action: "FLUTTER_NOTIFICATION_CLICK"
        }
      };
      fcm.send(message, (err, response) => {
        if (err) {
          console.log("Something has gone wrong!");
        } else {
          console.log("Successfully sent with response : ", response);
        }
      });

      await transaction.commit();

      res.json({
        code: 200,
        data: imageUrl,
        msg: "success deliverImage upload"
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
  } // end 배송완료 사진
  // kind = finish => 운송 완료 => 종료
  else if (kind == "finish") {
    let delivererId = req.body.delivererId; // 운송원 id
    let orderPrice = req.body.orderPrice; // 운송 물품 가격

    console.log("delivers finish");

    // 트랜잭션
    const transaction = await db.sequelize.transaction();
    try {
      const result = await db.Deliver.findOne(
        {
          include: [
            { model: db.Order },
            { model: db.User, as: "requestUser" },
            { model: db.User, as: "deliverUser" }
          ],
          where: { id: deliverId }
        },
        { transaction }
      );

      console.log(result);
      // deliver status 값 => D
      const deliverResult = await db.Deliver.update(
        {
          status: "D",
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        },
        { where: { id: deliverId } },
        { transaction }
      );

      // order status 값 => E
      const orderResult = await db.Order.update(
        {
          status: "E",
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        },
        { where: { id: orderId } },
        { transaction }
      );

      // 딜리버러 수익금 올려주기
      // 수익금 계산
      let priceForDeliver =
        Math.ceil((result.order.originalPrice * 0.868) / 10) * 10;

      const userResult = await db.User.update(
        {
          price: db.sequelize.literal(`price + ${priceForDeliver}`),
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        },
        { where: { id: delivererId } },
        { transaction }
      );

      // push 알림
      // console.log(requestUser_fcmToken);
      let tmpOrderData = await db.Order.findOne(
        {
          where: { id: orderId },
          include: [
            {
              model: db.Deliver,
              include: [
                {
                  model: db.User,
                  as: "deliverUser"
                },
                {
                  model: db.User,
                  as: "requestUser"
                }
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
        },
        { transaction }
      );

      let message = {
        to: requestUser_fcmToken,
        notification: {
          title: "운송 종료!",
          body:
            "운송을 종료합니다.\n딜리버러가 마음에 드셨나요? 리뷰를 남겨주세요"
        },
        data: {
          title: "finish",
          body: tmpOrderData,
          click_action: "FLUTTER_NOTIFICATION_CLICK"
        }
      };
      fcm.send(message, (err, response) => {
        if (err) {
          console.log("Something has gone wrong!");
          console.log(err);
        } else {
          console.log("발송 성공");
        }
      });

      await transaction.commit();

      res.json({
        code: 200,
        data: "",
        msg: "success deliver finish"
      });
    } catch (err) {
      // Rollback transaction if any errors were encountered
      await transaction.rollback();
    }
  }
}

// 발송자 리뷰
async function deliverUserReview(req, res) {
  let deliverId = req.body.deliverId;
  let delivererId = req.body.delivererId;
  let requestUserId = req.body.requestUserId;
  let orderId = req.body.orderId;
  let comment = req.body.comment;
  let score = req.body.score;

  // 트랜잭션
  const transaction = await db.sequelize.transaction();
  try {
    const reviewResult = await db.Review.create(
      {
        order_id: orderId,
        writer_id: delivererId,
        user_id: requestUserId,
        comment: comment,
        score: score,
        createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
        updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
      },
      { transaction }
    );

    const userStartResult = await db.User.update(
      {
        star: db.sequelize.literal(`star + ${score}`),
        star_total: db.sequelize.literal(`star_total + 1`),
        updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
      },
      { where: { id: requestUserId } },
      { transaction }
    );

    const deliverResult = await db.Deliver.update(
      {
        orderUserReview: "T"
        // updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
      },
      { where: { id: deliverId } },
      { transaction }
    );

    await transaction.commit();
    res.json({
      code: 200,
      data: "",
      msg: "success deliver review"
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
}

module.exports.deliverUserReview = deliverUserReview;
module.exports.updateDeliver = updateDeliver;
module.exports.getDeliverDetail = getDeliverDetail;
module.exports.getHistoryDeliverLists = getHistoryDeliverLists;
module.exports.getFinishedDeliverLists = getFinishedDeliverLists;
module.exports.match = match;
module.exports.cancelMatch = cancelMatch;
