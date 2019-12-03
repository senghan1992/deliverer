var express = require("express");
var router = express.Router();

//db models
const db = require("../models");

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

/* GET home page. */

// 운송 detail put
router.put("/:id", (req, res) => {
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
            let message = {
              to: requestUser_fcmToken,
              collapse_key: "green",
              notification: {
                title: "픽업 완료!",
                body: "딜리버러가 픽업을 완료하었습니다."
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
              collapse_key: "green",
              notification: {
                title: "배송 완료!",
                body: "딜리버러가 배송을 완료하었습니다."
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
  }
});

// 운송 내역 리스트
router.get("/:id", function(req, res) {
  console.log("/delivers : get");
  let delivererId = req.params.id;
  db.Deliver.findAll({
    include: [
      { model: db.User, as: "requestUser" },
      { model: db.User, as: "deliverUser" },
      { model: db.Order }
    ],
    where: {
      delivererId: delivererId
    }
  }).then(data => {
    // console.log(data);
    res.json({
      code: 200,
      result: true,
      data
    });
  });
});

// 매칭하기
router.post("/", (req, res) => {
  let orderId = parseInt(req.body.orderId);
  let delivererId = parseInt(req.body.delivererId);
  let requestId = parseInt(req.body.requestId);

  // console.log(typeof parseInt(orderId));
  // console.log(typeof(int(delivererId)));

  // db.Order.findOne({where:{id:params_id}})
  // Order update
  // Deliver create
  db.Deliver.create({
    delivererId: delivererId,
    requestId: requestId,
    orderId: orderId,
    status: "A"
  })
    .then(deliver => {
      // console.log(deliver);
      db.Order.update(
        {
          status: "B"
        },
        {
          where: {
            id: orderId
          }
        }
      )
        .then(data => {
          // console.log(data);
          db.User.findOne({ where: { id: requestId } }).then(
            requestUserResult => {
              // console.log(requestUserResult.fcm_token);
              // 요청자에게 매칭 성사되었다는 알림
              let message = {
                to: requestUserResult.fcm_token,
                collapse_key: "green",

                notification: {
                  title: "매칭 성공!",
                  body: "매칭이 완료되었습니다. 배송을 시작합니다"
                }
              };
              fcm.send(message, (err, response) => {
                if (err) console.log("Something has gone wrong!");
                else
                  console.log("Successfully sent with response : ", response);
              });

              // 요청자 카드로 결제
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
            result: false,
            data: err
          });
        });
    })
    .catch(err => {
      res.json({
        code: -1,
        result: false,
        data: err
      });
    });

  // res.json({result : true});
});

module.exports = router;
