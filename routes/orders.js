const express = require("express");
const router = express.Router();

// db
const { Order, Deliver } = require("../models");
const db = require("../models");
const Op = db.Sequelize.Op;

// push notification
const FCM = require("fcm-node");
const serverKey =
  "AAAAqL5WuSU:APA91bHVxSh-YzD2Y65dfimv39rf751Ldzgcxoo4bls68ELLD-oa9EKWDuMCsMiAsOMgidPrc4AtaVm-AOakpRrOCSSXdvGkxMwjBb6uob8HM0-DXMmyBa6X1YqpooWFA7HIVrjm3_XO";
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

// 로그인 체크
const check = require("../middleware/login_check");

// 시간 형태를 바꿔주는 moment
const moment = require("moment");

// 발송자 운송자 평가
router.post("/review", (req, res) => {
  let deliverId = req.body.deliverId;
  let delivererId = req.body.delivererId;
  let requestUserId = req.body.requestUserId;
  let comment = req.body.comment;
  let score = req.body.score;
  let orderId = req.body.orderId;

  db.Review.create({
    order_id: orderId,
    writer_id: requestUserId,
    user_id: delivererId,
    comment: comment,
    score: score,
    createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
    updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
  })
    .then(reviewResult => {
      // console.log(reviewResult);
      if (reviewResult) {
        db.User.update(
          {
            star: db.sequelize.literal(`star + ${score}`),
            star_total: db.sequelize.literal(`star_total + 1`)
            // updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
          },
          { where: { id: delivererId } }
        )
          .then(userStarResult => {
            // console.log(userStarResult);
            if (userStarResult) {
              db.Order.update(
                {
                  delivererReview: "T"
                  // updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
                },
                { where: { id: orderId } }
              )
                .then(orderResult => {
                  if (orderResult) {
                    res.json({
                      code: 200
                    });
                  } else {
                    res.json({
                      code: 999
                    });
                  }
                })
                .catch(err => {
                  res.json({
                    code: 999,
                    err
                  });
                });
            } else {
              res.json({
                code: 999
              });
            }
          })
          .catch(err => {
            res.json({
              code: 999,
              err
            });
          });
      } else {
        res.json({
          code: 999
        });
      }
      // if(reviewResult.id)
    })
    .catch(err => {
      res.json({
        code: 999,
        err
      });
    });
});

// 발송내역 detail
router.get("/:id", async (req, res) => {
  console.log("/orders/:id : get");

  let orderId = req.params.id;
  console.log(`orderId >>> ${orderId}`);

  var order = await db.Order.findOne({ where: { id: orderId } });

  if (order.status == "A") {
    db.Order.findOne({
      where: { id: orderId }
    }).then(result => {
      res.json({
        code: 200,
        result
      });
    });
  } else {
    db.Order.findOne({
      include: [
        {
          model: db.Deliver,
          where: { status: { [Op.ne]: "F" } },
          include: [{ model: db.User, as: "deliverUser" }]
        }
      ],
      where: { id: orderId, status: { [Op.ne]: "F" } }
    }).then(result => {
      // console.log(result);
      res.json({
        code: 200,
        result
      });
    });
  }
});

// 발송 내역 리스트
router.get("/history/:id", check.loginCheck, (req, res) => {
  console.log("/orders : get");
  // 로그인 되어있는 유저의 아이디 값을 받아오면 바로 적용 가능하다
  let requestId = req.params.id;
  // console.log('여기는 오나?');
  Order.findAll({
    where: {
      requestId: req.user.id,
      status: {
        [Op.notIn]: ["E", "F"]
      }
    },
    include: [
      {
        model: db.Deliver,
        where: { status: { [Op.ne]: "F" } },
        required: false,
        include: [{ model: db.User, as: "deliverUser" }]
      }
    ],
    order: [["createdAt", "desc"]]
  })
    .then(data => {
      // console.log(data);
      res.json({
        code: 200,
        result: true,
        data
      });
    })
    .catch(err => {
      res.json({
        code: 999,
        err
      });
    });
});

// 발송 완료 내역 리스트
router.get("/history/finish/:id", (req, res) => {
  db.Order.findAll({
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
      },
      // {
      //   required: false,
      //   model: db.Payment
      // }
    ]
  }).then(result => {
    res.json({
      code: 200,
      result
    });
  });
});

