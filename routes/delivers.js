var express = require("express");
var router = express.Router();

//db models
const db = require("../models");
const Op = db.Sequelize.Op;

// push notification
const FCM = require("fcm-node");
const serverKey =
  "AAAAtfZmb8Y:APA91bGlfzcggXhLh7JJ-7VVLKNntdHuu70hMZjHZiANDtCorJmu7UzbcRToXshS1wYzRXuouToEhqwOsNazV7zsr5Rl5nTfWuvDLhITyTcjH1_eSDXRkbe8KTFSkLjcFWpQaXl_N6rd";
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

// 로그인 체크
const check = require("../middleware/login_check");

// 시간
const moment = require("moment");

/* GET home page. */

// 발송자 리뷰
router.post("/review", (req, res) => {
  let deliverId = req.body.deliverId;
  let delivererId = req.body.delivererId;
  let requestUserId = req.body.requestUserId;
  let orderId = req.body.orderId;
  let comment = req.body.comment;
  let score = req.body.score;

  // comment 등록 / User Score 및 리뷰 총 갯수 up / Delivers db review tab -> T
  db.Review.create({
    order_id: orderId,
    writer_id: delivererId,
    user_id: requestUserId,
    comment: comment,
    score: score
  })
    .then(reviewResult => {
      // console.log(reviewResult);
      if (reviewResult) {
        db.User.update(
          {
            star: db.sequelize.literal(`star + ${score}`),
            star_total: db.sequelize.literal(`star_total + 1`)
          },
          { where: { id: requestUserId } }
        )
          .then(userStarResult => {
            // console.log(userStarResult);
            if (userStarResult) {
              db.Deliver.update(
                { orderUserReview: "T" },
                { where: { id: deliverId } }
              )
                .then(deliverResult => {
                  if (deliverResult) {
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

// 운송 detail put 픽업사진 배송완료 사진 등록
router.put("/:id", async (req, res) => {
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
    db.Deliver.update(
      {
        pickUpImage: imageUrl,
        status: "B",
        pickUpTime: db.sequelize.fn("NOW")
      },
      { where: { id: deliverId } }
    )
      .then(updateDeliver => {
        // order status update
        db.Order.update(
          { status: "C", updatedAt: db.sequelize.fn("NOW") },
          { where: { id: orderId } }
        )
          .then(updateOrder => {
            console.log(orderId);
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
                res.json({
                  code: -1,
                  err
                });
              } else {
                console.log("Successfully sent with response : ", response);
                res.json({
                  code: 200,
                  imageUrl
                });
              }
            });
          })
          .catch(err => {
            res.json({
              code: -1,
              err
            });
          });
      })
      .catch(err => {
        res.json({
          code: -1,
          err
        });
      });
  } // end kind = pickup
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
    await S3.upload(param, (err, data) => {
      if (err) res.json({ result: false, msg: err });
    });
    // deliver status 변경
    db.Deliver.update(
      {
        deliverImage: imageUrl,
        status: "C",
        deliverTime: db.sequelize.fn("NOW")
      },
      { where: { id: deliverId } }
    )
      .then(updateDeliver => {
        // order status update
        db.Order.update(
          { status: "D", updatedAt: db.sequelize.fn("NOW") },
          { where: { id: orderId } }
        )
          .then(updateOrder => {
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
                res.json({
                  code: -1,
                  err
                });
              } else {
                console.log("Successfully sent with response : ", response);
                res.json({
                  code: 200,
                  imageUrl
                });
              }
            });
          })
          .catch(err => {
            res.json({
              code: -1,
              err
            });
          });
      })
      .catch(err => {
        res.json({
          code: -1,
          err
        });
      });
  } // end 배송완료 사진
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // kind = finish => 운송 완료 => 종료
  else if (kind == "finish") {
    let delivererId = req.body.delivererId; // 운송원 id
    let orderPrice = req.body.orderPrice; // 운송 물품 가격
    console.log("delivers finish");
    db.Deliver.findOne({
      include: [
        { model: db.Order },
        { model: db.User, as: "requestUser" },
        { model: db.User, as: "deliverUser" }
      ],
      where: { id: deliverId }
    }).then(result => {
      console.log(result);
      // deliver status 값 => D
      db.Deliver.update({ status: "D" }, { where: { id: deliverId } })
        .then(deliverResult => {
          // order status 값 => E
          db.Order.update({ status: "E" }, { where: { id: orderId } })
            .then(orderResult => {
              // 딜리버러 수익금 올려주기
              db.User.update(
                {
                  price: db.sequelize.literal(`price + ${orderPrice}`)
                },
                { where: { id: delivererId } }
              )
                .then(userResult => {
                  // push 알림
                  // console.log(requestUser_fcmToken);
                  let message = {
                    to: requestUser_fcmToken,
                    notification: {
                      title: "운송 종료!",
                      body:
                        "운송을 종료합니다.\n딜리버러가 마음에 드셨나요? 리뷰를 남겨주세요"
                    },
                    data: {
                      title: "finish",
                      body: result,
                      click_action: "FLUTTER_NOTIFICATION_CLICK"
                    }
                  };
                  fcm.send(message, (err, response) => {
                    if (err) {
                      console.log("Something has gone wrong!");
                      console.log(err);
                      res.json({
                        code: -1,
                        err
                      });
                    } else {
                      console.log("발송 성공");
                    }
                  });
                  res.json({
                    code: 200,
                    result: true
                  });
                })
                .catch(err => {
                  res.json({
                    code: -1,
                    err: "user update err"
                  });
                });
            })
            .catch(err => {
              res.json({
                code: -1,
                err: "order update err"
              });
            });
        })
        .catch(err => {
          res.json({
            code: -1,
            err: "deliver update err"
          });
        });
    });
  }
});

// 운송 내역 디테일
router.get("/:id", (req, res) => {
  console.log("/delivers/:id : get");
  let deliverId = req.params.id;
  db.Deliver.findOne({
    include: [
      { model: db.User, as: "requestUser" },
      { model: db.User, as: "deliverUser" },
      { model: db.Order }
    ],
    where: { id: deliverId }
  })
    .then(result => {
      // console.log(result);
      res.json({
        code: 200,
        result
      });
    })
    .catch(err => {
      res.json({
        code: 999,
        err
      });
    });
});

// 운송 내역 리스트
router.get("/history/:id", check.loginCheck, function(req, res) {
  console.log("/delivers : get");
  let delivererId = req.params.id;
  db.Deliver.findAll({
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
  }).then(data => {
    // console.log(data);
    res.json({
      code: 200,
      result: true,
      data
    });
  });
});

// 운송 완료 내역 리스트
router.get("/history/finish/:id", (req, res) => {
  db.Deliver.findAll({
    where: { delivererId: req.params.id, status: "D" },
    include: [
      { model: db.User, as: "requestUser" },
      { model: db.User, as: "deliverUser" },
      { model: db.Order }
    ]
  }).then(result => {
    // console.log(result);
    res.json({
      code: 200,
      result
    });
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 매칭하기
router.post("/", check.loginCheck, (req, res) => {
  let orderId = parseInt(req.body.orderId);
  let delivererId = parseInt(req.body.delivererId);
  let requestId = parseInt(req.body.requestId);

  // console.log(typeof parseInt(orderId));
  // console.log(typeof(int(delivererId)));

  db.Order.findOne({
    where: { id: orderId }
  })
    .then(async order_result => {

      if(order_result.status != 'A') {
        // 이미 매칭된 건수입니다
      }

      const merchant_uid = `deliverer_${moment(new Date()).format(
        "YYYYMMDDHHmmss"
      )}_${orderId}`;
      // console.log(order_result);
      const bill_result = await iamporter
        .paySubscription({
          customer_uid: order_result.cardName,
          merchant_uid: merchant_uid,
          amount: order_result.price
        })
        .catch(err => {
          if (err instanceof IamporterError) console.log(err);
          // 에러 났을 경우
          res.json({
            code: -1,
            err
          });
        });
      // console.log(bill_result.raw.response.merchant_uid);
      // return;
      if (
        bill_result.raw.code == 0 &&
        bill_result.status == 200 &&
        bill_result.raw.response.status == "paid"
      ) {
        db.CustomerPayment.create({
          user_id: req.user.id,
          order_id: orderId,
          merchant_id: bill_result.raw.response.merchant_uid,
          amount: bill_result.raw.response.amount
        }).then(customer_payment => {
          if (customer_payment) {
            // console.log(customer_payment);
            // return;
            db.Deliver.create({
              delivererId: delivererId,
              requestId: requestId,
              orderId: orderId,
              status: "A"
            }).then(deliver => {
              // console.log(deliver);
              db.Order.update(
                { status: "B", merchant_uid: merchant_uid },
                { where: { id: orderId } }
              )
                .then(data => {
                  // console.log(data);
                  db.User.findOne({ where: { id: requestId } }).then(
                    requestUserResult => {
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
                        if (err) console.log("Something has gone wrong!");
                        else
                          console.log(
                            "Successfully sent with response : ",
                            response
                          );
                      });
                      ////////////////////////////////
                      res.json({
                        code: 200,
                        result: true,
                        data
                      });
                    }
                  );
                })
                .catch(err => {
                  res.json({
                    code: -1,
                    err
                  });
                });
            });
          } else {
            res.json({
              code: -1,
              err: "구매 정보 저장 실패"
            });
          }
        });
      } else {
        res.json({
          code: 999,
          err: bill_result.raw.response.fail_reason
        });
      }
    })
    .catch(err => {
      // 오류시 승인 취소 해줘야한다

      res.json({
        code: -1,
        err
      });
    });

  // res.json({result : true});
});

// 매칭 취소
router.delete("/:id", check.loginCheck, (req, res) => {
  db.Deliver.findOne({
    where: { id: req.params.id },
    include: [{ model: db.Order, include: [{ model: db.User }] }]
  }).then(async deliver_result => {
    console.log(deliver_result.order);
    const cancel_result = await iamporter
      .cancelByMerchantUid(deliver_result.order.merchant_uid)
      .catch(err => {
        res.json({
          code: 600,
          err
        });
      });
    if (
      cancel_result.status == 200 &&
      cancel_result.raw.code == 0 &&
      cancel_result.raw.response.status == "cancelled"
    ) {
      db.CustomerPayment.update(
        {
          is_canceled: true,
          cancel_amount: deliver_result.order.price,
          updatedAt: db.sequelize.literal("CURRENT_TIMESTAMP")
        },
        { where: { merchant_id: deliver_result.order.merchant_uid } }
      ).then(customer_payment_result => {
        db.Order.update(
          {
            status: "A",
            updatedAt: db.sequelize.literal("CURRENT_TIMESTAMP")
          },
          { where: { id: deliver_result.order.id } }
        ).then(order_result => {
          db.Deliver.update(
            { status: "F" },
            { where: { id: req.params.id } }
          ).then(async deliver_update_result => {
            if (deliver_update_result) {
              let message = {
                to: deliver_result.order.user.fcm_token,
                notification: {
                  title: "운송 취소!",
                  body: "운송자가 운송을 취소하였습니다."
                },
                data: {
                  title: "cancel_deliver_user",
                  body: '999',
                  click_action: "FLUTTER_NOTIFICATION_CLICK"
                }
              };

              fcm.send(message, (err, response) => {
                if (err) {
                  if (err) console.log(err);
                  res.json({
                    code: -1,
                    err
                  });
                } else
                  console.log("Successfully sent with response : ", response);
              });

              res.json({
                code: 200,
                msg: "윤송자 요청 취소 성공"
              });
            }
          });
        });
      });
    } else {
      res.json({
        code: 999,
        msg: "승인 취소중 오류가 발생하였습니다. 다시 시도해주세요"
      });
    }
  });
});

module.exports = router;
