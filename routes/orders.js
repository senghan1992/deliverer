const express = require("express");
const router = express.Router();

// db
const { Order, Deliver } = require("../models");
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

// 발송내역 detail
router.get("/:id", (req, res) => {
  console.log("/orders/:id : get");
  let orderId = req.params.id;
  db.Order.findOne({
    include: [
      { model: db.Deliver, include: [{ model: db.User, as: "deliverUser" }] }
    ],
    where: { id: orderId }
  }).then(result => {
    res.json({
      code: 200,
      result
    });
  });
});

// 발송 내역 리스트
router.get("/history/:id", (req, res) => {
  console.log("/orders : get");
  // 로그인 되어있는 유저의 아이디 값을 받아오면 바로 적용 가능하다
  let requestId = req.params.id;
  Order.findAll({
    include: [
      {
        model: db.Deliver,
        include: [
          { model: db.User, as: "deliverUser" }
          // { model: db.User, as: "requestUser" }
        ]
      }
    ],
    where: {
      requestId: requestId,
      status: {
        [Op.notIn]: ["E", "F"]
      }
    },
    order: [["createdAt", "desc"]]
  })
    .then(data => {
      // console.log(result.dataValues);
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
      }
    ]
  }).then(result => {
    res.json({
      code: 200,
      result
    });
  });
});

// 요청 불러오기
router.get("/", (req, res) => {
  console.log("일단 여기는 들어온다");
  // console.log(req.params.id);
  // return;
  let requestId = req.query.requestId;

  let deliverPickLatitude = req.query.deliverPickLatitude; //req.body.deliverPickLatitude;
  let deliverPickLongitude = req.query.deliverPickLongitude; //req.body.deliverPickLongitude;

  let deliverDestLatitude = req.query.deliverDestLatitude; //req.body.deliverPickLatitude;
  let deliverDestLongitude = req.query.deliverDestLongitude; //req.body.deliverPickLongitude;

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
      "SELECT *, (6371*acos(cos(radians(" +
        deliverPickLatitude +
        "))*cos(radians(pickLatitude))*cos(radians(pickLongitude)-radians(" +
        deliverPickLongitude +
        "))+sin(radians(" +
        deliverPickLatitude +
        "))*sin(radians(pickLatitude)))) AS pickdistance, (6371*acos(cos(radians(" +
        deliverDestLatitude +
        "))*cos(radians(destLatitude))*cos(radians(destLongitude)-radians(" +
        deliverDestLongitude +
        "))+sin(radians(" +
        deliverDestLatitude +
        "))*sin(radians(destLatitude)))) AS destdistance, (6371*acos(cos(radians(pickLatitude))*cos(radians(destLatitude))*cos(radians(destLongitude)-radians(pickLongitude))+sin(radians(pickLatitude))*sin(radians(destLatitude)))) AS distance FROM orders WHERE status = 'A' AND requestId != " +
        requestId +
        " HAVING pickdistance <= " +
        distanceLimit +
        " and destdistance <=" +
        distanceLimit +
        " ORDER BY " +
        filtering,
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
  let cardName = req.body.cardname;
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
  // console.log(pickUpperAddrName);
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
    cardName: cardName,
    coupon: coupon
  }).then(data => {
    // console.log(data);
    res.json({
      code: 200,
      result: true,
      data
    });
  });
});

// 요청 취소
router.delete("/:id", (req, res) => {
  let params_id = req.params.id;
  let kind = req.query.kind;
  // status 가 A 인지 확인
  if (kind == "A") {
    Order.update(
      {
        status: "F"
      },
      {
        where: {
          id: params_id
        }
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
      .catch(err => {
        console.log(err);
        res.json({
          code: -1,
          result: false
        });
      });
  } else {
    // 매칭 된 후 10분 이하일 때 취소가 가능하다
    Order.findOne(
      {
        include: [
          {
            model: db.Deliver,
            include: [
              { model: db.User, as: "deliverUser" }
              // { model: db.User, as: "requestUser" }
            ]
          }
        ]
      },
      { where: { id: params_id } }
    ).then(result => {
      Order.update({ status: "F" }, { where: { id: params_id } }).then(
        order_result => {
          if (order_result) {
            // deliver update
            Deliver.update(
              { status: "F" },
              { where: { id: result.deliver.id } }
            ).then(deliver_result => {
              console.log(deliver_result);
              console.log(result.deliver);
              if (deliver_result) {
                console.log(result.deliver.deliverUser.fcm_token);
                let message = {
                  to: result.deliver.deliverUser.fcm_token,
                  notification: {
                    title: "운송 취소!",
                    body: "발송자가 운송을 취소하였습니다."
                  },
                  data: {
                    title: "cancel_request_user",
                    body: "",
                    click_action: "FLUTTER_NOTIFICATION_CLICK"
                  }
                };
                fcm.send(message, (err, response) => {
                  if (err) {
                    console.log(err);
                    res.json({
                      code: -1,
                      err
                    });
                  } else {
                    console.log("Successfully sent with response : ", response);
                    res.json({
                      code: 200
                    });
                  }
                });
              } else {
                res.json({
                  code: -1,
                  result: false
                });
              }
            });
          } else {
            // update 실패
            res.json({
              code: -1,
              result: false
            });
          }
        }
      );
    });
  }
});

module.exports = router;