// 요청 불러오기
router.get("/", check.loginCheck, (req, res) => {
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
      filtering = "pickdistance desc";
    } else {
      filtering = "price desc";
    }
    // return;

    // console.log('ㅇㅕ기는 오나?');

    db.sequelize
      .query(
        `SELECT * , (6371*acos(cos(radians(${deliverPickLatitude}))*cos(radians(pickLatitude))*cos(radians(pickLongitude)-radians(${deliverPickLongitude}))+sin(radians(${deliverPickLatitude}))*sin(radians(pickLatitude)))) AS pickDistance, (6371*acos(cos(radians(${deliverDestLatitude}))*cos(radians(destLatitude))*cos(radians(destLongitude)-radians(${deliverDestLongitude}))+sin(radians(${deliverDestLatitude}))*sin(radians(destLatitude)))) AS destDistance, (6371*acos(cos(radians(${userLatitude}))*cos(radians(pickLatitude))*cos(radians(pickLongitude)-radians(${userLongitude}))+sin(radians(${userLatitude}))*sin(radians(pickLatitude)))) AS distanceFromMe, (6371*acos(cos(radians(pickLatitude))*cos(radians(destLatitude))*cos(radians(destLongitude)-radians(pickLongitude))+sin(radians(pickLatitude))*sin(radians(destLatitude)))) AS distance FROM orders WHERE status = 'A' AND requestId != ${req.user.id} HAVING pickDistance <= ${distanceLimit} AND destDistance <= ${distanceLimit} order by ${filtering}`,
        {
          replacements: ["active"],
          type: db.sequelize.QueryTypes.SELECT
        }
      )
      .then(data => {
        // console.log(data);
        res.json({
          code: 200,
          result: true,
          data
        });
      })
      .catch(error => {
        console.log(error);
        res.json({
          code: 999,
          error
        });
      });
  } else {
    // 내 위치 기반 요청 목록 불러오기
    let userLatitude = req.query.userLatitude;
    let userLongitude = req.query.userLongitude;
    let limitRadius = 20;
    let filtering;
    let filterString = req.query.filter;
    if (filterString == "픽업거리순") {
      filtering = "distanceFromMe desc";
    } else {
      filtering = "price desc";
    }
    console.log(`userLatitude >>> ${userLatitude}`);
    console.log(`userLongitude >>> ${userLongitude}`);

    // query
    db.sequelize
      .query(
        `SELECT * , (6371*acos(cos(radians(${userLatitude}))*cos(radians(pickLatitude))*cos(radians(pickLongitude)-radians(${userLongitude}))+sin(radians(${userLatitude}))*sin(radians(pickLatitude)))) AS distanceFromMe, (6371*acos(cos(radians(pickLatitude))*cos(radians(destLatitude))*cos(radians(destLongitude)-radians(pickLongitude))+sin(radians(pickLatitude))*sin(radians(destLatitude)))) AS distance FROM orders WHERE status = 'A' AND requestId != ${req.user.id} HAVING distanceFromMe <= ${limitRadius} order by ${filtering}`,
        {
          replacements: ["active"],
          type: db.sequelize.QueryTypes.SELECT
        }
      )
      .then(data => {
        console.log(data);
        res.json({
          code: 200,
          result: true,
          data
        });
      })
      .catch(error => {
        console.log(error);
        res.json({
          code: 999,
          error
        });
      });
  }
});

// 요청 등록
router.post("/", (req, res) => {
  console.log("일단 여기는 들어온다");

  console.log(req.body);
  // return res.json({'data': 'data'});

  // console.log(req.files.file2);
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
  // console.log('도데체 어디서 걸리는거야 쉬벌');
  console.log(originalPrice);
  Order.create({
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
    receiverName: receiverName,
    receiverPhone: receiverPhone,
    comments: comments,
    status: status,
    price: price,
    originalPrice: originalPrice,
    cardId: cardId,
    cardName: cardName,
    coupon: coupon,
    createdAt: moment().format("YYYY-MM-DD HH:mm:ss")
    // updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
  }).then(data => {
    // coupon usage 바꿔주기
    if (data) {
      db.CouponUsage.update(
        { is_used: 1, updatedAt: moment().format("YYYY-MM-DD HH:mm:ss") },
        { where: { id: coupon } }
      ).then(coupon_result => {
        // console.log(data);
        if (coupon_result) {
          res.json({
            code: 200,
            result: true,
            data
          });
        } else {
          // 예외 처리
        }
      });
    } else {
      // 예외 처리
    }
  });
});

// 요청 취소
router.delete("/:id", check.loginCheck, async (req, res) => {
  let params_id = req.params.id;
  let kind = req.query.kind;

  // console.log(req.params.id);
  // return;
  // status 가 A 인지 확인
  if (kind == "A") {
    let input_order = await Order.findOne({ where: { id: params_id } });
    if (input_order.status == "A") {
      // 취소 추가
      let cancel_create_result = await db.Cancel.create({
        orderId: input_order.id,
        order_status: input_order.status,
        userId: req.user.id,
        createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
        updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
      }).catch(err => {
        res.json({
          code: -1,
          result: false
        });
      });

      // order 상태값 바꿔주기
      let data = await db.Order.update(
        { status: "F", updatedAt: moment().format("YYYY-MM-DD HH:mm:ss") },
        { where: { id: params_id } }
      ).catch(err => {
        console.log(err);
        res.json({
          code: -1,
          result: false
        });
      });

      // panalty 여부 판단
      // let cancel_find_result = await db.Cancel.findAll({
      //   attributes: [[db.sequelize.fn("count", "*"), "counts"]],
      //   where: {
      //     userId: req.user.id,
      //     createdAt: {
      //       [Op.gte]: moment()
      //         .subtract(7, "days")
      //         .toDate()
      //     }
      //   }
      // }).catch(err => {
      //   console.log(err);
      //   res.json({
      //     code: -1,
      //     result: false
      //   });
      // });

      // console.log(cancel_find_result[0].dataValues.counts);

      // 패널티 대상자들
      // if (cancel_find_result[0].dataValues.counts > 5) {
      //   await db.User.update(
      //     {
      //       prohibitTime: moment().format("YYYY-MM-DD HH:mm:ss"),
      //       updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
      //     },
      //     { where: { id: req.user.id } }
      //   );
      // }

      res.json({
        code: 200
      });
    } else {
      res.json({
        code: 503,
        result: false
      });
    }
  } else {
    // console.log(cancel_result);
    let input_order = await Order.findOne({
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
      // 취소 추가
      let cancel_create_result = await db.Cancel.create({
        orderId: input_order.id,
        order_status: input_order.status,
        userId: req.user.id,
        createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
        updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
      }).catch(err => {
        res.json({
          code: -1,
          result: false
        });
      });
      // 취소 로그 남기기
      let customer_payment_result = await db.CustomerPayment.update(
        {
          is_canceled: true,
          cancel_amount: cancel_price,
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        },
        { where: { merchant_id: input_order.merchant_uid } }
      );

      // 쿠폰 사용했으면 쿠폰 사용 돌려놓기
      if (input_order.coupon != "") {
        await db.CouponUsage.update(
          {
            is_used: false,
            updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
          },
          { where: { id: input_order.coupon } }
        );
      }

      // deliver 상태값 바꾸기
      let deliver_update_result = await db.Deliver.update(
        {
          status: "F",
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        },
        { where: { id: input_order.deliver.id } }
      );

      // order 상태값 바꾸기
      let order_update_result = await db.Order.update(
        {
          status: "F",
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        },
        { where: { id: input_order.id } }
      );

      // panalty 여부 판단
      // let cancel_find_result = await db.Cancel.findAll({
      //   attributes: [[db.sequelize.fn("count", "*"), "counts"]],
      //   where: {
      //     userId: req.user.id,
      //     createdAt: {
      //       [Op.gte]: moment()
      //         .subtract(7, "days")
      //         .toDate()
      //     }
      //   }
      // }).catch(err => {
      //   console.log(err);
      //   res.json({
      //     code: -1,
      //     result: false
      //   });
      // });

      // console.log(cancel_find_result[0].dataValues.counts);

      // 패널티 대상자들
      // if (cancel_find_result[0].dataValues.counts > 5) {
      //   await db.User.update(
      //     {
      //       prohibitTime: moment().format("YYYY-MM-DD HH:mm:ss"),
      //       updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
      //     },
      //     { where: { id: req.user.id } }
      //   );
      // }

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
        if (err) {
          if (err) {
            console.log(err);
            res.json({
              code: -1,
              err
            });
          }
        } else console.log("Successfully sent with response : ", response);
      });

      if (
        order_update_result &&
        customer_payment_result &&
        deliver_update_result
      ) {
        res.json({
          code: 200
        });
      } else {
        res.json({
          code: 999,
          msg: "업데이트중 오류가 발생하였습니다 다시 시도해주세요"
        });
      }
    } else {
      // 승인 취소 오류시
      res.json({
        code: 999,
        msg: "승인 취소중 오류가 발생하였습니다 다시 시도해주세요"
      });
    }
    // 매칭 된 후 10분 이하일 때 취소가 가능 하다
  }
});

module.exports = router;
